/**
 * Main scaffolding orchestration
 * Coordinates platform generators and file creation
 */

import { ScaffoldContext, type PlatformGenerator } from './platforms/base.js';
import { getPlatformGenerator } from './platforms/index.js';
import { validatePlatforms, normalizePlatform } from './validation.js';
import { generateModuleBazel } from './templates/moduleBazel.js';
import { generateBazelrc } from './templates/bazelrc.js';
import { generateBazelversion } from './templates/bazelversion.js';
import { generateReadme } from './templates/readme.js';
import {
  ensureDirectory,
  writeFile,
  pathExists,
  resolvePath,
  joinPath,
} from './utils/fileSystem.js';
import { detectObsidianPath, calculateRelativePath } from './utils/obsidianDetector.js';
import { generateBundleId, sanitizeExecutableName } from './utils/bundleId.js';
import { generateXcodeProject } from './utils/xcodeProject.js';

export interface ScaffoldOptions {
  appName: string;
  platforms: string[];
}

export interface ScaffoldResult {
  success: boolean;
  appDir: string;
  obsidianPath?: string;
  executableName: string;
}

export async function scaffoldApp(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { appName, platforms } = options;

  // Validate platforms
  const validation = validatePlatforms(platforms);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get platform generators
  const normalizedPlatforms = platforms
    .map(p => normalizePlatform(p))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  
  const platformGenerators: PlatformGenerator[] = [];
  for (const platform of normalizedPlatforms) {
    const generator = getPlatformGenerator(platform);
    if (!generator) {
      throw new Error(`No generator found for platform: ${platform}`);
    }
    platformGenerators.push(generator);
  }

  const appDir = resolvePath(appName);

  // Check if this is already an Obsidian app (has MODULE.bazel)
  const moduleBazelPath = joinPath(appDir, 'MODULE.bazel');
  if (await pathExists(moduleBazelPath)) {
    throw new Error(`Directory "${appName}" already contains an Obsidian app (MODULE.bazel exists)`);
  }

  console.log(`Creating Obsidian app: ${appName}`);
  console.log(`Target platforms: ${platforms.join(', ')}`);
  console.log(`Directory: ${appDir}\n`);

  // Create directory structure
  await ensureDirectory(appDir);

  // Prepare context
  const bundleId = generateBundleId(appName);
  const executableName = sanitizeExecutableName(appName);
  
  // Try to detect Obsidian installation
  const currentDir = process.cwd();
  const obsidianPath = await detectObsidianPath(currentDir);

  const context: ScaffoldContext = {
    appName,
    appDir,
    bundleId,
    executableName,
    obsidianPath,
  };

  // Generate files
  console.log('📝 Generating files...');

  // Generate platform-specific files and collect metadata
  const allGeneratedFiles: Array<{ path: string; content: string }> = [];
  for (const platformGenerator of platformGenerators) {
    const files = await platformGenerator.generateFiles(context);
    for (const file of files) {
      await writeFile(file.path, file.content);
      allGeneratedFiles.push(file);
      const relativePath = calculateRelativePath(appDir, file.path);
      console.log(`  ✓ ${relativePath}`);
    }
  }

  // Generate shared files
  const moduleBazel = generateModuleBazel(appDir, platformGenerators, obsidianPath);
  await writeFile(joinPath(appDir, 'MODULE.bazel'), moduleBazel);
  console.log('  ✓ MODULE.bazel');

  const bazelrc = generateBazelrc(appDir, platformGenerators);
  await writeFile(joinPath(appDir, '.bazelrc'), bazelrc);
  console.log('  ✓ .bazelrc');

  const bazelversion = generateBazelversion();
  await writeFile(joinPath(appDir, '.bazelversion'), bazelversion);
  console.log('  ✓ .bazelversion');

  const readme = generateReadme(appName, platformGenerators);
  await writeFile(joinPath(appDir, 'README.md'), readme);
  console.log('  ✓ README.md');

  // Generate Xcode project for macOS/iOS platforms
  const applePlatforms = normalizedPlatforms.filter(
    (p) => p === 'macos' || p === 'ios'
  );
  
  if (applePlatforms.length > 0) {
    console.log('\n📱 Generating Xcode project...');
    try {
      // Collect source files and Info.plist from already generated files
      const allSourceFiles = allGeneratedFiles
        .filter((file) => file.path.endsWith('.cpp') || file.path.endsWith('.c'))
        .map((file) => file.path);

      const infoPlistFile = allGeneratedFiles.find((file) =>
        file.path.endsWith('Info.plist')
      );
      const entitlementsFile = allGeneratedFiles.find((file) =>
        file.path.endsWith('entitlements.plist')
      );
      
      // Check if icon directory exists
      const iconPath = joinPath(appDir, 'Obsidian.icon');
      const iconExists = await pathExists(iconPath);

      if (infoPlistFile && allSourceFiles.length > 0) {
        const xcodeProjectPath = await generateXcodeProject({
          appName,
          appDir,
          bundleId,
          executableName,
          minimumOsVersion: platformGenerators[0].getConfig().minimumOsVersion || '26.0',
          sourceFiles: allSourceFiles,
          infoPlistPath: infoPlistFile.path,
          entitlementsPath: entitlementsFile?.path,
          iconPath: iconExists ? iconPath : undefined,
          obsidianPath: context.obsidianPath,
        });
        const relativeXcodePath = calculateRelativePath(appDir, xcodeProjectPath);
        console.log(`  ✓ ${relativeXcodePath}`);
        console.log('\n✨ Xcode project ready! Open it in Xcode to build and archive.');
      }
    } catch (error) {
      console.warn(
        `  ⚠️  Warning: Failed to generate Xcode project: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      console.warn('  You can still use Bazel to build the app.');
    }
  }

  console.log('\n✅ Obsidian app created successfully!');

  return {
    success: true,
    appDir,
    obsidianPath,
    executableName,
  };
}

