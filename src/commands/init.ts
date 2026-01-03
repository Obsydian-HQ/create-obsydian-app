/**
 * init command
 * Creates a new Obsydian project
 */

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import Log from '../utils/log.js';
import { promptText, promptSelect, promptMultiSelect, promptConfirm } from '../utils/prompts.js';
import { createDefaultConfig, writeConfig, type Platform } from '../project/config.js';
import { generateMainCpp } from '../project/templates/main-cpp.js';
import { generateMainWithFramework } from '../project/templates/main-with-framework.js';
import { generateInfoPlist } from '../project/templates/info-plist.js';
import { generateEntitlements } from '../project/templates/entitlements.js';
import { generatePlaceholderIcon } from '../project/icon-generator.js';
import { generateXcodeProject } from '../project/xcode.js';
import { getXcodeVersion } from '../utils/exec.js';
import { downloadFrameworkWithCache, getLatestFrameworkVersion } from '../utils/framework-downloader.js';

export const initCommand = new Command('init')
  .description('Create a new Obsydian project')
  .argument('[name]', 'Project name')
  .option('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('-b, --bundle-id <bundleId>', 'Bundle identifier')
  .option('-t, --team-id <teamId>', 'Apple Developer Team ID (required for App Store submission)')
  .action(async (name?: string, options?: { platform?: string; bundleId?: string; teamId?: string }) => {
    Log.newLine();
    Log.bold('🚀 Create Obsydian App');
    Log.newLine();

    // Check prerequisites
    const spinner = ora('Checking prerequisites...').start();
    
    const xcodeVersion = await getXcodeVersion();
    if (!xcodeVersion) {
      spinner.fail('Xcode not found');
      Log.error('Please install Xcode from the App Store');
      process.exit(1);
    }
    
    spinner.succeed(`Found Xcode ${xcodeVersion}`);

    // Get project name
    const projectName = name || await promptText('Project name:', {
      initial: 'my-app',
      validate: (value) => {
        if (!value.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/)) {
          return 'Project name must start with a letter and contain only letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    });

    // Get platforms
    let platforms: Platform[];
    if (options?.platform) {
      platforms = [options.platform as Platform];
    } else {
      platforms = await promptMultiSelect<Platform>(
        'Select platforms:',
        [
          { title: 'macOS', value: 'macos', description: 'Desktop app for Mac' },
          { title: 'iOS', value: 'ios', description: 'iPhone and iPad' },
        ],
        { min: 1 }
      );
    }

    // Generate bundle ID
    const bundleId = options?.bundleId || `com.obsydian.${projectName.toLowerCase().replace(/-/g, '')}`;

    // Create project directory
    const projectDir = path.resolve(process.cwd(), projectName);
    
    if (await fs.pathExists(projectDir)) {
      Log.error(`Directory ${projectName} already exists`);
      process.exit(1);
    }

    const createSpinner = ora('Creating project...').start();

    try {
      await fs.ensureDir(projectDir);

      // Ask if user wants to use Obsydian framework
      let frameworkPath: string | undefined;
      let frameworkVersion: string | undefined;
      
      const useFramework = await promptConfirm(
        'Use Obsydian framework? (provides UI components like Window, Button, etc.)',
        true
      );
      
      if (useFramework) {
        try {
          frameworkVersion = await getLatestFrameworkVersion();
          Log.log(`Latest framework version: ${frameworkVersion}`);
          
          frameworkPath = await downloadFrameworkWithCache(frameworkVersion, projectDir);
          
          // Update config with framework info
          const config = createDefaultConfig(projectName, bundleId, platforms, options?.teamId);
          config.framework = {
            version: frameworkVersion,
            source: 'github',
          };
          await writeConfig(projectDir, config);
        } catch (error: any) {
          Log.warn(`Could not download framework: ${error.message}`);
          Log.log('Creating project without framework. You can add it later.');
          
          const config = createDefaultConfig(projectName, bundleId, platforms, options?.teamId);
          await writeConfig(projectDir, config);
        }
      } else {
        // Create obsydian.json config without framework
        const config = createDefaultConfig(projectName, bundleId, platforms, options?.teamId);
        await writeConfig(projectDir, config);
      }

      // Create main.m (Objective-C source)
      // Use framework-aware template if framework is installed
      const mainSource = frameworkPath 
        ? generateMainWithFramework(projectName)
        : generateMainCpp(projectName);
      await fs.writeFile(path.join(projectDir, 'main.m'), mainSource);

      // Create Info.plist for Apple platforms
      if (platforms.includes('macos') || platforms.includes('ios')) {
        const infoPlist = generateInfoPlist(projectName, bundleId, '1.0.0');
        await fs.writeFile(path.join(projectDir, 'Info.plist'), infoPlist);
        
        // Create entitlements.plist for macOS (required for App Store)
        if (platforms.includes('macos')) {
          const entitlements = generateEntitlements(bundleId);
          await fs.writeFile(path.join(projectDir, 'entitlements.plist'), entitlements);
          
          // Generate placeholder app icon (required for App Store)
          const iconSpinner = ora('Generating placeholder app icon...').start();
          try {
            await generatePlaceholderIcon(projectDir, projectName);
            iconSpinner.succeed('App icon generated');
          } catch (error) {
            iconSpinner.warn('Could not generate icon automatically');
            // Continue anyway - user can add icon manually
          }
        }
      }

      // Generate Xcode project
      if (platforms.includes('macos') || platforms.includes('ios')) {
        await generateXcodeProject({
          projectDir,
          projectName,
          bundleId,
          platforms,
          sourceFiles: ['main.m'],
          infoPlistPath: 'Info.plist',
          entitlementsPath: platforms.includes('macos') ? 'entitlements.plist' : undefined,
          teamId: options?.teamId,
          frameworkPath,
        });
      }

      // Create .gitignore
      const gitignore = `# Xcode
*.xcuserdata
DerivedData/
build/
*.xcarchive

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
`;
      await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

      createSpinner.succeed('Project created!');

      // Print next steps
      Log.newLine();
      Log.bold('✨ Your Obsydian app is ready!');
      Log.newLine();
      Log.log('Next steps:');
      Log.newLine();
      Log.log(`  ${chalk.cyan('cd')} ${projectName}`);
      Log.newLine();
      
      if (platforms.includes('macos') || platforms.includes('ios')) {
        Log.log(`  ${chalk.cyan('obsydian build')} --platform macos`);
        Log.dim('  Build your app');
        Log.newLine();
        
        Log.log(`  ${chalk.cyan('obsydian run')} --platform macos`);
        Log.dim('  Run your app locally');
        Log.newLine();
        
        Log.log(`  ${chalk.cyan('obsydian submit')} --platform macos`);
        Log.dim('  Submit to TestFlight (requires App Store Connect API key)');
      }
      
      Log.newLine();
      Log.dim('Or open in Xcode:');
      Log.log(`  ${chalk.cyan('open')} ${projectName}.xcodeproj`);
      Log.newLine();

    } catch (error) {
      createSpinner.fail('Failed to create project');
      throw error;
    }
  });
