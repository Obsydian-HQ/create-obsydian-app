/**
 * submit command
 * Submit app to TestFlight and App Store
 * 
 * Uses xcrun altool with App Store Connect API key authentication
 * Reference: Apple's altool documentation and Expo EAS CLI
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import Log from '../utils/log.js';
import { exec } from '../utils/exec.js';
import { findProjectRoot, readConfig, type Platform } from '../project/config.js';
import { promptSelect, promptConfirm } from '../utils/prompts.js';

export const submitCommand = new Command('submit')
  .description('Submit your app to TestFlight or App Store')
  .option('-p, --platform <platform>', 'Target platform (macos, ios)')
  .option('--profile <profile>', 'Submit profile from obsydian.json', 'production')
  .option('--skip-build', 'Skip building and use existing archive')
  .option('--archive-path <path>', 'Path to existing archive')
  .option('--skip-wait', 'Do not wait for processing to complete')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const projectDir = await findProjectRoot();
    if (!projectDir) {
      Log.error('Not in an Obsydian project. Run "obsydian init" first.');
      process.exit(1);
    }

    const config = await readConfig(projectDir);
    
    // Determine platform
    let platform: Platform;
    if (options.platform) {
      platform = options.platform as Platform;
    } else if (config.platforms.length === 1) {
      platform = config.platforms[0];
    } else {
      platform = await promptSelect('Select platform:', 
        config.platforms
          .filter(p => p === 'macos' || p === 'ios')
          .map(p => ({ title: p, value: p }))
      );
    }

    if (platform !== 'macos' && platform !== 'ios') {
      Log.error(`Platform ${platform} does not support App Store submission`);
      process.exit(1);
    }

    const verbose = options.verbose ?? false;

    Log.newLine();
    Log.bold(`📦 Submitting ${config.name} to ${platform === 'ios' ? 'iOS App Store' : 'Mac App Store'}`);
    Log.newLine();

    // Get credentials
    const credentials = await resolveCredentials(projectDir, config, options.profile);
    
    if (!credentials) {
      Log.error('No App Store Connect credentials configured');
      Log.newLine();
      Log.info(`Run ${chalk.cyan('obsydian credentials setup')} to configure credentials`);
      Log.newLine();
      Log.dim('You need an App Store Connect API Key with "Admin" or "App Manager" role');
      Log.dim('Create one at: https://appstoreconnect.apple.com/access/api');
      process.exit(1);
    }

    Log.info(`Using API Key: ${credentials.keyId}`);
    Log.dim(`Issuer: ${credentials.issuerId}`);
    Log.newLine();

    // Ensure the API key is in a location altool can find
    await setupApiKeyForAltool(credentials.keyPath, credentials.keyId);

    // Build archive if needed
    let archivePath = options.archivePath;
    if (!options.skipBuild && !archivePath) {
      archivePath = await buildArchive(projectDir, config.name, platform, verbose);
    }

    if (!archivePath || !await fs.pathExists(archivePath)) {
      Log.error('No archive found. Build one first with "obsydian build --archive"');
      process.exit(1);
    }

    // Export to IPA/PKG
    const exportPath = path.join(projectDir, 'build', 'export');
    await fs.ensureDir(exportPath);
    const exportResult = await exportArchive(
      projectDir, 
      archivePath, 
      exportPath, 
      platform, 
      credentials,
      verbose
    );

    // Upload to App Store Connect (only if not already uploaded during export)
    if (!exportResult.uploadSucceeded) {
      await uploadToAppStoreConnect(
        exportPath,
        config.name,
        platform,
        credentials,
        !options.skipWait,
        verbose
      );
    } else {
      Log.newLine();
      Log.success('✅ Upload to App Store Connect succeeded during export!');
      Log.dim('No manual upload needed - xcodebuild uploaded directly.');
    }

    Log.newLine();
    Log.success('🎉 App submitted successfully!');
    Log.newLine();
    Log.log('Your app is being processed by App Store Connect.');
    Log.log('It should appear in TestFlight within a few minutes.');
    Log.newLine();
    Log.dim('View status at: https://appstoreconnect.apple.com');
  });

interface ASCCredentials {
  keyPath: string;
  keyId: string;
  issuerId: string;
}

async function resolveCredentials(
  projectDir: string, 
  config: any, 
  profile: string
): Promise<ASCCredentials | null> {
  // First check project config
  const submitProfile = config.submit?.[profile];
  if (submitProfile?.ascApiKeyId && submitProfile?.ascApiKeyIssuerId && submitProfile?.ascApiKeyPath) {
    const keyPath = path.isAbsolute(submitProfile.ascApiKeyPath) 
      ? submitProfile.ascApiKeyPath 
      : path.join(projectDir, submitProfile.ascApiKeyPath);
    
    if (await fs.pathExists(keyPath)) {
      return {
        keyPath,
        keyId: submitProfile.ascApiKeyId,
        issuerId: submitProfile.ascApiKeyIssuerId,
      };
    }
  }

  // Fall back to global credentials
  const globalCredPath = path.join(process.env.HOME || '~', '.obsydian', 'credentials.json');
  if (await fs.pathExists(globalCredPath)) {
    try {
      const globalCreds = JSON.parse(await fs.readFile(globalCredPath, 'utf-8'));
      if (globalCreds.appStoreConnect?.keyId && globalCreds.appStoreConnect?.issuerId && globalCreds.appStoreConnect?.keyPath) {
        if (await fs.pathExists(globalCreds.appStoreConnect.keyPath)) {
          return {
            keyPath: globalCreds.appStoreConnect.keyPath,
            keyId: globalCreds.appStoreConnect.keyId,
            issuerId: globalCreds.appStoreConnect.issuerId,
          };
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  return null;
}

/**
 * Set up the API key in a location altool can find it
 * altool looks in: ./private_keys, ~/private_keys, ~/.private_keys, ~/.appstoreconnect/private_keys
 */
async function setupApiKeyForAltool(keyPath: string, keyId: string): Promise<void> {
  const privateKeysDir = path.join(process.env.HOME || '~', '.appstoreconnect', 'private_keys');
  await fs.ensureDir(privateKeysDir);
  
  const targetPath = path.join(privateKeysDir, `AuthKey_${keyId}.p8`);
  
  // Only copy if not already there or different
  if (!await fs.pathExists(targetPath)) {
    await fs.copyFile(keyPath, targetPath);
  } else {
    const existingContent = await fs.readFile(targetPath, 'utf-8');
    const newContent = await fs.readFile(keyPath, 'utf-8');
    if (existingContent !== newContent) {
      await fs.copyFile(keyPath, targetPath);
    }
  }
}

async function buildArchive(
  projectDir: string,
  projectName: string,
  platform: Platform,
  verbose: boolean
): Promise<string> {
  const archiveSpinner = ora('Building archive...').start();
  const buildDir = path.join(projectDir, 'build');
  const archivePath = path.join(buildDir, `${projectName}.xcarchive`);

  try {
    await fs.ensureDir(buildDir);

    const args = [
      '-project', `${projectName}.xcodeproj`,
      '-scheme', projectName,
      '-configuration', 'Release',
      '-archivePath', archivePath,
    ];

    if (platform === 'macos') {
      args.push('-destination', 'platform=macOS,arch=arm64');
      // Framework only supports arm64, force single architecture
      args.push('ONLY_ACTIVE_ARCH=YES');
      args.push('ARCHS=arm64');
    } else {
      args.push('-destination', 'generic/platform=iOS');
    }

    args.push('archive');

    const result = await exec('xcodebuild', args, {
      cwd: projectDir,
      verbose,
    });

    if (result.exitCode !== 0) {
      archiveSpinner.fail('Archive failed');
      if (!verbose) {
        Log.error(result.stderr || result.stdout);
      }
      process.exit(1);
    }

    archiveSpinner.succeed('Archive created!');
    return archivePath;

  } catch (error) {
    archiveSpinner.fail('Archive failed');
    throw error;
  }
}

/**
 * Checks if xcodebuild output indicates a successful upload to App Store Connect
 * When using authentication keys, xcodebuild can upload directly without creating
 * a local file. This function detects that scenario.
 */
function isUploadSuccessful(output: string): boolean {
  const uploadSuccessIndicators = [
    'Upload succeeded',
    'Uploaded ',
    'Progress 100%: Upload succeeded',
    'Progress 100%: Uploaded package is processing',
    'EXPORT SUCCEEDED',
  ];

  return uploadSuccessIndicators.some((indicator) =>
    output.includes(indicator)
  );
}

async function exportArchive(
  projectDir: string,
  archivePath: string,
  exportPath: string,
  platform: Platform,
  credentials: ASCCredentials,
  verbose: boolean
): Promise<{ uploadSucceeded: boolean }> {
  const exportSpinner = ora('Exporting for distribution...').start();

  try {
    // Create export options plist
    const exportOptionsPath = path.join(projectDir, 'build', 'ExportOptions.plist');
    const exportOptions = generateExportOptions(platform);
    await fs.writeFile(exportOptionsPath, exportOptions);

    const args = [
      '-exportArchive',
      '-archivePath', archivePath,
      '-exportPath', exportPath,
      '-exportOptionsPlist', exportOptionsPath,
      '-authenticationKeyPath', credentials.keyPath,
      '-authenticationKeyID', credentials.keyId,
      '-authenticationKeyIssuerID', credentials.issuerId,
      '-allowProvisioningUpdates',
    ];

    const result = await exec('xcodebuild', args, {
      cwd: projectDir,
      verbose,
    });

    if (result.exitCode !== 0) {
      exportSpinner.fail('Export failed');
      const errorOutput = result.stderr || result.stdout || '';
      
      if (!verbose) {
        Log.error(errorOutput);
      }
      
      // Check for bundle identifier reuse error
      if (errorOutput.includes('Error Downloading App Information') || 
          errorOutput.includes('could not find the service record')) {
        Log.newLine();
        Log.error('Bundle identifier issue detected.');
        Log.newLine();
        Log.info('This error typically means:');
        Log.dim('  • The bundle ID was previously used for an app that was removed from App Store Connect');
        Log.dim('  • Bundle identifiers CANNOT be reused - they are permanently tied to the original app');
        Log.dim('  • There is NO waiting period - bundle IDs cannot be reused even after app deletion');
        Log.newLine();
        Log.info('Solution:');
        Log.dim('  1. Create a NEW bundle identifier in Apple Developer Portal');
        Log.dim('  2. Update your app\'s bundle ID in Xcode project settings');
        Log.dim('  3. Create a NEW app in App Store Connect with the new bundle ID');
        Log.dim('  4. Then try submitting again');
        Log.newLine();
        Log.dim('Note: App names can be reused, but bundle IDs and SKUs cannot.');
      } else if (errorOutput.includes('no signing certificate') || errorOutput.includes('Provisioning profile')) {
        Log.newLine();
        Log.info('Code signing issue detected. Make sure:');
        Log.dim('  1. You have an active Apple Developer Program membership');
        Log.dim('  2. Your API key has the right permissions (Admin or App Manager)');
        Log.dim('  3. Your bundle ID is registered in App Store Connect');
        Log.dim('  4. The app record exists in App Store Connect for this bundle ID');
      }
      
      process.exit(1);
    }

    // Check if upload succeeded during export
    const output = result.stdout + result.stderr;
    const uploadSucceeded = isUploadSuccessful(output);

    if (uploadSucceeded) {
      exportSpinner.succeed('Archive exported and uploaded!');
    } else {
      exportSpinner.succeed('Archive exported!');
    }

    return { uploadSucceeded };

  } catch (error) {
    exportSpinner.fail('Export failed');
    throw error;
  }
}

async function uploadToAppStoreConnect(
  exportPath: string,
  projectName: string,
  platform: Platform,
  credentials: ASCCredentials,
  waitForProcessing: boolean,
  verbose: boolean
): Promise<void> {
  const uploadSpinner = ora('Uploading to App Store Connect...').start();

  try {
    // Find the exported file
    const files = await fs.readdir(exportPath);
    let uploadFile: string | undefined;
    
    for (const file of files) {
      if (file.endsWith('.ipa') || file.endsWith('.pkg')) {
        uploadFile = path.join(exportPath, file);
        break;
      }
    }

    // If no IPA/PKG, look for .app and create a package
    if (!uploadFile) {
      for (const file of files) {
        if (file.endsWith('.app')) {
          uploadFile = path.join(exportPath, file);
          break;
        }
      }
    }

    if (!uploadFile) {
      uploadSpinner.fail('No uploadable file found');
      Log.error('Expected .ipa or .pkg file in export directory');
      Log.newLine();
      Log.info('Note: When using authentication keys, xcodebuild may upload directly to App Store Connect');
      Log.info('without creating a local file. Check the export output for "Upload succeeded" messages.');
      process.exit(1);
    }

    Log.dim(`Uploading: ${path.basename(uploadFile)}`);

    // Use xcrun altool for upload
    // The --apiKey flag expects the key ID, and altool will look for the key file
    // in ~/.appstoreconnect/private_keys/AuthKey_<keyId>.p8
    const args = [
      'altool',
      '--upload-app',
      '-f', uploadFile,
      '-t', platform === 'ios' ? 'ios' : 'macos',
      '--apiKey', credentials.keyId,
      '--apiIssuer', credentials.issuerId,
    ];

    // Add --wait flag to wait for processing
    if (waitForProcessing) {
      args.push('--wait');
    }

    const result = await exec('xcrun', args, {
      cwd: exportPath,
      verbose,
    });

    if (result.exitCode !== 0) {
      uploadSpinner.fail('Upload failed');
      if (!verbose) {
        Log.error(result.stderr || result.stdout);
      }
      
      // Provide helpful error messages
      if (result.stderr?.includes('Unable to authenticate')) {
        Log.newLine();
        Log.info('Authentication failed. Make sure:');
        Log.dim('  1. Your API key ID and Issuer ID are correct');
        Log.dim('  2. The API key has "Admin" or "App Manager" role');
        Log.dim('  3. The API key is active in App Store Connect');
      }
      
      if (result.stderr?.includes('could not find the service record')) {
        Log.newLine();
        Log.info('App record not found. Make sure:');
        Log.dim('  1. You have created the app in App Store Connect');
        Log.dim('  2. The bundle ID matches exactly');
      }
      
      process.exit(1);
    }

    uploadSpinner.succeed('Upload complete!');

    // Parse output for build info
    if (result.stdout?.includes('No errors uploading')) {
      Log.newLine();
      Log.success('✅ No errors uploading!');
    }

  } catch (error) {
    uploadSpinner.fail('Upload failed');
    throw error;
  }
}

function generateExportOptions(platform: Platform): string {
  if (platform === 'ios') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>`;
  } else {
    // macOS
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>`;
  }
}
