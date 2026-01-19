import ora from 'ora';
import path from 'path';

import Log from '../../utils/log.js';
import type { Device } from '../../ios/simctl.js';
import {
  bootDeviceAsync,
  bootStatusAsync,
  installAppAsync,
  launchAppAsync,
  openSimulatorAppAsync,
  terminateAppAsync,
} from '../../ios/simctl.js';
import { buildAsync, getBuiltAppPathFromBuildSettings, showBuildSettingsAsync } from '../../apple/xcodebuild.js';
import { resolveIosSimulatorAsync } from './options/promptDevice.js';

export type RunIosOptions = {
  projectName: string;
  bundleId: string;
  configuration: 'Debug' | 'Release';
  buildDir: string;
  device?: string;
  shouldOpenSimulator: boolean;
  verbose: boolean;
};

export async function runIosAsync(projectDir: string, options: RunIosOptions): Promise<void> {
  const { projectName, bundleId, configuration, buildDir, verbose } = options;

  const scheme = projectName;

  const device: Device = await resolveIosSimulatorAsync({
    device: options.device,
    shouldPrompt: !options.device,
  });

  Log.info(`Using iOS Simulator: ${device.windowName} (${device.udid})`);

  const buildSpinner = ora('Building for iOS Simulator...').start();
  try {
    await buildAsync(
      { projectDir, projectName },
      {
        scheme,
        configuration,
        derivedDataPath: buildDir,
        destination: `id=${device.udid}`,
        verbose,
      }
    );
    buildSpinner.succeed('Build succeeded!');
  } catch (error: any) {
    buildSpinner.fail('Build failed');
    if (!verbose) {
      Log.error(error?.message ?? String(error));
    }
    process.exit(1);
  }

  // Resolve the built .app path robustly via build settings.
  const settings = await showBuildSettingsAsync(
    { projectDir, projectName },
    {
      scheme,
      configuration,
      derivedDataPath: buildDir,
      destination: `id=${device.udid}`,
    }
  );

  const appPath = getBuiltAppPathFromBuildSettings(settings);
  if (!appPath) {
    Log.error('Could not determine built app path from Xcode build settings.');
    process.exit(1);
  }

  // Boot + wait for simulator.
  try {
    await bootDeviceAsync(device.udid);
    await bootStatusAsync(device.udid);
  } catch (e: any) {
    Log.warn(`Failed to boot simulator cleanly: ${e?.message ?? String(e)}`);
  }

  if (options.shouldOpenSimulator) {
    await openSimulatorAppAsync(device.udid);
  }

  // Install + launch.
  const installSpinner = ora('Installing and launching on iOS Simulator...').start();
  try {
    // Avoid stale resources by terminating before installing/launching.
    await terminateAppAsync(device.udid, bundleId);

    // Xcodebuild outputs to CONFIGURATION_BUILD_DIR, which is often under build/Build/Products.
    // Ensure the path exists before installing.
    const expectedAppPath = appPath.endsWith('.app') ? appPath : path.join(appPath);
    await installAppAsync(device.udid, expectedAppPath, { verbose });
    await launchAppAsync(device.udid, bundleId, { verbose });

    installSpinner.succeed('App running in iOS Simulator!');
  } catch (error: any) {
    installSpinner.fail('Failed to install/launch');
    Log.error(error?.message ?? String(error));
    process.exit(1);
  }
}

