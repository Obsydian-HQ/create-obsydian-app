/**
 * BUILD file template generator
 */

export function generateBuildFile(
  appName: string,
  executableName: string,
  bundleId: string,
  minimumOsVersion: string
): string {
  return `# ${appName} - Obsidian Application
# Minimal app that demonstrates basic Obsidian usage
# This example uses ONLY the public API - no internal headers

load("@rules_apple//apple:macos.bzl", "macos_application")

# C++ library containing main function
# Uses ONLY the public API
cc_library(
    name = "${executableName}_lib",
    srcs = ["main.cpp"],
    hdrs = [],
    copts = ["-std=c++20"],
    deps = [
        "@obsidian//src:obsidian",  # Public API only - no internal dependencies
    ],
)

# macOS application bundle
macos_application(
    name = "${executableName}_app",
    bundle_id = "${bundleId}",
    infoplists = [":Info.plist"],
    minimum_os_version = "${minimumOsVersion}",
    deps = [":${executableName}_lib"],
)

# Also provide a simple binary for command-line testing
cc_binary(
    name = "${executableName}",
    srcs = ["main.cpp"],
    copts = ["-std=c++20"],
    deps = [
        "@obsidian//src:obsidian",  # Public API only
    ],
)
`;
}

