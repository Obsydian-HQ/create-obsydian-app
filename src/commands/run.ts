/**
 * run command
 * Runs the app locally
 */

import { Command } from 'commander';
import path from 'path';
import Log from '../utils/log.js';
import { findProjectRoot, readConfig, type Platform } from '../project/config.js';
import { promptSelect } from '../utils/prompts.js';
import { runMacosAsync } from '../run/macos/runMacosAsync.js';
import { runIosAsync } from '../run/ios/runIosAsync.js';

export const runCommand = new Command('run')
  .description('Run your Obsydian app locally')
  .option('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('-c, --configuration <config>', 'Build configuration (Debug, Release)', 'Debug')
  .option('--device <device>', 'Target device (for iOS simulator)')
  .option('--no-open', 'Do not open the Simulator app (iOS)')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const projectDir = await findProjectRoot();
    if (!projectDir) {
      Log.error('Not in an Obsydian project. Run "obsydian init" first.');
      process.exit(1);
    }

    const config = await readConfig(projectDir);
    
    // Determine platform
    let platform: Platform;
    if (options.platform) {
      platform = options.platform as Platform;
    } else if (config.platforms.length === 1) {
      platform = config.platforms[0];
    } else {
      platform = await promptSelect('Select platform:', 
        config.platforms.map(p => ({ title: p, value: p }))
      );
    }

    const configuration = options.configuration as 'Debug' | 'Release';
    const verbose = options.verbose ?? false;

    Log.newLine();
    Log.bold(`🚀 Running ${config.name} on ${platform}`);
    Log.newLine();

    const buildDir = path.join(projectDir, 'build');

    if (platform === 'macos') {
      await runMacosAsync(projectDir, {
        projectName: config.name,
        configuration,
        buildDir,
        verbose,
      });
    } else if (platform === 'ios') {
      await runIosAsync(projectDir, {
        projectName: config.name,
        bundleId: config.bundleId,
        configuration,
        buildDir,
        device: options.device,
        shouldOpenSimulator: options.open ?? true,
        verbose,
      });
    } else {
      Log.error(`Platform ${platform} is not yet supported for local run`);
      process.exit(1);
    }
  });
