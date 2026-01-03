/**
 * Obsydian project configuration (obsydian.json)
 */

import fs from 'fs-extra';
import path from 'path';

export interface ObsydianConfig {
  name: string;
  version: string;
  bundleId: string;
  platforms: Platform[];
  
  // Framework configuration
  framework?: {
    version?: string;
    source?: 'github' | 'local';
    localPath?: string;
  };
  
  // iOS/macOS specific
  apple?: {
    teamId?: string;
    minimumOsVersion?: string;
  };
  
  // Build profiles
  build?: {
    [profile: string]: BuildProfile;
  };
  
  // Submit profiles
  submit?: {
    [profile: string]: SubmitProfile;
  };
}

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux';

export interface BuildProfile {
  platform: Platform;
  configuration?: 'Debug' | 'Release';
  scheme?: string;
}

export interface SubmitProfile {
  platform: Platform;
  // App Store Connect
  ascApiKeyPath?: string;
  ascApiKeyId?: string;
  ascApiKeyIssuerId?: string;
}

const CONFIG_FILENAME = 'obsydian.json';

/**
 * Find the project root by looking for obsydian.json
 */
export async function findProjectRoot(startDir: string = process.cwd()): Promise<string | null> {
  let currentDir = startDir;
  
  while (currentDir !== path.dirname(currentDir)) {
    const configPath = path.join(currentDir, CONFIG_FILENAME);
    if (await fs.pathExists(configPath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

/**
 * Read the obsydian.json config
 */
export async function readConfig(projectDir: string): Promise<ObsydianConfig> {
  const configPath = path.join(projectDir, CONFIG_FILENAME);
  
  if (!await fs.pathExists(configPath)) {
    throw new Error(`No ${CONFIG_FILENAME} found in ${projectDir}`);
  }
  
  const content = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(content) as ObsydianConfig;
}

/**
 * Write the obsydian.json config
 */
export async function writeConfig(projectDir: string, config: ObsydianConfig): Promise<void> {
  const configPath = path.join(projectDir, CONFIG_FILENAME);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Create a default config for a new project
 */
export function createDefaultConfig(
  name: string,
  bundleId: string,
  platforms: Platform[],
  teamId?: string
): ObsydianConfig {
  return {
    name,
    version: '1.0.0',
    bundleId,
    platforms,
    apple: {
      teamId,
      minimumOsVersion: '14.0',
    },
    build: {
      development: {
        platform: platforms[0],
        configuration: 'Debug',
      },
      production: {
        platform: platforms[0],
        configuration: 'Release',
      },
    },
    submit: {
      production: {
        platform: platforms[0],
      },
    },
  };
}
