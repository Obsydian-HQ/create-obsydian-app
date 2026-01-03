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

program.parse();
