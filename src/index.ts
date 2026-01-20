#!/usr/bin/env node

/**
 * Obsydian CLI
 * 
 * Create, build, and ship native apps to TestFlight and App Store.
 * No Xcode GUI required.
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { submitCommand } from './commands/submit.js';
import { runCommand } from './commands/run.js';
import { credentialsCommand } from './commands/credentials.js';
import { frameworkCommand } from './commands/framework.js';
import { iosCommand } from './commands/ios.js';
import { xcodeCommand } from './commands/xcode.js';
import { menuCommand } from './commands/menu.js';
import { runInteractiveMenuAsync } from './interactive/menu.js';

const program = new Command();

program
  .name('obsydian')
  .description('Create, build, and ship native Obsydian apps')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(buildCommand);
program.addCommand(runCommand);
program.addCommand(submitCommand);
program.addCommand(credentialsCommand);
program.addCommand(frameworkCommand);
program.addCommand(iosCommand);
program.addCommand(xcodeCommand);
program.addCommand(menuCommand);

program.showHelpAfterError(true);

// If no args are provided, launch interactive menu (TTY-only).
const argv = process.argv.slice(2);
if (argv.length === 0) {
  if (process.stdin.isTTY && process.stdout.isTTY) {
    await runInteractiveMenuAsync();
  } else {
    // Non-interactive environments should get a stable, script-friendly output.
    program.outputHelp();
  }
} else {
  await program.parseAsync(process.argv);
}
