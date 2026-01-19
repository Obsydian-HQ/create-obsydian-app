/**
 * iOS utilities
 * Similar to Expo CLI's internal simulator tooling.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import Log from '../utils/log.js';
import { promptConfirm } from '../utils/prompts.js';
import type { Device } from '../ios/simctl.js';
import {
  bootDeviceAsync,
  bootStatusAsync,
  eraseAllAsync,
  eraseAsync,
  listDevicesAsync,
  openSimulatorAppAsync,
  shutdownAllAsync,
  shutdownAsync,
} from '../ios/simctl.js';
import { resolveIosSimulatorAsync } from '../run/ios/options/promptDevice.js';

function formatDeviceLine(d: Device): string {
  const state =
    d.state === 'Booted' ? chalk.green('Booted') : d.state === 'Shutdown' ? chalk.dim('Shutdown') : d.state;
  const availability = d.isAvailable ? '' : chalk.yellow(' (Unavailable)');
  return `${state.padEnd(10)} ${chalk.cyan(d.windowName)}${availability} ${chalk.dim(d.udid)}`;
}

export const iosCommand = new Command('ios').description('iOS simulator utilities');

iosCommand
  .command('simulators')
  .description('List iOS Simulators')
  .option('--json', 'Output JSON')
  .option('--all', 'Include unavailable devices')
  .action(async (options) => {
    const devices = await listDevicesAsync({ osType: 'iOS', includeUnavailable: !!options.all });

    if (options.json) {
      Log.log(JSON.stringify(devices, null, 2));
      return;
    }

    if (!devices.length) {
      Log.warn('No iOS Simulators found.');
      return;
    }

    Log.newLine();
    Log.bold('iOS Simulators');
    Log.newLine();
    for (const d of devices) {
      Log.log(formatDeviceLine(d));
    }
    Log.newLine();
    Log.dim('Tip: obsydian run --platform ios --device "<name|udid>"');
  });

iosCommand
  .command('open')
  .description('Boot and open an iOS Simulator')
  .option('--device <device>', 'Device name or UDID')
  .action(async (options) => {
    const device = await resolveIosSimulatorAsync({ device: options.device, shouldPrompt: true });

    await bootDeviceAsync(device.udid);
    await bootStatusAsync(device.udid);
    await openSimulatorAppAsync(device.udid);

    Log.success(`Opened ${chalk.cyan(device.windowName)}`);
  });

iosCommand
  .command('shutdown')
  .description('Shutdown iOS Simulator(s)')
  .option('--device <device>', 'Device name or UDID')
  .option('--all', 'Shutdown all simulators')
  .action(async (options) => {
    if (options.all) {
      await shutdownAllAsync();
      Log.success('Shutdown all simulators');
      return;
    }

    if (!options.device) {
      Log.error('Provide --device <name|udid> or --all');
      process.exit(1);
    }

    const device = await resolveIosSimulatorAsync({ device: options.device, shouldPrompt: true });
    await shutdownAsync(device.udid);
    Log.success(`Shutdown ${chalk.cyan(device.windowName)}`);
  });

iosCommand
  .command('erase')
  .description('Erase iOS Simulator(s) (factory reset)')
  .option('--device <device>', 'Device name or UDID')
  .option('--all', 'Erase all simulators')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    if (!options.yes) {
      const ok = await promptConfirm(
        options.all
          ? 'Erase ALL simulators? This cannot be undone.'
          : 'Erase the selected simulator? This cannot be undone.',
        false
      );
      if (!ok) {
        Log.warn('Cancelled');
        process.exit(1);
      }
    }

    if (options.all) {
      await eraseAllAsync();
      Log.success('Erased all simulators');
      return;
    }

    if (!options.device) {
      Log.error('Provide --device <name|udid> or --all');
      process.exit(1);
    }

    const device = await resolveIosSimulatorAsync({ device: options.device, shouldPrompt: true });
    await eraseAsync(device.udid);
    Log.success(`Erased ${chalk.cyan(device.windowName)}`);
  });

