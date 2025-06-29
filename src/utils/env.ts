/**
 * Environment variable utility that works in both test and production environments
 */

// Check if we're in a test environment
const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

/**
 * Get environment variable value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not found
 * @returns Environment variable value or default
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  if (isTest) {
    // In test environment, use process.env
    return process.env[key] || defaultValue;
  }

  // In production/development, use import.meta.env
  try {
    // Use dynamic import to avoid Jest parsing issues
    const env = (globalThis as any).import?.meta?.env || {};
    return env[key] || defaultValue;
  } catch {
    // Fallback for environments where import.meta.env is not available
    return defaultValue;
  }
}

/**
 * Check if we're in development mode
 */
export function isDev(): boolean {
  if (isTest) {
    return false;
  }

  try {
    const env = (globalThis as any).import?.meta?.env || {};
    return env.DEV === true;
  } catch {
    return false;
  }
}

/**
 * Check if we're in production mode
 */
export function isProd(): boolean {
  if (isTest) {
    return false;
  }

  try {
    const env = (globalThis as any).import?.meta?.env || {};
    return env.PROD === true;
  } catch {
    return false;
  }
}
