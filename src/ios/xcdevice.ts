import { exec } from '../utils/exec.js';

export type XcdeviceRecord = {
  name: string;
  identifier: string;
  platform: string;
  operatingSystemVersion?: string;
  simulator?: boolean;
  available?: boolean;
  ignored?: boolean;
};

export type ApplePhysicalDevice = {
  name: string;
  udid: string;
  platform: string;
  osVersion: string;
};

export async function listPhysicalIosDevicesAsync(): Promise<ApplePhysicalDevice[]> {
  // xcdevice can be slow when scanning network devices; keep it snappy by default.
  const result = await exec('xcrun', ['xcdevice', 'list', '--timeout=2'], { silent: true });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || 'Failed to list devices (xcrun xcdevice list).');
  }

  const records = JSON.parse(result.stdout) as XcdeviceRecord[];
  const devices = records
    .filter((r) => !r.simulator)
    .filter((r) => r.available !== false)
    .filter((r) => r.ignored !== true)
    .filter((r) => r.platform === 'com.apple.platform.iphoneos')
    .map((r) => ({
      name: r.name,
      udid: r.identifier,
      platform: r.platform,
      osVersion: (r.operatingSystemVersion ?? '').split(' ')[0] ?? '',
    }));

  devices.sort((a, b) => a.name.localeCompare(b.name));
  return devices;
}

