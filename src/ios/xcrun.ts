import chalk from 'chalk';
import { exec, type ExecOptions, type ExecResult } from '../utils/exec.js';
import { CommandError } from '../utils/errors.js';

const XCODE_LICENSE_NOT_ACCEPTED = 'XCODE_LICENSE_NOT_ACCEPTED';
const SIMCTL_NOT_AVAILABLE = 'SIMCTL_NOT_AVAILABLE';

function isLicenseOutOfDate(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower.includes('xcode') && lower.includes('license');
}

function coalesceOutput(result: ExecResult): string {
  return (result.stderr || result.stdout || '').trim();
}

export async function xcrunAsync(
  args: Array<string | undefined>,
  options: ExecOptions = {}
): Promise<ExecResult> {
  const filtered = args.filter(Boolean) as string[];
  const result = await exec('xcrun', filtered, options);

  if (result.exitCode === 0) {
    return result;
  }

  const output = coalesceOutput(result);

  if (isLicenseOutOfDate(output)) {
    throw new CommandError(
      XCODE_LICENSE_NOT_ACCEPTED,
      'Xcode license is not accepted. Run `sudo xcodebuild -license`.'
    );
  }

  if (output.includes('not a developer tool or in PATH')) {
    throw new CommandError(
      SIMCTL_NOT_AVAILABLE,
      `You may need to run ${chalk.bold('sudo xcode-select -s /Applications/Xcode.app')} and try again.`
    );
  }

  throw new Error(output || `xcrun ${filtered.join(' ')} failed with exit code ${result.exitCode}`);
}

