/**
 * README.md template generator
 */

import { sanitizeExecutableName } from '../utils/bundleId.js';
import type { PlatformGenerator } from '../platforms/base.js';

export function generateReadme(
  appName: string,
  platforms: PlatformGenerator[]
): string {
  const executableName = sanitizeExecutableName(appName);
  const platformNames = platforms.map(p => p.getConfig().displayName).join(', ');
  const buildConfigs = platforms.map(p => `--config=${p.getConfig().name}`).join(' ');

  return `# ${appName}

An Obsidian application created with \`create-obsidian-app\`.

## Prerequisites

- Bazel 8.5.0+
${platforms.some(p => p.getConfig().name === 'macos' || p.getConfig().name === 'ios') ? '- Xcode (for Apple platform development)\n' : ''}${platforms.some(p => p.getConfig().name === 'android') ? '- Android NDK (for Android development)\n' : ''}- C++20 compatible compiler

## Building

\`\`\`bash
# Build the application
bazel build //... ${buildConfigs}

# Run the application
bazel run //:${executableName}_app ${buildConfigs}
\`\`\`

## Development

This app uses the public Obsidian API. See the \`main.cpp\` file for the entry point.

## Obsidian Dependency

This app depends on the Obsidian framework. You'll need to configure the dependency in \`MODULE.bazel\`:

1. For local development, uncomment the \`local_path_override\` section and point it to your Obsidian installation
2. Or use a \`git_repository\` to pull from a remote source
3. Or use \`bazel_dep\` once Obsidian is published

## Next Steps

- Customize \`main.cpp\` to build your application
- Add more UI components using the Obsidian API
- Configure additional platforms as they become available

## Supported Platforms

${platformNames}
`;
}

