/**
 * Shell command execution utilities
 */

import { spawn, SpawnOptions } from 'child_process';
import Log from './log.js';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  verbose?: boolean;
  silent?: boolean;
}

/**
 * Execute a shell command and return the result
 */
export async function exec(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { cwd, env, verbose = false, silent = false } = options;

  if (verbose && !silent) {
    Log.command(`${command} ${args.join(' ')}`);
  }

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      cwd,
      env: { ...process.env, ...env },
      stdio: verbose ? 'inherit' : 'pipe',
    };

    const child = spawn(command, args, spawnOptions);

    let stdout = '';
    let stderr = '';

    if (!verbose && child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (!verbose && child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      reject(new Error(`Failed to execute ${command}: ${error.message}`));
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
  });
}

/**
 * Execute a command and throw if it fails
 */
export async function execOrThrow(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const result = await exec(command, args, options);
  
  if (result.exitCode !== 0) {
    const errorMessage = result.stderr || result.stdout || `Command failed with exit code ${result.exitCode}`;
    throw new Error(errorMessage);
  }
  
  return result;
}

/**
 * Check if a command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await exec('which', [command], { silent: true });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get Xcode version
 */
export async function getXcodeVersion(): Promise<string | null> {
  try {
    const result = await exec('xcodebuild', ['-version'], { silent: true });
    if (result.exitCode === 0) {
      const match = result.stdout.match(/Xcode\s+(\d+\.\d+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get Bazel version
 */
export async function getBazelVersion(): Promise<string | null> {
  try {
    const result = await exec('bazel', ['--version'], { silent: true });
    if (result.exitCode === 0) {
      const match = result.stdout.match(/bazel\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}
