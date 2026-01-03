/**
 * Obsidian installation detector
 * Attempts to find Obsidian framework installation for automatic dependency configuration
 */

import * as path from 'path';
import { pathExists, joinPath } from './fileSystem.js';

export async function detectObsidianPath(currentDir: string): Promise<string | undefined> {
  // Check common locations relative to current directory
  const possiblePaths = [
    path.resolve(currentDir, '..', 'Obsidian'),
    path.resolve(currentDir, '..', '..', 'Obsidian'),
    path.resolve(currentDir, 'obsidian'),
  ];

  for (const possiblePath of possiblePaths) {
    const moduleBazelPath = joinPath(possiblePath, 'MODULE.bazel');
    if (await pathExists(moduleBazelPath)) {
      return possiblePath;
    }
  }

  return undefined;
}

export function calculateRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

