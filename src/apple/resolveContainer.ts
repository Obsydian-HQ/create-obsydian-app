import fs from 'fs-extra';
import path from 'path';

import { promptSelect } from '../utils/prompts.js';
import type { XcodeContainer } from './xcodebuild.js';

const DEFAULT_EXCLUDED_DIRS = new Set([
  '.git',
  '.github',
  'node_modules',
  'Dependencies',
  'Pods',
  'Carthage',
  'DerivedData',
  'build',
  '.obsydian-xcode',
  '.expo',
  '.swiftpm',
]);

async function findContainersRecursivelyAsync(
  rootDir: string,
  options?: { maxDepth?: number; maxResults?: number }
): Promise<XcodeContainer[]> {
  const maxDepth = options?.maxDepth ?? 4;
  const maxResults = options?.maxResults ?? 20;
  const maxEntriesPerDir = 500;

  const results: XcodeContainer[] = [];

  type QueueItem = { dir: string; depth: number };
  const queue: QueueItem[] = [{ dir: rootDir, depth: 0 }];

  while (queue.length && results.length < maxResults) {
    const item = queue.shift()!;
    if (item.depth > maxDepth) continue;

    let entries: string[];
    try {
      entries = await fs.readdir(item.dir);
    } catch {
      continue;
    }
    // Avoid "hangs" in huge monorepo directories.
    if (entries.length > maxEntriesPerDir) {
      continue;
    }

    for (const name of entries) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(item.dir, name);

      if (name.endsWith('.xcworkspace')) {
        results.push({ kind: 'workspace', path: fullPath });
        continue;
      }
      if (name.endsWith('.xcodeproj')) {
        results.push({ kind: 'project', path: fullPath });
        continue;
      }

      // Traverse directories
      if (item.depth === maxDepth) continue;
      if (DEFAULT_EXCLUDED_DIRS.has(name)) continue;

      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      queue.push({ dir: fullPath, depth: item.depth + 1 });
    }
  }

  return results;
}

export async function resolveXcodeContainerAsync(options?: {
  cwd?: string;
  project?: string;
  workspace?: string;
}): Promise<XcodeContainer> {
  const cwd = options?.cwd ?? process.cwd();

  if (options?.workspace) {
    return { kind: 'workspace', path: path.isAbsolute(options.workspace) ? options.workspace : path.join(cwd, options.workspace) };
  }
  if (options?.project) {
    return { kind: 'project', path: path.isAbsolute(options.project) ? options.project : path.join(cwd, options.project) };
  }

  const entries = await fs.readdir(cwd);
  const workspaces = entries.filter((e) => e.endsWith('.xcworkspace'));
  const projects = entries.filter((e) => e.endsWith('.xcodeproj'));

  // Prefer workspace if present (common with CocoaPods/SPM setups).
  if (workspaces.length === 1) {
    return { kind: 'workspace', path: path.join(cwd, workspaces[0]) };
  }
  if (workspaces.length > 1) {
    const chosen = await promptSelect<XcodeContainer>(
      'Select an Xcode workspace:',
      workspaces.map((w) => ({
        title: w,
        value: { kind: 'workspace', path: path.join(cwd, w) },
      }))
    );
    return chosen;
  }

  if (projects.length === 1) {
    return { kind: 'project', path: path.join(cwd, projects[0]) };
  }
  if (projects.length > 1) {
    const chosen = await promptSelect<XcodeContainer>(
      'Select an Xcode project:',
      projects.map((p) => ({
        title: p,
        value: { kind: 'project', path: path.join(cwd, p) },
      }))
    );
    return chosen;
  }

  // Recursive fallback (repo root often isn't where the container lives).
  const discovered = await findContainersRecursivelyAsync(cwd, { maxDepth: 4, maxResults: 20 });
  if (discovered.length === 1) {
    return discovered[0];
  }
  if (discovered.length > 1) {
    const chosen = await promptSelect<XcodeContainer>(
      'Select an Xcode project/workspace:',
      discovered.map((c) => ({
        title: path.relative(cwd, c.path),
        value: c,
      }))
    );
    return chosen;
  }

  throw new Error(
    `No Xcode project found in ${cwd}. Provide --project <path.xcodeproj> or --workspace <path.xcworkspace>.`
  );
}

