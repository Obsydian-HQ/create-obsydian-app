import { promptSelect } from '../../../utils/prompts.js';
import type { Device } from '../../../ios/simctl.js';
import { findMatchingDevices, listDevicesAsync, pickDefaultDevice } from '../../../ios/simctl.js';

export async function resolveIosSimulatorAsync(options?: {
  device?: string;
  shouldPrompt?: boolean;
}): Promise<Device> {
  const shouldPrompt = options?.shouldPrompt ?? !!process.stdout.isTTY;
  const devices = await listDevicesAsync({ osType: 'iOS', includeUnavailable: false });

  if (!devices.length) {
    throw new Error(
      'No iOS Simulators are available. Install iOS Simulator runtimes in Xcode (Settings → Platforms), then try again.'
    );
  }

  if (options?.device) {
    const matches = findMatchingDevices(devices, options.device, 'iOS');
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const chosen = await promptSelect<Device>(
        'Select an iOS Simulator:',
        matches.map((d) => ({
          title: `${d.windowName}${d.state === 'Booted' ? ' (Booted)' : ''}`,
          value: d,
          description: d.udid,
        }))
      );
      return chosen;
    }
    throw new Error(`No iOS Simulator matched "${options.device}".`);
  }

  const defaultDevice = pickDefaultDevice(devices);
  if (!defaultDevice) {
    throw new Error(
      'No iOS Simulators are available. Install iOS Simulator runtimes in Xcode (Settings → Platforms), then try again.'
    );
  }

  // If we have a booted device already, do not prompt.
  if (defaultDevice.state === 'Booted' || !shouldPrompt) {
    return defaultDevice;
  }

  const chosen = await promptSelect<Device>(
    'Select an iOS Simulator:',
    devices.map((d) => ({
      title: `${d.windowName}${d.state === 'Booted' ? ' (Booted)' : ''}`,
      value: d,
      description: d.udid,
    }))
  );
  return chosen;
}

