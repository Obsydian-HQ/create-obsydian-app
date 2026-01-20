/**
 * Interactive CLI menu.
 *
 * This is intentionally "prompt-driven" (like Expo/EAS) rather than a full-screen TUI,
 * so it works reliably in standard terminals while still being discoverable.
 */

import { spawn } from 'child_process';
import { constants } from 'os';
import chalk from 'chalk';
import prompts from 'prompts';

import Log from '../utils/log.js';
import { findProjectRoot } from '../project/config.js';
import { runRunOnPhysicalIosDeviceFlowAsync } from './flows/runOnPhysicalIosDevice.js';

type SelectChoice<T> = {
  title: string;
  value: T;
  description?: string;
  disabled?: boolean;
};

type Page = 'main' | 'project' | 'buildRun' | 'release' | 'tools' | 'help';

type MenuAction =
  | { type: 'page'; page: Page }
  | { type: 'run'; argv: string[] }
  | { type: 'flow'; id: 'runOnPhysicalIosDevice' }
  | { type: 'exit' };

function isInteractiveTty(): boolean {
  return !!process.stdin.isTTY && !!process.stdout.isTTY;
}

function exitWithSigint(): never {
  // 130 is the conventional exit code for Ctrl+C.
  process.exit(constants.signals.SIGINT + 128);
}

let sigintHandlerInstalled = false;
function installSigintExitHandlerOnce(): void {
  if (sigintHandlerInstalled) return;
  sigintHandlerInstalled = true;
  // If stdin is in cooked mode, Ctrl+C triggers SIGINT.
  process.on('SIGINT', () => exitWithSigint());

  // In raw mode (used by prompts), Ctrl+C does NOT raise SIGINT.
  // We detect the raw byte (\u0003) and exit immediately.
  if (process.stdin.isTTY) {
    const onData = (chunk: Buffer | string) => {
      const s = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      if (s.includes('\u0003')) {
        exitWithSigint();
      }
    };
    process.stdin.on('data', onData);
  }
}

async function selectAsync<T>(
  message: string,
  choices: Array<SelectChoice<T>>,
  initial = 0
): Promise<T | null> {
  if (!isInteractiveTty()) {
    Log.error('Interactive mode requires a TTY (interactive terminal).');
    Log.dim('Tip: run a specific command like `obsydian init`, or pass `--help`.');
    process.exit(1);
  }

  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices,
    initial,
  });

  // In menu mode, cancellation (Esc) acts like "Back".
  // Ctrl+C is handled via SIGINT and exits the menu.
  if (response.value === undefined) {
    return null;
  }

  return response.value as T;
}

async function pressAnyKeyToContinueAsync(message = 'Press any key to return to the menu…'): Promise<void> {
  if (!isInteractiveTty()) return;

  Log.newLine();
  Log.dim(message);

  const stdin = process.stdin;
  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  await new Promise<void>((resolve) => {
    const onData = (key: string) => {
      // Ctrl+C
      if (key === '\u0003') {
        exitWithSigint();
      }
      resolve();
    };
    stdin.once('data', onData);
  });

  stdin.setRawMode(false);
  stdin.pause();
}

function formatCommand(argv: string[]): string {
  const parts = ['obsydian', ...argv].map((p) => (p.includes(' ') ? JSON.stringify(p) : p));
  return parts.join(' ');
}

async function confirmRunAsync(argv: string[]): Promise<boolean> {
  const cmd = formatCommand(argv);
  const choice = await selectAsync<'run' | 'back'>('Confirm', [
    { title: `Run: ${chalk.cyan(cmd)}`, value: 'run' },
    { title: 'Back', value: 'back' },
  ]);
  return choice === 'run';
}

async function runSelfAsync(argv: string[]): Promise<number> {
  const node = process.execPath;
  const script = process.argv[1];

  return await new Promise<number>((resolve, reject) => {
    const child = spawn(node, [script, ...argv], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (err) => reject(err));
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

function renderHeader(inProject: boolean, projectDir: string | null): void {
  Log.newLine();
  Log.bold(chalk.bold('Obsydian'));
  if (inProject && projectDir) {
    Log.dim(`Project: ${chalk.cyan(projectDir)}`);
  } else {
    Log.dim('Not in an Obsydian project directory.');
  }
  Log.dim('Tip: use ↑/↓ + Enter. Esc = back. Ctrl+C = exit.');
  Log.newLine();
}

function clearScreen(): void {
  if (!process.stdout.isTTY) return;
  // Clear screen + move cursor to top-left.
  process.stdout.write('\x1b[2J\x1b[H');
}

async function promptMainAsync(inProject: boolean): Promise<MenuAction> {
  const choices: Array<SelectChoice<MenuAction>> = [
    { title: 'Project', description: 'Create a new app', value: { type: 'page', page: 'project' } },
  ];

  if (inProject) {
    choices.push(
      { title: 'Build & Run', description: 'Build and run locally', value: { type: 'page', page: 'buildRun' } },
      { title: 'Release', description: 'Credentials and TestFlight/App Store', value: { type: 'page', page: 'release' } }
    );
  }

  choices.push(
    { title: 'Tools', description: 'Framework, iOS simulator, Xcode utilities', value: { type: 'page', page: 'tools' } },
    { title: 'Help', description: 'Docs and command help', value: { type: 'page', page: 'help' } },
    { title: 'Exit', value: { type: 'exit' } }
  );

  // Esc on the main screen should not exit; it just keeps you here.
  return (await selectAsync<MenuAction>('What do you want to do?', choices)) ?? { type: 'page', page: 'main' };
}

async function promptProjectAsync(): Promise<MenuAction> {
  const action = await selectAsync<MenuAction>('Project', [
    { title: 'Create a new app (init)', description: 'Generate a new Obsydian project', value: { type: 'run', argv: ['init'] } },
    { title: 'Back', value: { type: 'page', page: 'main' } },
  ]);
  return action ?? { type: 'page', page: 'main' };
}

async function promptBuildRunAsync(): Promise<MenuAction> {
  return (
    (await selectAsync<MenuAction>('Build & Run', [
    { title: 'Build', description: 'Compile with xcodebuild', value: { type: 'run', argv: ['build'] } },
    { title: 'Run', description: 'Run locally (macOS or iOS Simulator)', value: { type: 'run', argv: ['run'] } },
    { title: 'Run (macOS)', description: 'Build and open the macOS app', value: { type: 'run', argv: ['run', '--platform', 'macos'] } },
    {
      title: 'Run on physical iOS device (guided)',
      description: 'Pick device + config + signing, then run',
      value: { type: 'flow', id: 'runOnPhysicalIosDevice' },
    },
    {
      title: 'Run on physical iOS device (Xcode, allow provisioning)',
      description: 'Same, but lets Xcode manage signing + register devices if needed',
      value: {
        type: 'run',
        argv: [
          'xcode',
          'run',
          '--platform',
          'ios',
          '--device',
          '--allow-provisioning-updates',
          '--allow-provisioning-device-registration',
        ],
      },
    },
    { title: 'Back', value: { type: 'page', page: 'main' } },
  ])) ?? { type: 'page', page: 'main' }
  );
}

async function promptReleaseAsync(): Promise<MenuAction> {
  return (
    (await selectAsync<MenuAction>('Release', [
    { title: 'Credentials: setup', description: 'Configure App Store Connect API key', value: { type: 'run', argv: ['credentials', 'setup'] } },
    { title: 'Credentials: show', description: 'Show configured credentials', value: { type: 'run', argv: ['credentials', 'show'] } },
    { title: 'Submit', description: 'Submit to TestFlight/App Store', value: { type: 'run', argv: ['submit'] } },
    { title: 'Back', value: { type: 'page', page: 'main' } },
  ])) ?? { type: 'page', page: 'main' }
  );
}

async function promptToolsAsync(inProject: boolean): Promise<MenuAction> {
  const choices: Array<SelectChoice<MenuAction>> = [];

  if (inProject) {
    choices.push(
      { title: 'Framework: version', description: 'Show current framework version', value: { type: 'run', argv: ['framework', 'version'] } },
      { title: 'Framework: update', description: 'Update to latest framework', value: { type: 'run', argv: ['framework', 'update'] } }
    );
  }

  choices.push(
    { title: 'iOS: simulators', description: 'List iOS simulators', value: { type: 'run', argv: ['ios', 'simulators'] } },
    { title: 'iOS: open', description: 'Boot and open a simulator', value: { type: 'run', argv: ['ios', 'open'] } },
    { title: 'Xcode: schemes', description: 'List schemes in current Xcode project', value: { type: 'run', argv: ['xcode', 'schemes'] } },
    { title: 'Xcode: devices', description: 'List connected physical iOS devices', value: { type: 'run', argv: ['xcode', 'devices'] } },
    { title: 'Xcode: run (macOS)', description: 'Build + run the macOS app for this Xcode project', value: { type: 'run', argv: ['xcode', 'run', '--platform', 'macos'] } },
    {
      title: 'Xcode: run (physical iOS device)',
      description: 'Build + install + launch on a connected device',
      value: { type: 'run', argv: ['xcode', 'run', '--platform', 'ios', '--device'] },
    },
    { title: 'Back', value: { type: 'page', page: 'main' } }
  );

  return (await selectAsync<MenuAction>('Tools', choices)) ?? { type: 'page', page: 'main' };
}

async function promptHelpAsync(): Promise<MenuAction> {
  return (
    (await selectAsync<MenuAction>('Help', [
    { title: 'Show CLI help', value: { type: 'run', argv: ['--help'] } },
    { title: 'Show init help', value: { type: 'run', argv: ['init', '--help'] } },
    { title: 'Show build help', value: { type: 'run', argv: ['build', '--help'] } },
    { title: 'Show run help', value: { type: 'run', argv: ['run', '--help'] } },
    { title: 'Back', value: { type: 'page', page: 'main' } },
  ])) ?? { type: 'page', page: 'main' }
  );
}

export async function runInteractiveMenuAsync(): Promise<void> {
  if (!isInteractiveTty()) {
    Log.error('Interactive menu requires an interactive terminal (TTY).');
    Log.dim('Run `obsydian --help` to see available commands.');
    process.exit(1);
  }

  installSigintExitHandlerOnce();

  let page: Page = 'main';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const projectDir = await findProjectRoot();
    const inProject = !!projectDir;

    clearScreen();
    renderHeader(inProject, projectDir);

    let action: MenuAction;
    switch (page) {
      case 'main':
        action = await promptMainAsync(inProject);
        break;
      case 'project':
        action = await promptProjectAsync();
        break;
      case 'buildRun':
        if (!inProject) {
          page = 'main';
          continue;
        }
        action = await promptBuildRunAsync();
        break;
      case 'release':
        if (!inProject) {
          page = 'main';
          continue;
        }
        action = await promptReleaseAsync();
        break;
      case 'tools':
        action = await promptToolsAsync(inProject);
        break;
      case 'help':
        action = await promptHelpAsync();
        break;
      default:
        action = { type: 'page', page: 'main' };
        break;
    }

    if (action.type === 'exit') {
      Log.newLine();
      return;
    }

    if (action.type === 'page') {
      page = action.page;
      continue;
    }

    if (action.type === 'flow') {
      const returnPage = page;
      if (action.id === 'runOnPhysicalIosDevice') {
        const argv = await runRunOnPhysicalIosDeviceFlowAsync();
        if (!argv) {
          // User backed out of the flow.
          continue;
        }

        const ok = await confirmRunAsync(argv);
        if (!ok) {
          continue;
        }

        const code = await runSelfAsync(argv);
        if (code !== 0) {
          Log.newLine();
          Log.warn(`Command exited with code ${code}`);
        }
        await pressAnyKeyToContinueAsync();
        page = returnPage;
        continue;
      }

      page = returnPage;
      continue;
    }

    if (action.type === 'run') {
      const returnPage = page;
      const ok = await confirmRunAsync(action.argv);
      if (!ok) {
        // Stay on the same page.
        continue;
      }

      const code = await runSelfAsync(action.argv);
      if (code !== 0) {
        Log.newLine();
        Log.warn(`Command exited with code ${code}`);
      }
      await pressAnyKeyToContinueAsync();
      page = returnPage;
    }
  }
}

