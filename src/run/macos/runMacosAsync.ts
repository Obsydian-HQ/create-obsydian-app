import ora from 'ora';

import Log from '../../utils/log.js';
import { exec } from '../../utils/exec.js';
import { buildAsync, getBuiltAppPathFromBuildSettings, showBuildSettingsAsync } from '../../apple/xcodebuild.js';

export type RunMacosOptions = {
  projectName: string;
  configuration: 'Debug' | 'Release';
  buildDir: string;
  verbose: boolean;
};

export async function runMacosAsync(projectDir: string, options: RunMacosOptions): Promise<void> {
  const { projectName, configuration, buildDir, verbose } = options;
  const scheme = projectName;

  const buildSpinner = ora('Building...').start();
  try {
    await buildAsync(
      { projectDir, projectName },
      {
        scheme,
        configuration,
        derivedDataPath: buildDir,
        destination: 'platform=macOS,arch=arm64',
        verbose,
      }
    );
    buildSpinner.succeed('Build succeeded!');
  } catch (error: any) {
    buildSpinner.fail('Build failed');
    if (!verbose) {
      Log.error(error?.message ?? String(error));
    }
    process.exit(1);
  }

  const settings = await showBuildSettingsAsync(
    { projectDir, projectName },
    {
      scheme,
      configuration,
      derivedDataPath: buildDir,
      destination: 'platform=macOS,arch=arm64',
    }
  );

  const appPath = getBuiltAppPathFromBuildSettings(settings);
  if (!appPath) {
    Log.error('Could not determine built app path from Xcode build settings.');
    process.exit(1);
  }

  Log.newLine();
  Log.info(`Running ${appPath}`);
  Log.newLine();

  const result = await exec('open', [appPath], { verbose: true, cwd: projectDir });
  if (result.exitCode !== 0) {
    Log.error('Failed to launch app');
    process.exit(1);
  }
}

