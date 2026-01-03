/**
 * .bazelrc template generator
 */

import { getBasename } from '../utils/fileSystem.js';
import type { PlatformGenerator } from '../platforms/base.js';

export function generateBazelrc(appDir: string, platforms: PlatformGenerator[]): string {
  const appName = getBasename(appDir);
  
  // Collect all platform-specific bazelrc configs
  const platformConfigs = platforms.map(platform => platform.getBazelrcConfig()).join('\n');

  return `# ${appName} - Bazel Configuration

# Common build options
build --incompatible_use_python_toolchains
build --enable_platform_specific_config
build --experimental_platform_in_output_dir

# C/C++ compilation settings
build --cxxopt=-std=c++20
build --copt=-Wall
build --copt=-Wextra

# Build performance
build --jobs=8
build --loading_phase_threads=8

${platformConfigs}
`;
}

