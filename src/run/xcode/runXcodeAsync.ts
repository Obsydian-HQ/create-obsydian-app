import ora from 'ora';
import fs from 'fs-extra';

import Log from '../../utils/log.js';
import { exec } from '../../utils/exec.js';
import { getBundleIdFromBuiltAppAsync } from '../../apple/inspectApp.js';
import {
  buildContainerAsync,
  getBuiltAppPathFromBuildSettings,
  listSchemesAsync,
  showBuildSettingsContainerAsync,
  type XcodeContainer,
} from '../../apple/xcodebuild.js';
import { resolveXcodeContainerAsync } from '../../apple/resolveContainer.js';
import { resolveIosSimulatorAsync } from '../ios/options/promptDevice.js';
import {
  bootDeviceAsync,
  bootStatusAsync,
  installAppAsync,
  launchAppAsync,
  openSimulatorAppAsync,
  shutdownAsync,
  terminateAppAsync,
  uninstallAppAsync,
} from '../../ios/simctl.js';
import { promptSelect } from '../../utils/prompts.js';
import { installAppOnDeviceAsync, launchAppOnDeviceAsync } from '../../ios/devicectl.js';
import { resolvePhysicalIosDeviceAsync } from './options/resolvePhysicalDevice.js';

export type XcodePlatform = 'ios' | 'macos';

export type RunXcodeOptions = {
  platform: XcodePlatform;
  scheme?: string;
  configuration: 'Debug' | 'Release';
  derivedDataPath?: string;
  verbose: boolean;

  // Container selection
  project?: string;
  workspace?: string;

  // iOS target selection
  simulator?: string;
  device?: string; // physical device selector (name/udid/etc)
  shouldOpenSimulator: boolean;

  // Code signing convenience
  allowProvisioningUpdates?: boolean;
  allowProvisioningDeviceRegistration?: boolean;
};

export async function runXcodeAsync(cwd: string, options: RunXcodeOptions): Promise<void> {
  const container: XcodeContainer = await resolveXcodeContainerAsync({
    cwd,
    project: options.project,
    workspace: options.workspace,
  });

  const schemes = await listSchemesAsync(container, { cwd });
  if (!schemes.length) {
    throw new Error('No schemes found. Ensure the project has shared schemes or pass --scheme <name>.');
  }

  let scheme = options.scheme?.trim();
  if (!scheme) {
    scheme =
      schemes.length === 1
        ? schemes[0]
        : await promptSelect<string>(
            'Select a scheme:',
            schemes.map((s) => ({ title: s, value: s }))
          );
  } else if (!schemes.includes(scheme)) {
    // allow mismatch but warn; Xcode can still build user schemes depending on settings.
    Log.warn(`Scheme "${scheme}" not found in -list output. Attempting to build anyway...`);
  }

  const destination =
    options.platform === 'macos'
      ? 'platform=macOS,arch=arm64'
      : // iOS simulator destination will be set after we select device
        undefined;

  // NOTE: we compute these flags now so we can wire them into build calls later if needed.
  // For most projects, code signing is already configured and this isn't required.
  // We'll hook these into the xcodebuild invocation once we expand the build wrapper.
  const xcodebuildExtraArgs: string[] = [];
  if (options.allowProvisioningUpdates) xcodebuildExtraArgs.push('-allowProvisioningUpdates');
  if (options.allowProvisioningDeviceRegistration) {
    xcodebuildExtraArgs.push('-allowProvisioningDeviceRegistration');
  }

  let iosTarget:
    | { kind: 'simulator'; udid: string }
    | { kind: 'device'; udid: string; name: string }
    | undefined;

  if (options.platform === 'ios') {
    // Treat presence of --device (even without value) as "use a physical device".
    if (options.device !== undefined) {
      const selector = (options.device ?? '').trim();
      const resolved = await resolvePhysicalIosDeviceAsync({
        device: selector || undefined,
        shouldPrompt: true,
      });
      iosTarget = { kind: 'device', udid: resolved.udid, name: resolved.name };
      Log.info(`Using physical iOS device: ${resolved.name} (${resolved.udid})`);
    } else {
      const sim = await resolveIosSimulatorAsync({ device: options.simulator, shouldPrompt: true });
      iosTarget = { kind: 'simulator', udid: sim.udid };
      Log.info(`Using iOS Simulator: ${sim.windowName} (${sim.udid})`);
    }
  }

  const buildSpinner = ora('Building...').start();
  try {
    await buildContainerAsync(
      container,
      {
        scheme,
        configuration: options.configuration,
        derivedDataPath: options.derivedDataPath,
        destination:
          options.platform === 'ios'
            ? iosTarget?.kind === 'device'
              ? `platform=iOS,id=${iosTarget.udid}`
              : `platform=iOS Simulator,id=${iosTarget?.udid}`
            : destination,
        verbose: options.verbose,
      },
      { cwd, extraArgs: xcodebuildExtraArgs }
    );
    buildSpinner.succeed('Build succeeded!');
  } catch (e: any) {
    buildSpinner.fail('Build failed');
    if (!options.verbose) {
      Log.error(e?.message ?? String(e));
    }
    process.exit(1);
  }

  const settings = await showBuildSettingsContainerAsync(
    container,
    {
      scheme,
      configuration: options.configuration,
      derivedDataPath: options.derivedDataPath,
      destination:
        options.platform === 'ios'
          ? iosTarget?.kind === 'device'
            ? `platform=iOS,id=${iosTarget.udid}`
            : `platform=iOS Simulator,id=${iosTarget?.udid}`
          : destination,
    },
    { cwd, extraArgs: xcodebuildExtraArgs }
  );

  const appPath = getBuiltAppPathFromBuildSettings(settings);
  if (!appPath) {
    Log.error('Could not determine built app path from Xcode build settings.');
    process.exit(1);
  }

  if (options.platform === 'macos') {
    Log.info(`Launching ${appPath}`);
    const result = await exec('open', [appPath], { verbose: true, cwd });
    if (result.exitCode !== 0) {
      Log.error('Failed to launch app');
      process.exit(1);
    }
    return;
  }

  // Ensure the built product exists before attempting install/launch.
  if (!(await fs.pathExists(appPath))) {
    Log.error(`Built app not found at: ${appPath}`);
    Log.dim('Tip: re-run with --verbose to see xcodebuild output and ensure the scheme produces an .app product.');
    process.exit(1);
  }

  const bundleId = await getBundleIdFromBuiltAppAsync(appPath);

  if (iosTarget?.kind === 'simulator') {
    const udid = iosTarget.udid;
    try {
      await bootDeviceAsync(udid);
      await bootStatusAsync(udid);
    } catch (e: any) {
      Log.warn(`Failed to boot simulator cleanly: ${e?.message ?? String(e)}`);
    }

    if (options.shouldOpenSimulator) {
      await openSimulatorAppAsync(udid);
    }

    const installSpinner = ora('Installing and launching on iOS Simulator...').start();
    try {
      await terminateAppAsync(udid, bundleId);
      // Avoid stale CoreSimulator install state (common source of IXErrorDomain code=2).
      await uninstallAppAsync(udid, bundleId);
      await installAppAsync(udid, appPath, { verbose: options.verbose });
      await launchAppAsync(udid, bundleId, { verbose: options.verbose });
      installSpinner.succeed('App running in iOS Simulator!');
    } catch (e: any) {
      // CoreSimulator can sometimes crash mid-install (e.g. NSMachErrorDomain -308).
      // Try one clean reboot of the target simulator and retry install once.
      const message = e?.message ?? String(e);
      Log.warn(message);
      Log.dim('Retrying once after simulator restart...');
      try {
        await shutdownAsync(udid);
      } catch {
        // ignore
      }
      try {
        await bootDeviceAsync(udid);
        await bootStatusAsync(udid);
        if (options.shouldOpenSimulator) {
          await openSimulatorAppAsync(udid);
        }
        await terminateAppAsync(udid, bundleId);
        await uninstallAppAsync(udid, bundleId);
        await installAppAsync(udid, appPath, { verbose: options.verbose });
        await launchAppAsync(udid, bundleId, { verbose: options.verbose });
        installSpinner.succeed('App running in iOS Simulator!');
      } catch (retryErr: any) {
        installSpinner.fail('Failed to install/launch');
        Log.error(retryErr?.message ?? String(retryErr));
        process.exit(1);
      }
    }
    return;
  }

  // Physical device: install + launch via devicectl
  const installSpinner = ora('Installing and launching on physical iOS device...').start();
  try {
    await installAppOnDeviceAsync(iosTarget!.udid, appPath, { verbose: options.verbose });
    await launchAppOnDeviceAsync(iosTarget!.udid, bundleId, { verbose: options.verbose });
    installSpinner.succeed('App running on physical device!');
  } catch (e: any) {
    installSpinner.fail('Failed to install/launch');
    Log.error(e?.message ?? String(e));
    process.exit(1);
  }
}

