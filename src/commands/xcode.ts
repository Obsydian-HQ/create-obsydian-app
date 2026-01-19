/**
 * Generic Xcode project tooling (non-Obsydian projects).
 *
 * Goal: let you `cd` into any Xcode project and build/run without opening Xcode.
 */

import { Command } from 'commander';
import path from 'path';

import Log from '../utils/log.js';
import { promptSelect } from '../utils/prompts.js';
import { resolveXcodeContainerAsync } from '../apple/resolveContainer.js';
import { listSchemesAsync } from '../apple/xcodebuild.js';
import { runXcodeAsync } from '../run/xcode/runXcodeAsync.js';
import { listPhysicalIosDevicesAsync } from '../ios/xcdevice.js';

export const xcodeCommand = new Command('xcode').description('Work with standard Xcode projects/workspaces');

xcodeCommand
  .command('schemes')
  .description('List schemes in the current Xcode project/workspace')
  .option('--project <path>', 'Path to .xcodeproj (defaults to auto-detect in current dir)')
  .option('--workspace <path>', 'Path to .xcworkspace (defaults to auto-detect in current dir)')
  .option('--json', 'Output JSON')
  .action(async (options) => {
    const cwd = process.cwd();
    const container = await resolveXcodeContainerAsync({ cwd, project: options.project, workspace: options.workspace });
    const schemes = await listSchemesAsync(container, { cwd });
    if (options.json) {
      Log.log(JSON.stringify(schemes, null, 2));
      return;
    }

    if (!schemes.length) {
      Log.warn('No schemes found.');
      return;
    }

    Log.newLine();
    Log.bold('Schemes');
    Log.newLine();
    for (const s of schemes) {
      Log.log(`- ${s}`);
    }
  });

xcodeCommand
  .command('devices')
  .description('List connected physical iOS devices')
  .option('--json', 'Output JSON')
  .action(async (options) => {
    const devices = await listPhysicalIosDevicesAsync();
    if (options.json) {
      Log.log(JSON.stringify(devices, null, 2));
      return;
    }
    if (!devices.length) {
      Log.warn('No physical iOS devices detected.');
      Log.dim('Tip: plug in an iPhone/iPad and trust this Mac. Wireless debugging also works if enabled.');
      return;
    }
    Log.newLine();
    Log.bold('Physical iOS devices');
    Log.newLine();
    for (const d of devices) {
      Log.log(`- ${d.name}${d.osVersion ? ` (${d.osVersion})` : ''} ${d.udid}`);
    }
  });

xcodeCommand
  .command('run')
  .description('Build and run an Xcode project (macOS or iOS Simulator)')
  .requiredOption('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('--project <path>', 'Path to .xcodeproj (defaults to auto-detect in current dir)')
  .option('--workspace <path>', 'Path to .xcworkspace (defaults to auto-detect in current dir)')
  .option('--scheme <scheme>', 'Scheme to build/run (will prompt if omitted)')
  .option('-c, --configuration <config>', 'Build configuration (Debug, Release)', 'Debug')
  .option(
    '--derived-data <path>',
    'Derived data output path (default: Xcode/Expo DerivedData in ~/Library/Developer/Xcode/DerivedData)'
  )
  .option('--simulator [simulator]', 'iOS Simulator device name or UDID')
  .option('--device [device]', 'Physical iOS device selector (name/udid). If omitted, will prompt.')
  .option('--no-open', 'Do not open the Simulator app (iOS)')
  .option('--allow-provisioning-updates', 'Allow Xcode to update provisioning profiles (physical device)')
  .option(
    '--allow-provisioning-device-registration',
    'Allow Xcode to register devices for provisioning (physical device)'
  )
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const cwd = process.cwd();
    const platform = options.platform as string;
    if (platform !== 'ios' && platform !== 'macos') {
      Log.error('Platform must be one of: ios, macos');
      process.exit(1);
    }

    // Commander sets optional-value options to `true` when passed without a value.
    // Normalize to strings/undefined so downstream code can safely call `.trim()`.
    const simulator =
      typeof options.simulator === 'string' ? (options.simulator as string) : undefined;
    const device =
      options.device === undefined ? undefined : typeof options.device === 'string' ? (options.device as string) : '';

    const derivedDataPath = options.derivedData
      ? path.isAbsolute(options.derivedData)
        ? options.derivedData
        : path.join(cwd, options.derivedData)
      : undefined;

    await runXcodeAsync(cwd, {
      platform,
      scheme: options.scheme,
      configuration: options.configuration as 'Debug' | 'Release',
      derivedDataPath,
      verbose: !!options.verbose,
      project: options.project,
      workspace: options.workspace,
      simulator,
      device,
      shouldOpenSimulator: options.open ?? true,
      allowProvisioningUpdates: !!options.allowProvisioningUpdates,
      allowProvisioningDeviceRegistration: !!options.allowProvisioningDeviceRegistration,
    });
  });

