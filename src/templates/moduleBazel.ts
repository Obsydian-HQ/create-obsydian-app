/**
 * MODULE.bazel template generator
 */

import { getBasename } from '../utils/fileSystem.js';
import { calculateRelativePath } from '../utils/obsidianDetector.js';
import { sanitizeModuleName } from '../utils/bundleId.js';
import type { PlatformGenerator } from '../platforms/base.js';

export function generateModuleBazel(
  appDir: string,
  platforms: PlatformGenerator[],
  obsidianPath?: string
): string {
  const appDirName = getBasename(appDir);
  const moduleName = sanitizeModuleName(appDirName);
  
  // Collect all unique module dependencies from platforms
  const moduleDeps = new Set<string>();
  const hasApplePlatform = platforms.some(p => p.getConfig().name === 'macos' || p.getConfig().name === 'ios');
  for (const platform of platforms) {
    for (const dep of platform.getModuleDependencies()) {
      moduleDeps.add(dep);
    }
  }
  
  // Separate Apple dependencies (must come before rules_cc for toolchain precedence)
  const appleDeps = Array.from(moduleDeps).filter(dep => 
    dep.includes('apple_support') || dep.includes('rules_apple') || dep.includes('rules_swift')
  );
  const otherDeps = Array.from(moduleDeps).filter(dep => 
    !dep.includes('apple_support') && !dep.includes('rules_apple') && !dep.includes('rules_swift')
  );

  // Generate Obsidian dependency configuration
  let obsidianDep = '';
  if (obsidianPath) {
    const relativePath = calculateRelativePath(appDir, obsidianPath);
    obsidianDep = `# Obsidian framework dependency (local development)
# bazel_dep must be declared before local_path_override
bazel_dep(name = "obsidian", version = "0.1.0")
# Using local_path_override to point to local Obsidian installation
local_path_override(
    module_name = "obsidian",
    path = "${relativePath}",
)
`;
  } else {
    obsidianDep = `# Obsidian framework dependency
# Option 1: Use local_path_override for local development
# Uncomment and update the path to point to your Obsidian directory:
# bazel_dep(name = "obsidian", version = "0.1.0")
# local_path_override(
#     module_name = "obsidian",
#     path = "../Obsidian",
# )
#
# Option 2: Use bazel_dep once Obsidian is published to a registry:
# bazel_dep(name = "obsidian", version = "0.1.0")
`;
  }

  return `# ${appDirName} - Obsidian Application
# Bazel module configuration

module(
    name = "${moduleName}",
    version = "0.1.0",
    compatibility_level = 1,
)

# Bazel version requirement
bazel_dep(name = "platforms", version = "1.0.0")

${hasApplePlatform ? `# Apple platform support (must come BEFORE rules_cc for toolchain precedence)
${appleDeps.join('\n')}
` : ''}
# C/C++ support
bazel_dep(name = "rules_cc", version = "0.2.16")
${otherDeps.length > 0 ? `${otherDeps.join('\n')}\n` : ''}
${hasApplePlatform ? `# Apple CC toolchain setup (required for objc_library targets)
# This must be set up BEFORE local_path_override so toolchain is available to dependencies
# This exposes the local_config_apple_cc repository needed for Apple platform builds
apple_cc_configure = use_extension("@apple_support//crosstool:setup.bzl", "apple_cc_configure_extension")
use_repo(apple_cc_configure, "local_config_apple_cc")
# Register the Apple CC toolchains
register_toolchains("@local_config_apple_cc//:all")
` : ''}
${obsidianDep}
`;
}

