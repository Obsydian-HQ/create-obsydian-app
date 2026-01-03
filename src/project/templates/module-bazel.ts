/**
 * Generate MODULE.bazel template
 */

export function generateModuleBazel(projectName: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/-/g, '_');
  
  return `# ${projectName} - Obsydian Application
module(
    name = "${sanitizedName}",
    version = "1.0.0",
)

# Core build dependencies
bazel_dep(name = "platforms", version = "1.0.0")
bazel_dep(name = "rules_cc", version = "0.2.16")

# Apple platform support
bazel_dep(name = "apple_support", version = "1.24.4")
bazel_dep(name = "rules_apple", version = "4.3.3")

# Obsydian framework
# Option 1: Local development (uncomment and set path)
# local_path_override(
#     module_name = "obsidian",
#     path = "../obsydian",
# )

# Option 2: Git dependency (recommended)
# bazel_dep(name = "obsidian", version = "0.1.0")
# git_override(
#     module_name = "obsidian",
#     remote = "https://github.com/Obsydian-HQ/obsydian.git",
#     commit = "main",
# )

# Apple CC toolchain
apple_cc_configure = use_extension("@apple_support//crosstool:setup.bzl", "apple_cc_configure_extension")
use_repo(apple_cc_configure, "local_config_apple_cc")
register_toolchains("@local_config_apple_cc//:all")
`;
}
