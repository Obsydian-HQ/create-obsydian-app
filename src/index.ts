#!/usr/bin/env node

/**
 * create-obsidian-app
 * 
 * Scaffolds a new Obsidian application with Bazel workspace setup
 * Currently supports macOS only (other platforms coming soon)
 */

import { program } from 'commander';
import { scaffoldApp } from './scaffold.js';
import { IMPLEMENTED_PLATFORMS } from './validation.js';

program
  .name('create-obsidian-app')
  .description('Create a new Obsidian application (macOS only - other platforms coming soon)')
  .argument('<app-name>', 'Name of the application')
  .option(
    '-p, --platforms <platforms...>',
    `Target platforms (currently only ${IMPLEMENTED_PLATFORMS.join(', ')} is supported)`,
    ['macos']
  )
  .action(async (appName: string, options: { platforms: string[] }) => {
    try {
      const result = await scaffoldApp({
        appName,
        platforms: options.platforms,
      });

      console.log(`\nNext steps:`);
      console.log(`  cd ${appName}`);
      
      // Check if Xcode project was generated
      const hasApplePlatform = options.platforms.some(p => p === 'macos' || p === 'ios');
      
      if (hasApplePlatform) {
        console.log(`\n📱 To build and archive in Xcode:`);
        console.log(`  1. Open ${appName}.xcodeproj in Xcode`);
        console.log(`  2. Select your development team in Signing & Capabilities`);
        console.log(`  3. Product → Archive`);
        console.log(`  4. Distribute to TestFlight`);
      }
      
      console.log(`\n🔨 To build with Bazel:`);
      if (!result.obsidianPath) {
        console.log(`  # Configure Obsidian dependency in MODULE.bazel (see README.md for instructions)`);
      }
      const buildConfigs = options.platforms.map(p => `--config=${p}`).join(' ');
      console.log(`  bazel build //... ${buildConfigs}`);
      console.log(`  bazel run //:${result.executableName}_app ${buildConfigs}`);
    } catch (error) {
      console.error('❌ Error creating app:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
