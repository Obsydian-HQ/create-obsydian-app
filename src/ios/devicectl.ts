import os from 'os';
import path from 'path';

import fs from 'fs-extra';
import { exec, type ExecOptions } from '../utils/exec.js';

function uniqueJsonPath(prefix: string): string {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(os.tmpdir(), `${prefix}-${id}.json`);
}

export async function devicectlAsync(
  args: string[],
  options: ExecOptions & { jsonPrefix?: string } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number; json?: any }> {
  // devicectl's stable interface is JSON written to a file.
  const jsonPath = uniqueJsonPath(options.jsonPrefix ?? 'obsydian-devicectl');

  // Add a reasonable default timeout so "hung" device commands fail predictably.
  const timeoutSeconds = 120;
  const result = await exec(
    'xcrun',
    ['devicectl', '--timeout', String(timeoutSeconds), '--json-output', jsonPath, ...args],
    options
  );

  let json: any = undefined;
  try {
    if (await fs.pathExists(jsonPath)) {
      const content = await fs.readFile(jsonPath, 'utf-8');
      json = JSON.parse(content);
      await fs.remove(jsonPath);
    }
  } catch {
    // ignore JSON parse/read errors; stdout/stderr will be used for debugging
  }

  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, json };
}

export async function installAppOnDeviceAsync(device: string, appPath: string, options: ExecOptions = {}) {
  const res = await devicectlAsync(['device', 'install', 'app', '--device', device, appPath], {
    ...options,
    jsonPrefix: 'obsydian-install-app',
  });
  if (res.exitCode !== 0) {
    const out = (res.stderr || res.stdout || '').trim();
    throw new Error(out || 'Failed to install app on device.');
  }
  return res.json;
}

export async function launchAppOnDeviceAsync(device: string, bundleId: string, options: ExecOptions = {}) {
  const res = await devicectlAsync(
    ['device', 'process', 'launch', '--device', device, bundleId, '--terminate-existing', '--activate'],
    { ...options, jsonPrefix: 'obsydian-launch-app' }
  );
  if (res.exitCode !== 0) {
    const out = (res.stderr || res.stdout || '').trim();
    throw new Error(out || 'Failed to launch app on device.');
  }
  return res.json;
}

