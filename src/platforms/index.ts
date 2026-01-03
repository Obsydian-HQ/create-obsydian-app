/**
 * Platform registry
 * Central registry for all platform generators
 */

import { PlatformGenerator } from './base.js';
import { MacOSPlatform } from './macos.js';
import type { Platform } from '../validation.js';

const platformGenerators = new Map<Platform, PlatformGenerator>([
  ['macos', new MacOSPlatform()],
]);

export function getPlatformGenerator(platform: Platform): PlatformGenerator | undefined {
  return platformGenerators.get(platform);
}

export function getAllPlatformGenerators(): Map<Platform, PlatformGenerator> {
  return platformGenerators;
}

export function registerPlatform(platform: Platform, generator: PlatformGenerator): void {
  platformGenerators.set(platform, generator);
}

