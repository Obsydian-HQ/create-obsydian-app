/**
 * File system utilities
 */

import fs from 'fs-extra';
import * as path from 'path';

export async function ensureDirectory(dir: string): Promise<void> {
  await fs.ensureDir(dir);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content);
}

export async function pathExists(filePath: string): Promise<boolean> {
  return await fs.pathExists(filePath);
}

export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

