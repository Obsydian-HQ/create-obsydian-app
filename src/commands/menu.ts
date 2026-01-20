/**
 * menu command
 * Opens an interactive menu for navigating the CLI.
 */

import { Command } from 'commander';
import { runInteractiveMenuAsync } from '../interactive/menu.js';

export const menuCommand = new Command('menu')
  .description('Open interactive menu')
  .action(async () => {
    await runInteractiveMenuAsync();
  });

