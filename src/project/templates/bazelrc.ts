/**
 * Generate .bazelrc template
 */

import type { Platform } from '../config.js';

export function generateBazelrc(platforms: Platform[]): string {
  let content = `# Obsydian Application Build Configuration

# Common settings
build --enable_platform_specific_config
common --enable_bzlmod

# C++ settings
build --cxxopt=-std=c++20
build --host_cxxopt=-std=c++20

`;

  if (platforms.includes('macos')) {
    content += `# macOS configuration
build:macos --apple_platform_type=macos
build:macos --cpu=darwin_arm64
build:macos --macos_minimum_os=14.0

`;
  }

  if (platforms.includes('ios')) {
    content += `# iOS configuration
build:ios --apple_platform_type=ios
build:ios --cpu=ios_arm64
build:ios --ios_minimum_os=17.0

# iOS Simulator
build:ios_sim --apple_platform_type=ios
build:ios_sim --cpu=ios_sim_arm64
build:ios_sim --ios_minimum_os=17.0

`;
  }

  return content;
}
