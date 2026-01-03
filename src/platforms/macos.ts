/**
 * macOS platform generator
 * Generates all files needed for a macOS Obsidian application
 */

import { PlatformGenerator, ScaffoldContext, GeneratedFile, PlatformConfig } from './base.js';
import { generateMainCpp } from '../templates/mainCpp.js';
import { generateBuildFile } from '../templates/buildFile.js';
import { generateInfoPlist } from '../templates/infoPlist.js';
import { generateEntitlements } from '../templates/entitlements.js';
import { joinPath, ensureDirectory } from '../utils/fileSystem.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export class MacOSPlatform implements PlatformGenerator {
  getConfig(): PlatformConfig {
    return {
      name: 'macos',
      displayName: 'macOS',
      bundleIdPrefix: 'com.obsidian',
      minimumOsVersion: '26.0',
    };
  }

  async generateFiles(context: ScaffoldContext): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate main.cpp
    files.push({
      path: joinPath(context.appDir, 'main.cpp'),
      content: generateMainCpp(context.appName),
    });

    // Generate BUILD file
    files.push({
      path: joinPath(context.appDir, 'BUILD'),
      content: generateBuildFile(
        context.appName,
        context.executableName,
        context.bundleId,
        this.getConfig().minimumOsVersion!
      ),
    });

    // Generate Info.plist
    files.push({
      path: joinPath(context.appDir, 'Info.plist'),
      content: generateInfoPlist(
        context.appName,
        context.executableName,
        context.bundleId,
        this.getConfig().minimumOsVersion!
      ),
    });

    // Generate entitlements.plist
    files.push({
      path: joinPath(context.appDir, 'entitlements.plist'),
      content: generateEntitlements(),
    });

    // Copy default Obsidian icon from CLI assets to the app
    const currentFileUrl = import.meta.url;
    const currentDir = dirname(fileURLToPath(currentFileUrl));
    const iconSourceDir = path.join(currentDir, '..', '..', 'assets', 'Obsidian.icon');
    const iconDestDir = joinPath(context.appDir, 'Obsidian.icon');
    
    try {
      if (await fs.pathExists(iconSourceDir)) {
        await fs.copy(iconSourceDir, iconDestDir, { overwrite: true });
      }
    } catch (error) {
      // If icon doesn't exist, create empty directory as fallback
      await ensureDirectory(iconDestDir);
    }

    return files;
  }

  getBazelrcConfig(): string {
    return `# macOS platform configuration
build:macos --cpu=darwin_arm64
build:macos --host_cpu=darwin_arm64
build:macos --apple_platform_type=macos
# Apple CC toolchain configuration (required for objc_library targets)
build:macos --apple_crosstool_top=@local_config_apple_cc//:toolchain
build:macos --crosstool_top=@local_config_apple_cc//:toolchain
build:macos --host_crosstool_top=@local_config_apple_cc//:toolchain
`;
  }

  getModuleDependencies(): string[] {
    return [
      'bazel_dep(name = "apple_support", version = "1.24.4")',
      'bazel_dep(name = "rules_apple", version = "4.3.3")',
      'bazel_dep(name = "rules_swift", version = "3.4.1")',
    ];
  }
}

