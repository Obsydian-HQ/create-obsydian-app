/**
 * framework command
 * Manage Obsydian framework versions
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import Log from '../utils/log.js';
import { findProjectRoot, readConfig, writeConfig } from '../project/config.js';
import { downloadFrameworkWithCache, getLatestFrameworkVersion } from '../utils/framework-downloader.js';
import chalk from 'chalk';

export const frameworkCommand = new Command('framework')
  .description('Manage Obsydian framework versions')
  .addCommand(
    new Command('update')
      .description('Update to the latest framework version')
      .action(async () => {
        const projectDir = await findProjectRoot();
        if (!projectDir) {
          Log.error('Not in an Obsydian project. Run this command from your project directory.');
          process.exit(1);
        }

        const config = await readConfig(projectDir);
        const currentVersion = config.framework?.version || 'unknown';
        
        Log.newLine();
        Log.bold('🔄 Updating Obsydian Framework');
        Log.log(`Current version: ${chalk.dim(currentVersion)}`);
        Log.newLine();

        try {
          const latestVersion = await getLatestFrameworkVersion();
          Log.log(`Latest version: ${chalk.cyan(latestVersion)}`);
          
          if (currentVersion === latestVersion) {
            Log.success('Already on the latest version!');
            return;
          }

          Log.log('Downloading framework...');
          const frameworkPath = await downloadFrameworkWithCache(latestVersion, projectDir);

          // Update config
          config.framework = {
            version: latestVersion,
            source: 'github',
          };
          await writeConfig(projectDir, config);

          Log.newLine();
          Log.success(`Framework updated to v${latestVersion}!`);
          Log.log(`Framework location: ${chalk.dim(frameworkPath)}`);
          Log.newLine();
          Log.log('You may need to rebuild your project:');
          Log.log(`  ${chalk.cyan('obsydian build')} --platform macos`);
        } catch (error: any) {
          Log.error(`Failed to update framework: ${error.message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('version')
      .description('Show current framework version')
      .action(async () => {
        const projectDir = await findProjectRoot();
        if (!projectDir) {
          Log.error('Not in an Obsydian project. Run this command from your project directory.');
          process.exit(1);
        }

        const config = await readConfig(projectDir);
        const version = config.framework?.version || 'unknown';
        const source = config.framework?.source || 'unknown';

        Log.newLine();
        Log.bold('📦 Obsydian Framework Version');
        Log.newLine();
        Log.log(`Version: ${chalk.cyan(version)}`);
        Log.log(`Source: ${chalk.dim(source)}`);
        
        try {
          const latestVersion = await getLatestFrameworkVersion();
          if (version !== latestVersion) {
            Log.newLine();
            Log.warn(`Update available: v${latestVersion}`);
            Log.log(`Run ${chalk.cyan('obsydian framework update')} to update`);
          } else {
            Log.newLine();
            Log.success('You are on the latest version!');
          }
        } catch (error: any) {
          Log.warn(`Could not check for updates: ${error.message}`);
        }
      })
  );
