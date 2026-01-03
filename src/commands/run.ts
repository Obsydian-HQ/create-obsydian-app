/**
 * run command
 * Runs the app locally
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import Log from '../utils/log.js';
import { exec } from '../utils/exec.js';
import { findProjectRoot, readConfig, type Platform } from '../project/config.js';
import { promptSelect } from '../utils/prompts.js';

export const runCommand = new Command('run')
  .description('Run your Obsydian app locally')
  .option('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('-c, --configuration <config>', 'Build configuration (Debug, Release)', 'Debug')
  .option('--device <device>', 'Target device (for iOS simulator)')
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

    const configuration = options.configuration as string;
    const verbose = options.verbose ?? false;

    Log.newLine();
    Log.bold(`🚀 Running ${config.name} on ${platform}`);
    Log.newLine();

    const buildDir = path.join(projectDir, 'build');

    if (platform === 'macos') {
      await runMacOS(projectDir, config.name, configuration, buildDir, verbose);
    } else if (platform === 'ios') {
      await runIOS(projectDir, config.name, configuration, buildDir, options.device, verbose);
    } else {
      Log.error(`Platform ${platform} is not yet supported for local run`);
      process.exit(1);
    }
  });

async function runMacOS(
  projectDir: string,
  projectName: string,
  configuration: string,
  buildDir: string,
  verbose: boolean
): Promise<void> {
  // First, build the app
  const buildSpinner = ora('Building...').start();

  try {
    const buildArgs = [
      '-project', `${projectName}.xcodeproj`,
      '-scheme', projectName,
      '-configuration', configuration,
      '-derivedDataPath', buildDir,
      '-destination', 'platform=macOS,arch=arm64',
      'build',
    ];

    const buildResult = await exec('xcodebuild', buildArgs, {
      cwd: projectDir,
      verbose,
    });

    if (buildResult.exitCode !== 0) {
      buildSpinner.fail('Build failed');
      if (!verbose) {
        Log.error(buildResult.stderr || buildResult.stdout);
      }
      process.exit(1);
    }

    buildSpinner.succeed('Build succeeded!');

  } catch (error) {
    buildSpinner.fail('Build failed');
    throw error;
  }

  // Find and run the app
  const appPath = await findBuiltApp(buildDir, projectName, configuration);
  if (!appPath) {
    Log.error('Could not find built app');
    process.exit(1);
  }

  Log.newLine();
  Log.info(`Running ${chalk.cyan(appPath)}`);
  Log.newLine();

  // Run the app
  const runResult = await exec('open', [appPath], {
    cwd: projectDir,
    verbose: true,
  });

  if (runResult.exitCode !== 0) {
    Log.error('Failed to launch app');
    process.exit(1);
  }
}

async function runIOS(
  projectDir: string,
  projectName: string,
  configuration: string,
  buildDir: string,
  device: string | undefined,
  verbose: boolean
): Promise<void> {
  // Build for iOS Simulator
  const buildSpinner = ora('Building for iOS Simulator...').start();

  try {
    // Get available simulators
    const simulatorsResult = await exec('xcrun', ['simctl', 'list', 'devices', '-j'], { silent: true });
    const simulators = JSON.parse(simulatorsResult.stdout);
    
    // Find a booted simulator or boot one
    let targetDevice = device;
    if (!targetDevice) {
      // Find iPhone simulator
      for (const [runtime, devices] of Object.entries(simulators.devices) as [string, any][]) {
        if (runtime.includes('iOS')) {
          const availableDevices = devices.filter((d: any) => d.isAvailable);
          const bootedDevice = availableDevices.find((d: any) => d.state === 'Booted');
          if (bootedDevice) {
            targetDevice = bootedDevice.udid;
            break;
          }
          const iPhone = availableDevices.find((d: any) => d.name.includes('iPhone'));
          if (iPhone) {
            targetDevice = iPhone.udid;
            break;
          }
        }
      }
    }

    if (!targetDevice) {
      buildSpinner.fail('No iOS Simulator available');
      Log.error('Please open Xcode and download iOS Simulator runtime');
      process.exit(1);
    }

    const buildArgs = [
      '-project', `${projectName}.xcodeproj`,
      '-scheme', projectName,
      '-configuration', configuration,
      '-derivedDataPath', buildDir,
      '-destination', `id=${targetDevice}`,
      'build',
    ];

    const buildResult = await exec('xcodebuild', buildArgs, {
      cwd: projectDir,
      verbose,
    });

    if (buildResult.exitCode !== 0) {
      buildSpinner.fail('Build failed');
      if (!verbose) {
        Log.error(buildResult.stderr || buildResult.stdout);
      }
      process.exit(1);
    }

    buildSpinner.succeed('Build succeeded!');

    // Install and launch on simulator
    Log.info('Installing on simulator...');
    
    // Boot simulator if not running
    await exec('xcrun', ['simctl', 'boot', targetDevice], { silent: true });
    
    // Install app
    const appPath = path.join(buildDir, 'Build', 'Products', `${configuration}-iphonesimulator`, `${projectName}.app`);
    await exec('xcrun', ['simctl', 'install', targetDevice, appPath], { verbose });
    
    // Launch app
    const bundleId = `com.obsydian.${projectName.toLowerCase().replace(/-/g, '')}`;
    await exec('xcrun', ['simctl', 'launch', targetDevice, bundleId], { verbose });
    
    Log.success('App running in iOS Simulator!');

  } catch (error) {
    buildSpinner.fail('Run failed');
    throw error;
  }
}

async function findBuiltApp(buildDir: string, projectName: string, configuration: string): Promise<string | null> {
  const possiblePaths = [
    path.join(buildDir, 'Build', 'Products', configuration, `${projectName}.app`),
    path.join(buildDir, 'Build', 'Products', `${configuration}-macosx`, `${projectName}.app`),
  ];

  for (const appPath of possiblePaths) {
    if (await fs.pathExists(appPath)) {
      return appPath;
    }
  }

  return null;
}
