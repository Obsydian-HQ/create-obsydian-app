import fs from 'fs-extra';
import path from 'path';

import { exec, type ExecOptions } from '../utils/exec.js';

export type XcodeProjectLocator = {
  projectDir: string;
  projectName: string;
};

export type XcodeContainer =
  | { kind: 'project'; path: string }
  | { kind: 'workspace'; path: string };

export type XcodeBuildProfile = {
  scheme: string;
  configuration: 'Debug' | 'Release';
  derivedDataPath?: string;
  destination?: string;
  verbose?: boolean;
};

export async function ensureXcodeProjectAsync(locator: XcodeProjectLocator): Promise<string> {
  const xcodeProjectPath = path.join(locator.projectDir, `${locator.projectName}.xcodeproj`);
  if (!(await fs.pathExists(xcodeProjectPath))) {
    throw new Error(
      `Xcode project not found: ${xcodeProjectPath}\nRun "obsydian init" to generate it.`
    );
  }
  return xcodeProjectPath;
}

function containerArgs(container: XcodeContainer): string[] {
  return container.kind === 'workspace' ? ['-workspace', container.path] : ['-project', container.path];
}

export async function xcodebuildAsync(
  projectDir: string,
  args: string[],
  options: ExecOptions
) {
  const result = await exec('xcodebuild', args, { ...options, cwd: projectDir });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || `xcodebuild failed with exit code ${result.exitCode}`);
  }
  return result;
}

export async function buildAsync(locator: XcodeProjectLocator, profile: XcodeBuildProfile) {
  await ensureXcodeProjectAsync(locator);
  const args = [
    '-project',
    `${locator.projectName}.xcodeproj`,
    '-scheme',
    profile.scheme,
    '-configuration',
    profile.configuration,
  ];

  if (profile.derivedDataPath) {
    args.push('-derivedDataPath', profile.derivedDataPath);
  }

  if (profile.destination) {
    args.push('-destination', profile.destination);
  }

  args.push('build');

  return await xcodebuildAsync(locator.projectDir, args, { verbose: !!profile.verbose });
}

export async function buildContainerAsync(
  container: XcodeContainer,
  profile: XcodeBuildProfile,
  options: { cwd?: string; extraArgs?: string[] } = {}
) {
  const args = [
    ...containerArgs(container),
    '-scheme',
    profile.scheme,
    '-configuration',
    profile.configuration,
  ];

  if (profile.derivedDataPath) {
    args.push('-derivedDataPath', profile.derivedDataPath);
  }

  if (profile.destination) {
    args.push('-destination', profile.destination);
  }

  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }

  args.push('build');

  return await xcodebuildAsync(options.cwd ?? process.cwd(), args, { verbose: !!profile.verbose });
}

export async function showBuildSettingsAsync(
  locator: XcodeProjectLocator,
  profile: XcodeBuildProfile
): Promise<Record<string, string>> {
  await ensureXcodeProjectAsync(locator);
  const args = [
    '-project',
    `${locator.projectName}.xcodeproj`,
    '-scheme',
    profile.scheme,
    '-configuration',
    profile.configuration,
  ];

  if (profile.derivedDataPath) {
    args.push('-derivedDataPath', profile.derivedDataPath);
  }

  if (profile.destination) {
    args.push('-destination', profile.destination);
  }

  args.push('-showBuildSettings');

  const result = await exec('xcodebuild', args, { cwd: locator.projectDir, silent: true });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || `xcodebuild -showBuildSettings failed with exit code ${result.exitCode}`);
  }

  return parseBuildSettings(result.stdout);
}

export async function showBuildSettingsContainerAsync(
  container: XcodeContainer,
  profile: XcodeBuildProfile,
  options: { cwd?: string; extraArgs?: string[] } = {}
): Promise<Record<string, string>> {
  const args = [
    ...containerArgs(container),
    '-scheme',
    profile.scheme,
    '-configuration',
    profile.configuration,
  ];

  if (profile.derivedDataPath) {
    args.push('-derivedDataPath', profile.derivedDataPath);
  }

  if (profile.destination) {
    args.push('-destination', profile.destination);
  }

  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }

  args.push('-showBuildSettings');

  const result = await exec('xcodebuild', args, { cwd: options.cwd ?? process.cwd(), silent: true });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || `xcodebuild -showBuildSettings failed with exit code ${result.exitCode}`);
  }

  return parseBuildSettings(result.stdout);
}

export async function listSchemesAsync(
  container: XcodeContainer,
  options: { cwd?: string } = {}
): Promise<string[]> {
  const args = [...containerArgs(container), '-list', '-json'];
  const result = await exec('xcodebuild', args, { cwd: options.cwd ?? process.cwd(), silent: true });
  if (result.exitCode !== 0) {
    const out = (result.stderr || result.stdout || '').trim();
    throw new Error(out || `xcodebuild -list failed with exit code ${result.exitCode}`);
  }

  try {
    const json = JSON.parse(result.stdout) as any;
    const schemes: string[] =
      (container.kind === 'workspace' ? json?.workspace?.schemes : json?.project?.schemes) ?? [];
    return schemes.filter(Boolean);
  } catch {
    // Fallback: parse plain output (older xcodebuild formats)
    const lines = result.stdout.split('\n');
    const idx = lines.findIndex((l) => l.trim() === 'Schemes:');
    if (idx >= 0) {
      return lines
        .slice(idx + 1)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }
    return [];
  }
}

export function parseBuildSettings(output: string): Record<string, string> {
  const settings: Record<string, string> = {};
  for (const line of output.split('\n')) {
    // Format: "    KEY = VALUE"
    const idx = line.indexOf(' = ');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 3).trim();
    if (!key) continue;
    settings[key] = value;
  }
  return settings;
}

export function getBuiltAppPathFromBuildSettings(settings: Record<string, string>): string | null {
  const dir =
    settings.CONFIGURATION_BUILD_DIR ||
    settings.TARGET_BUILD_DIR ||
    settings.BUILT_PRODUCTS_DIR ||
    '';
  const name = settings.FULL_PRODUCT_NAME || settings.WRAPPER_NAME || '';
  if (dir && name) return path.join(dir, name);
  return null;
}

