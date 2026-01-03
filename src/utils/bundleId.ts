/**
 * Bundle ID utilities
 * Generates valid bundle identifiers for different platforms
 */

export function generateBundleId(appName: string, prefix = 'com.obsidian'): string {
  const sanitized = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}.${sanitized}`;
}

export function sanitizeExecutableName(appName: string): string {
  return appName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Sanitize module name for Bazel
 * Bazel module names must:
 * 1. Only contain lowercase letters (a-z), digits (0-9), dots (.), hyphens (-), and underscores (_)
 * 2. Begin with a lowercase letter
 * 3. End with a lowercase letter or digit
 */
export function sanitizeModuleName(appName: string): string {
  // Convert to lowercase and replace invalid characters with hyphens
  let sanitized = appName.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  
  // Ensure it starts with a lowercase letter
  if (!/^[a-z]/.test(sanitized)) {
    sanitized = 'app-' + sanitized;
  }
  
  // Ensure it ends with a lowercase letter or digit
  if (!/[a-z0-9]$/.test(sanitized)) {
    sanitized = sanitized.replace(/[^a-z0-9]+$/, '');
    if (sanitized.length === 0) {
      sanitized = 'app';
    }
  }
  
  // Remove consecutive hyphens/dots/underscores
  sanitized = sanitized.replace(/[-._]{2,}/g, '-');
  
  return sanitized;
}

