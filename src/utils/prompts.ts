/**
 * User prompts utilities
 */

import prompts from 'prompts';
import Log from './log.js';

export interface SelectOption<T = string> {
  title: string;
  value: T;
  description?: string;
}

/**
 * Prompt for text input
 */
export async function promptText(
  message: string,
  options: {
    initial?: string;
    validate?: (value: string) => boolean | string;
  } = {}
): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    initial: options.initial,
    validate: options.validate,
  });

  if (response.value === undefined) {
    Log.error('Cancelled');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for confirmation
 */
export async function promptConfirm(
  message: string,
  initial = true
): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial,
  });

  if (response.value === undefined) {
    Log.error('Cancelled');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for selection
 */
export async function promptSelect<T = string>(
  message: string,
  choices: SelectOption<T>[]
): Promise<T> {
  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices: choices.map((c) => ({
      title: c.title,
      value: c.value,
      description: c.description,
    })),
  });

  if (response.value === undefined) {
    Log.error('Cancelled');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for multi-select
 */
export async function promptMultiSelect<T = string>(
  message: string,
  choices: SelectOption<T>[],
  options: { min?: number; max?: number } = {}
): Promise<T[]> {
  const response = await prompts({
    type: 'multiselect',
    name: 'value',
    message,
    choices: choices.map((c) => ({
      title: c.title,
      value: c.value,
      description: c.description,
    })),
    min: options.min,
    max: options.max,
  });

  if (response.value === undefined) {
    Log.error('Cancelled');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for password/secret
 */
export async function promptPassword(message: string): Promise<string> {
  const response = await prompts({
    type: 'password',
    name: 'value',
    message,
  });

  if (response.value === undefined) {
    Log.error('Cancelled');
    process.exit(1);
  }

  return response.value;
}

/**
 * Prompt for file path
 */
export async function promptFilePath(
  message: string,
  options: {
    initial?: string;
    validate?: (value: string) => boolean | string;
  } = {}
): Promise<string> {
  return promptText(message, options);
}
