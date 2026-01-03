/**
 * Generate BUILD file template
 */

export function generateBuildFile(projectName: string, bundleId: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/-/g, '_');
  
  return `# ${projectName} - Obsydian Application

load("@rules_cc//cc:defs.bzl", "cc_binary")
load("@rules_apple//apple:macos.bzl", "macos_application")

package(default_visibility = ["//visibility:public"])

# Main executable
cc_binary(
    name = "${sanitizedName}",
    srcs = ["main.cpp"],
    # deps = ["@obsidian//src:obsidian_impl"],  # Uncomment when obsidian dependency is configured
)

# macOS Application bundle
macos_application(
    name = "${sanitizedName}_app",
    bundle_id = "${bundleId}",
    bundle_name = "${projectName}",
    infoplists = ["Info.plist"],
    minimum_os_version = "14.0",
    deps = [":${sanitizedName}"],
)
`;
}
