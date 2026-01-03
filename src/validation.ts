/**
 * Platform validation
 * Validates platform selections and provides helpful error messages
 */

export type Platform = 'macos' | 'ios' | 'android' | 'windows' | 'linux';

export const SUPPORTED_PLATFORMS: readonly Platform[] = ['macos'] as const;
export const IMPLEMENTED_PLATFORMS: readonly Platform[] = ['macos'] as const;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePlatforms(platforms: string[]): ValidationResult {
  // Check for unsupported platforms
  const unsupported = platforms.filter(
    p => !(SUPPORTED_PLATFORMS as readonly string[]).includes(p.toLowerCase())
  );
  
  if (unsupported.length > 0) {
    return {
      valid: false,
      error: `Unsupported platforms: ${unsupported.join(', ')}\n` +
             `Currently supported: ${SUPPORTED_PLATFORMS.join(', ')}`,
    };
  }

  // Check for platforms that aren't implemented yet
  const notImplemented = platforms.filter(
    p => !(IMPLEMENTED_PLATFORMS as readonly string[]).includes(p.toLowerCase())
  );
  
  if (notImplemented.length > 0) {
    return {
      valid: false,
      error: `Platform(s) not yet implemented: ${notImplemented.join(', ')}\n` +
             `Currently implemented: ${IMPLEMENTED_PLATFORMS.join(', ')}\n` +
             `These platforms are planned but not yet available.`,
    };
  }

  return { valid: true };
}

export function normalizePlatform(platform: string): Platform | null {
  const normalized = platform.toLowerCase();
  if ((SUPPORTED_PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as Platform;
  }
  return null;
}

