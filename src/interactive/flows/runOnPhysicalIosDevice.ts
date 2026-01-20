/**
 * Guided flow: run an Obsydian project on a connected physical iPhone/iPad.
 *
 * This mirrors Expo/EAS style: prompt for required inputs, validate, then run the real command.
 * The flow returns argv for the underlying command, or null if the user backs out.
 */

import path from 'path';
import prompts from 'prompts';
import chalk from 'chalk';

import Log from '../../utils/log.js';
import { findProjectRoot, readConfig } from '../../project/config.js';
import { listSchemesAsync, type XcodeContainer } from '../../apple/xcodebuild.js';
import { listPhysicalIosDevicesAsync, type ApplePhysicalDevice } from '../../ios/xcdevice.js';

type SelectChoice<T> = {
  title: string;
  value: T;
  description?: string;
  disabled?: boolean;
};

function exitWithSigint(): never {
  process.exit(130);
}

let sigintHandlerInstalled = false;
function installSigintExitHandlerOnce(): void {
  if (sigintHandlerInstalled) return;
  sigintHandlerInstalled = true;
  process.on('SIGINT', () => exitWithSigint());
  if (process.stdin.isTTY) {
    process.stdin.on('data', (chunk: Buffer | string) => {
      const s = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (s.includes('\u0003')) exitWithSigint();
    });
  }
}

async function selectAsync<T>(
  message: string,
  choices: Array<SelectChoice<T>>,
  initial = 0
): Promise<T | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive flow requires a TTY.');
  }

  installSigintExitHandlerOnce();

  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices,
    initial,
  });

  if (response.value === undefined) return null;
  return response.value as T;
}

async function confirmAsync(message: string, initial = true): Promise<boolean | null> {
  installSigintExitHandlerOnce();
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial,
  });
  if (response.value === undefined) return null;
  return !!response.value;
}

export async function runRunOnPhysicalIosDeviceFlowAsync(): Promise<string[] | null> {
  const projectDir = await findProjectRoot();
  if (!projectDir) {
    Log.error('Not in an Obsydian project (no obsydian.json found).');
    Log.dim('Run this from your app directory, or use `obsydian init` to create one.');
    return null;
  }

  const config = await readConfig(projectDir);
  const xcodeprojPath = path.join(projectDir, `${config.name}.xcodeproj`);

  // Scheme selection (prefer project name).
  let scheme = config.name;
  try {
    const container: XcodeContainer = { kind: 'project', path: xcodeprojPath };
    const schemes = await listSchemesAsync(container, { cwd: projectDir });
    if (schemes.length === 0) {
      // Fall back to the default.
    } else if (schemes.length === 1) {
      scheme = schemes[0];
    } else if (schemes.includes(config.name)) {
      scheme = config.name;
    } else {
      const picked = await selectAsync<string>(
        'Select scheme:',
        schemes.map((s) => ({ title: s, value: s }))
      );
      if (!picked) return null;
      scheme = picked;
    }
  } catch {
    // If xcodebuild -list fails, keep default scheme and let the underlying command handle it.
  }

  const devices = await listPhysicalIosDevicesAsync();
  if (!devices.length) {
    Log.error('No physical iOS devices detected.');
    Log.dim('Plug in an iPhone/iPad and trust this Mac (or enable wireless debugging).');
    return null;
  }

  const device = await selectAsync<ApplePhysicalDevice>(
    'Select a physical iOS device:',
    devices.map((d) => ({
      title: `${d.name}${d.osVersion ? ` (${d.osVersion})` : ''}`,
      value: d,
      description: d.udid,
    }))
  );
  if (!device) return null;

  const configuration = await selectAsync<'Debug' | 'Release'>('Build configuration:', [
    { title: 'Debug', value: 'Debug', description: 'Faster builds, debuggable' },
    { title: 'Release', value: 'Release', description: 'Optimized build' },
  ]);
  if (!configuration) return null;

  const allowProvisioningUpdates = await confirmAsync(
    'Allow Xcode to update provisioning profiles automatically?',
    false
  );
  if (allowProvisioningUpdates === null) return null;

  const allowProvisioningDeviceRegistration = allowProvisioningUpdates
    ? await confirmAsync('Allow Xcode to register this device for provisioning?', false)
    : false;
  if (allowProvisioningDeviceRegistration === null) return null;

  Log.newLine();
  Log.info(`Project: ${chalk.cyan(config.name)}`);
  Log.info(`Scheme: ${chalk.cyan(scheme)}`);
  Log.info(`Device: ${chalk.cyan(device.name)} ${chalk.dim(device.udid)}`);
  Log.newLine();

  const argv: string[] = [
    'xcode',
    'run',
    '--platform',
    'ios',
    '--project',
    xcodeprojPath,
    '--scheme',
    scheme,
    '--configuration',
    configuration,
    '--device',
    device.udid,
  ];

  if (allowProvisioningUpdates) {
    argv.push('--allow-provisioning-updates');
  }
  if (allowProvisioningDeviceRegistration) {
    argv.push('--allow-provisioning-device-registration');
  }

  return argv;
}

