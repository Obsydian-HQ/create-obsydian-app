/**
 * Logging utilities
 * Inspired by Expo's log.ts
 */

import chalk from 'chalk';

export const Log = {
  log: (...args: unknown[]) => {
    console.log(...args);
  },

  newLine: () => {
    console.log();
  },

  error: (...args: unknown[]) => {
    console.error(chalk.red('✖'), ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn(chalk.yellow('⚠'), ...args);
  },

  success: (...args: unknown[]) => {
    console.log(chalk.green('✔'), ...args);
  },

  info: (...args: unknown[]) => {
    console.log(chalk.blue('ℹ'), ...args);
  },

  dim: (message: string) => {
    console.log(chalk.dim(message));
  },

  bold: (message: string) => {
    console.log(chalk.bold(message));
  },

  // For step progress
  step: (current: number, total: number, message: string) => {
    console.log(chalk.cyan(`[${current}/${total}]`), message);
  },

  // For commands being run
  command: (cmd: string) => {
    console.log(chalk.dim('$'), chalk.cyan(cmd));
  },
};

export default Log;
