import os from 'os';
import path from 'path';

import { exec, type ExecOptions, type ExecResult } from '../utils/exec.js';
import Log from '../utils/log.js';
import { xcrunAsync } from './xcrun.js';

type DeviceState = 'Shutdown' | 'Booted' | string;

export type OSType = 'iOS' | 'tvOS' | 'watchOS' | 'macOS' | 'xrOS' | string;

export type Device = {
  udid: string;
  name: string;
  state: DeviceState;
  isAvailable: boolean;
  runtime: string;
  osType: OSType;
  osVersion: string;
  windowName: string;
};

type SimulatorDeviceList = {
  devices: Record<string, any[]>;
};

function extractJsonObject(input: string): string {
  const start = input.indexOf('{');
  const end = input.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return input;
  return input.slice(start, end + 1);
}

function parseRuntime(runtime: string): { osType: OSType; osVersion: string } {
  // Example: com.apple.CoreSimulator.SimRuntime.iOS-17-2
  const marker = 'SimRuntime.';
  const idx = runtime.indexOf(marker);
  const tail = idx >= 0 ? runtime.slice(idx + marker.length) : runtime;
  const parts = tail.split('-');
  const osType = parts[0] || 'iOS';
  const version = parts.length > 1 ? parts.slice(1).join('.') : '';
  return { osType, osVersion: version };
}

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number(n));
  const pb = b.split('.').map((n) => Number(n));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return db - da;
  }
  return 0;
}

export async function simctlAsync(
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  return await xcrunAsync(['simctl', ...args], options);
}

export async function listDevicesAsync(options?: {
  osType?: OSType;
  includeUnavailable?: boolean;
}): Promise<Device[]> {
  const { osType = 'iOS', includeUnavailable = false } = options ?? {};
  const result = await simctlAsync(['list', 'devices', '-j'], { silent: true });

  let json: SimulatorDeviceList;
  try {
    json = JSON.parse(result.stdout) as SimulatorDeviceList;
  } catch {
    const extracted = extractJsonObject(result.stdout);
    try {
      json = JSON.parse(extracted) as SimulatorDeviceList;
    } catch {
      Log.error(`Apple's simctl returned malformed JSON:\n${result.stdout}`);
      throw new Error('Could not parse `xcrun simctl list devices -j` output.');
    }
  }

  const out: Device[] = [];

  for (const [runtime, devices] of Object.entries(json.devices ?? {})) {
    const parsed = parseRuntime(runtime);
    if (parsed.osType !== osType) continue;

    for (const d of devices ?? []) {
      const isAvailable: boolean =
        typeof d.isAvailable === 'boolean'
          ? d.isAvailable
          : typeof d.availability === 'string'
            ? !d.availability.includes('unavailable')
            : true;
      if (!includeUnavailable && !isAvailable) continue;

      const udid = String(d.udid);
      const name = String(d.name);
      const state = String(d.state) as DeviceState;
      const osVersion = parsed.osVersion;
      out.push({
        udid,
        name,
        state,
        isAvailable,
        runtime,
        osType: parsed.osType,
        osVersion,
        windowName: `${name}${osVersion ? ` (${osVersion})` : ''}`,
      });
    }
  }

  out.sort((a, b) => {
    const v = compareVersionsDesc(a.osVersion, b.osVersion);
    if (v !== 0) return v;
    if (a.state !== b.state) return a.state === 'Booted' ? -1 : 1;
    return a.windowName.localeCompare(b.windowName);
  });

  return out;
}

export function isUdid(value: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export function findMatchingDevices(devices: Device[], selector: string, osType: OSType = 'iOS'): Device[] {
  const s = selector.trim();
  const scoped = devices.filter((d) => d.osType === osType);

  if (!s) return scoped;

  if (isUdid(s)) {
    const hit = scoped.find((d) => d.udid.toLowerCase() === s.toLowerCase());
    return hit ? [hit] : [];
  }

  const lower = s.toLowerCase();
  const exact = scoped.filter((d) => d.name.toLowerCase() === lower || d.windowName.toLowerCase() === lower);
  if (exact.length) return exact;

  return scoped.filter((d) => d.windowName.toLowerCase().includes(lower) || d.name.toLowerCase().includes(lower));
}

export function pickDefaultDevice(devices: Device[]): Device | null {
  const booted = devices.find((d) => d.state === 'Booted' && d.isAvailable);
  if (booted) return booted;
  const iphone = devices.find((d) => d.isAvailable && d.name.includes('iPhone'));
  if (iphone) return iphone;
  const any = devices.find((d) => d.isAvailable);
  return any ?? null;
}

export async function bootDeviceAsync(udid: string): Promise<void> {
  // Booting an already-booted device is fine; simctl may still return non-zero in edge cases.
  await simctlAsync(['boot', udid], { silent: true });
}

export async function bootStatusAsync(udid: string): Promise<void> {
  // Preferred: blocks until the device is booted (Xcode 11+), but can fail on older setups.
  try {
    await simctlAsync(['bootstatus', udid, '-b'], { silent: true });
    return;
  } catch {
    // Fallback: poll state via `list devices`.
  }

  const start = Date.now();
  const timeoutMs = 30_000;
  const intervalMs = 500;

  while (Date.now() - start < timeoutMs) {
    const devices = await listDevicesAsync({ osType: 'iOS', includeUnavailable: true });
    const match = devices.find((d) => d.udid.toLowerCase() === udid.toLowerCase());
    if (match?.state === 'Booted') return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Simulator did not reach Booted state within ${timeoutMs / 1000}s: ${udid}`);
}

export async function openSimulatorAppAsync(udid?: string): Promise<void> {
  if (udid) {
    await exec('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid], { silent: true });
  } else {
    await exec('open', ['-a', 'Simulator'], { silent: true });
  }
}

export async function installAppAsync(udid: string, appPath: string, options: ExecOptions = {}): Promise<void> {
  await simctlAsync(['install', udid, appPath], options);
}

export async function terminateAppAsync(udid: string, bundleId: string): Promise<void> {
  try {
    await simctlAsync(['terminate', udid, bundleId], { silent: true });
  } catch {
    // ignore
  }
}

export async function uninstallAppAsync(udid: string, bundleId: string): Promise<void> {
  try {
    await simctlAsync(['uninstall', udid, bundleId], { silent: true });
  } catch {
    // ignore (app may not be installed)
  }
}

export async function launchAppAsync(udid: string, bundleId: string, options: ExecOptions = {}): Promise<void> {
  await simctlAsync(['launch', udid, bundleId], options);
}

export async function shutdownAsync(udid: string): Promise<void> {
  await simctlAsync(['shutdown', udid], { silent: true });
}

export async function shutdownAllAsync(): Promise<void> {
  await simctlAsync(['shutdown', 'all'], { silent: true });
}

export async function eraseAsync(udid: string): Promise<void> {
  await simctlAsync(['erase', udid], { silent: true });
}

export async function eraseAllAsync(): Promise<void> {
  await simctlAsync(['erase', 'all'], { silent: true });
}

export function getSimulatorLogsDirectory(udid: string): string {
  return path.join(os.homedir(), 'Library', 'Logs', 'CoreSimulator', udid);
}

