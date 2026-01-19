import { promptSelect } from '../../../utils/prompts.js';
import { listPhysicalIosDevicesAsync, type ApplePhysicalDevice } from '../../../ios/xcdevice.js';

function isUdid(value: string): boolean {
  const v = value.trim();
  // Physical iOS UDIDs commonly look like: 00008110-001461262E09A01E (8-16)
  // Simulators use UUIDs: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36)
  return (
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{16}$/.test(v) ||
    /^[0-9a-fA-F-]{36}$/.test(v) ||
    /^[0-9a-fA-F]{40}$/.test(v)
  );
}

function findMatchingPhysicalDevices(devices: ApplePhysicalDevice[], selector: string): ApplePhysicalDevice[] {
  const s = selector.trim();
  if (!s) return devices;

  if (isUdid(s)) {
    const hit = devices.find((d) => d.udid.toLowerCase() === s.toLowerCase());
    return hit ? [hit] : [];
  }

  const lower = s.toLowerCase();
  const exact = devices.filter((d) => d.name.toLowerCase() === lower);
  if (exact.length) return exact;

  return devices.filter((d) => d.name.toLowerCase().includes(lower));
}

export async function resolvePhysicalIosDeviceAsync(options?: {
  device?: string; // name or udid
  shouldPrompt?: boolean;
}): Promise<ApplePhysicalDevice> {
  const shouldPrompt = options?.shouldPrompt ?? !!process.stdout.isTTY;
  const devices = await listPhysicalIosDevicesAsync();
  if (!devices.length) {
    throw new Error('No physical iOS devices detected. Plug in an iPhone/iPad and trust this Mac.');
  }

  if (options?.device) {
    const matches = findMatchingPhysicalDevices(devices, options.device);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      const chosen = await promptSelect<ApplePhysicalDevice>(
        'Select a physical iOS device:',
        matches.map((d) => ({
          title: `${d.name}${d.osVersion ? ` (${d.osVersion})` : ''}`,
          value: d,
          description: d.udid,
        }))
      );
      return chosen;
    }
    throw new Error(`No physical iOS device matched "${options.device}".`);
  }

  if (!shouldPrompt) {
    return devices[0];
  }

  const chosen = await promptSelect<ApplePhysicalDevice>(
    'Select a physical iOS device:',
    devices.map((d) => ({
      title: `${d.name}${d.osVersion ? ` (${d.osVersion})` : ''}`,
      value: d,
      description: d.udid,
    }))
  );
  return chosen;
}

