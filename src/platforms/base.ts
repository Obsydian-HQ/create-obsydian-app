/**
 * Base platform interface
 * All platform generators must implement this interface
 */

export interface PlatformConfig {
  name: string;
  displayName: string;
  bundleIdPrefix: string;
  minimumOsVersion?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface ScaffoldContext {
  appName: string;
  appDir: string;
  bundleId: string;
  executableName: string;
  obsidianPath?: string;
}

export interface PlatformGenerator {
  /**
   * Get platform configuration
   */
  getConfig(): PlatformConfig;

  /**
   * Generate all files required for this platform
   */
  generateFiles(context: ScaffoldContext): Promise<GeneratedFile[]>;

  /**
   * Get platform-specific build configuration for .bazelrc
   */
  getBazelrcConfig(): string;

  /**
   * Get platform-specific dependencies for MODULE.bazel
   */
  getModuleDependencies(): string[];
}

