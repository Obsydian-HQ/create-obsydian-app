/**
 * credentials command
 * Manage App Store Connect API keys and signing credentials
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import Log from '../utils/log.js';
import { promptText, promptFilePath, promptSelect, promptConfirm } from '../utils/prompts.js';
import { findProjectRoot, readConfig, writeConfig } from '../project/config.js';

export const credentialsCommand = new Command('credentials')
  .description('Manage App Store Connect credentials')
  .addCommand(setupCommand())
  .addCommand(showCommand());

function setupCommand(): Command {
  return new Command('setup')
    .description('Set up App Store Connect API key')
    .action(async () => {
      Log.newLine();
      Log.bold('🔐 App Store Connect API Key Setup');
      Log.newLine();
      
      Log.log('To submit apps to TestFlight and App Store, you need an API key from App Store Connect.');
      Log.newLine();
      Log.dim('Create one at: https://appstoreconnect.apple.com/access/api');
      Log.newLine();

      // Get API key details
      const keyPath = await promptFilePath('Path to API key (.p8 file):', {
        validate: (value) => {
          if (!value.endsWith('.p8')) {
            return 'File must be a .p8 file';
          }
          return true;
        },
      });
      
      // Verify file exists
      if (!await fs.pathExists(keyPath)) {
        Log.error('File does not exist');
        process.exit(1);
      }

      const keyId = await promptText('Key ID:', {
        validate: (value) => {
          if (!value.match(/^[A-Z0-9]{10}$/)) {
            return 'Key ID must be 10 alphanumeric characters';
          }
          return true;
        },
      });

      const issuerId = await promptText('Issuer ID:', {
        validate: (value) => {
          if (!value.match(/^[a-f0-9-]{36}$/)) {
            return 'Issuer ID must be a valid UUID';
          }
          return true;
        },
      });

      // Verify the key file is readable
      try {
        const keyContent = await fs.readFile(keyPath, 'utf-8');
        if (!keyContent.includes('BEGIN PRIVATE KEY')) {
          Log.error('Invalid API key file format');
          process.exit(1);
        }
      } catch {
        Log.error('Could not read API key file');
        process.exit(1);
      }

      // Save to project config if in a project
      const projectDir = await findProjectRoot();
      if (projectDir) {
        const saveToProject = await promptConfirm('Save credentials to project config?', true);
        
        if (saveToProject) {
          const config = await readConfig(projectDir);
          
          // Copy key to project
          const keysDir = path.join(projectDir, '.keys');
          await fs.ensureDir(keysDir);
          
          const localKeyPath = path.join(keysDir, `AuthKey_${keyId}.p8`);
          await fs.copyFile(keyPath, localKeyPath);
          
          // Update config
          config.submit = {
            ...config.submit,
            production: {
              ...config.submit?.production,
              platform: config.platforms[0],
              ascApiKeyPath: `.keys/AuthKey_${keyId}.p8`,
              ascApiKeyId: keyId,
              ascApiKeyIssuerId: issuerId,
            },
          };
          
          await writeConfig(projectDir, config);
          
          // Add .keys to .gitignore
          const gitignorePath = path.join(projectDir, '.gitignore');
          let gitignore = '';
          if (await fs.pathExists(gitignorePath)) {
            gitignore = await fs.readFile(gitignorePath, 'utf-8');
          }
          if (!gitignore.includes('.keys')) {
            gitignore += '\n# API Keys (DO NOT COMMIT)\n.keys/\n';
            await fs.writeFile(gitignorePath, gitignore);
          }
          
          Log.newLine();
          Log.success('Credentials saved to project!');
          Log.dim(`Key stored at: ${localKeyPath}`);
          Log.warn('Make sure .keys/ is in your .gitignore');
        }
      }

      // Also save to global config
      const globalConfigDir = path.join(process.env.HOME || '~', '.obsydian');
      await fs.ensureDir(globalConfigDir);
      
      const globalCredPath = path.join(globalConfigDir, 'credentials.json');
      let globalCreds: any = {};
      if (await fs.pathExists(globalCredPath)) {
        globalCreds = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
      }
      
      globalCreds.appStoreConnect = {
        keyPath: keyPath,
        keyId,
        issuerId,
      };
      
      await fs.writeFile(globalCredPath, JSON.stringify(globalCreds, null, 2));
      
      Log.newLine();
      Log.success('Credentials configured!');
      Log.dim(`Global config: ${globalCredPath}`);
      Log.newLine();
      Log.log('You can now use:');
      Log.log(`  ${chalk.cyan('obsydian submit')} --platform macos`);
    });
}

function showCommand(): Command {
  return new Command('show')
    .description('Show configured credentials')
    .action(async () => {
      Log.newLine();
      Log.bold('🔐 Configured Credentials');
      Log.newLine();

      // Check project credentials
      const projectDir = await findProjectRoot();
      if (projectDir) {
        const config = await readConfig(projectDir);
        if (config.submit?.production?.ascApiKeyId) {
          Log.log(chalk.green('Project credentials:'));
          Log.log(`  Key ID: ${config.submit.production.ascApiKeyId}`);
          Log.log(`  Issuer ID: ${config.submit.production.ascApiKeyIssuerId}`);
          Log.log(`  Key Path: ${config.submit.production.ascApiKeyPath}`);
          Log.newLine();
        } else {
          Log.dim('No project credentials configured');
          Log.newLine();
        }
      }

      // Check global credentials
      const globalCredPath = path.join(process.env.HOME || '~', '.obsydian', 'credentials.json');
      if (await fs.pathExists(globalCredPath)) {
        const globalCreds = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
        if (globalCreds.appStoreConnect) {
          Log.log(chalk.blue('Global credentials:'));
          Log.log(`  Key ID: ${globalCreds.appStoreConnect.keyId}`);
          Log.log(`  Issuer ID: ${globalCreds.appStoreConnect.issuerId}`);
          Log.log(`  Key Path: ${globalCreds.appStoreConnect.keyPath}`);
        }
      } else {
        Log.dim('No global credentials configured');
      }

      Log.newLine();
      Log.log(`Run ${chalk.cyan('obsydian credentials setup')} to configure credentials`);
    });
}
