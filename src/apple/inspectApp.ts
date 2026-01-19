import path from 'path';

import { exec } from '../utils/exec.js';

export async function getBundleIdFromBuiltAppAsync(appPath: string): Promise<string> {
  const infoPlistPath = path.join(appPath, 'Info.plist');
  const result = await exec('plutil', ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', infoPlistPath], {
    silent: true,
  });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || `Failed to read bundle identifier from ${infoPlistPath}`);
  }
  const bundleId = result.stdout.trim();
  if (!bundleId) {
    throw new Error(`Bundle identifier was empty in ${infoPlistPath}`);
  }
  return bundleId;
}

