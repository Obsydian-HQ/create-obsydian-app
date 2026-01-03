/**
 * build command
 * Builds the app using xcodebuild (no Xcode GUI required)
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import Log from '../utils/log.js';
import { exec, execOrThrow } from '../utils/exec.js';
import { findProjectRoot, readConfig, type Platform } from '../project/config.js';
import { promptSelect } from '../utils/prompts.js';

export const buildCommand = new Command('build')
  .description('Build your Obsydian app')
  .option('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('-c, --configuration <config>', 'Build configuration (Debug, Release)', 'Release')
  .option('--archive', 'Create an archive for distribution')
  .option('--export-path <path>', 'Path to export the archive')
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
    Log.bold(`🔨 Building ${config.name} for ${platform}`);
    Log.dim(`Configuration: ${configuration}`);
    Log.newLine();

    // Find Xcode project
    const xcodeProjectPath = path.join(projectDir, `${config.name}.xcodeproj`);
    if (!await fs.pathExists(xcodeProjectPath)) {
      Log.error(`Xcode project not found: ${xcodeProjectPath}`);
      Log.info('Run "obsydian init" to regenerate the project');
      process.exit(1);
    }

    const buildDir = path.join(projectDir, 'build');
    if (!await fs.pathExists(buildDir)) {
      await fs.mkdir(buildDir, { recursive: true });
    }

    if (options.archive) {
      // Archive build
      await buildArchive(projectDir, config.name, platform, configuration, buildDir, options.exportPath, verbose);
    } else {
      // Regular build
      await buildProject(projectDir, config.name, platform, configuration, buildDir, verbose);
    }
  });

async function buildProject(
  projectDir: string,
  projectName: string,
  platform: Platform,
  configuration: string,
  buildDir: string,
  verbose: boolean
): Promise<void> {
  const spinner = ora('Building...').start();

  try {
    const args = [
      '-project', `${projectName}.xcodeproj`,
      '-scheme', projectName,
      '-configuration', configuration,
      '-derivedDataPath', buildDir,
      'build',
    ];

    // Add platform-specific settings
    if (platform === 'macos') {
      args.push('-destination', 'platform=macOS,arch=arm64');
    } else if (platform === 'ios') {
      args.push('-destination', 'generic/platform=iOS');
    }

    const result = await exec('xcodebuild', args, {
      cwd: projectDir,
      verbose,
    });

    if (result.exitCode !== 0) {
      spinner.fail('Build failed');
      if (!verbose) {
        Log.newLine();
        Log.error(result.stderr || result.stdout);
      }
      process.exit(1);
    }

    spinner.succeed('Build succeeded!');
    
    // Find the built app
    const appPath = await findBuiltApp(buildDir, projectName, configuration);
    if (appPath) {
      Log.newLine();
      Log.success(`App built at: ${chalk.cyan(appPath)}`);
    }

  } catch (error) {
    spinner.fail('Build failed');
    throw error;
  }
}

async function buildArchive(
  projectDir: string,
  projectName: string,
  platform: Platform,
  configuration: string,
  buildDir: string,
  exportPath: string | undefined,
  verbose: boolean
): Promise<void> {
  const archivePath = path.join(buildDir, `${projectName}.xcarchive`);
  
  // Step 1: Create archive
  const archiveSpinner = ora('Creating archive...').start();

  try {
    const archiveArgs = [
      '-project', `${projectName}.xcodeproj`,
      '-scheme', projectName,
      '-configuration', configuration,
      '-archivePath', archivePath,
      'archive',
    ];

    if (platform === 'macos') {
      archiveArgs.push('-destination', 'platform=macOS,arch=arm64');
    } else if (platform === 'ios') {
      archiveArgs.push('-destination', 'generic/platform=iOS');
    }

    const result = await exec('xcodebuild', archiveArgs, {
      cwd: projectDir,
      verbose,
    });

    if (result.exitCode !== 0) {
      archiveSpinner.fail('Archive failed');
      if (!verbose) {
        Log.error(result.stderr || result.stdout);
      }
      process.exit(1);
    }

    archiveSpinner.succeed('Archive created!');
    Log.success(`Archive: ${chalk.cyan(archivePath)}`);

    // Step 2: Export archive (if export path provided)
    if (exportPath) {
      await exportArchive(projectDir, archivePath, exportPath, platform, verbose);
    }

  } catch (error) {
    archiveSpinner.fail('Archive failed');
    throw error;
  }
}

async function exportArchive(
  projectDir: string,
  archivePath: string,
  exportPath: string,
  platform: Platform,
  verbose: boolean
): Promise<void> {
  const exportSpinner = ora('Exporting archive...').start();

  try {
    // Create export options plist
    const exportOptionsPath = path.join(projectDir, 'build', 'ExportOptions.plist');
    const exportOptions = generateExportOptions(platform);
    await fs.writeFile(exportOptionsPath, exportOptions);

    const exportArgs = [
      '-exportArchive',
      '-archivePath', archivePath,
      '-exportPath', exportPath,
      '-exportOptionsPlist', exportOptionsPath,
    ];

    const result = await exec('xcodebuild', exportArgs, {
      cwd: projectDir,
      verbose,
    });

    if (result.exitCode !== 0) {
      exportSpinner.fail('Export failed');
      if (!verbose) {
        Log.error(result.stderr || result.stdout);
      }
      process.exit(1);
    }

    exportSpinner.succeed('Archive exported!');
    Log.success(`Exported to: ${chalk.cyan(exportPath)}`);

  } catch (error) {
    exportSpinner.fail('Export failed');
    throw error;
  }
}

function generateExportOptions(platform: Platform): string {
  if (platform === 'macos') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>mac-application</string>
    <key>teamID</key>
    <string></string>
</dict>
</plist>`;
  } else {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string></string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>`;
  }
}

async function findBuiltApp(buildDir: string, projectName: string, configuration: string): Promise<string | null> {
  const possiblePaths = [
    path.join(buildDir, 'Build', 'Products', `${configuration}`, `${projectName}.app`),
    path.join(buildDir, 'Build', 'Products', `${configuration}-macosx`, `${projectName}.app`),
  ];

  for (const appPath of possiblePaths) {
    if (await fs.pathExists(appPath)) {
      return appPath;
    }
  }

  return null;
}
