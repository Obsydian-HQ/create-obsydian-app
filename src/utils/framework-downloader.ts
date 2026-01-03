/**
 * Framework downloader utility
 * Downloads Obsydian XCFrameworks from GitHub Releases
 */

import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import { createHash } from 'crypto';
import Log from './log.js';

// Node.js 18+ has native fetch, which we require per package.json engines
const fetch = globalThis.fetch;

const FRAMEWORKS_REPO = 'Obsydian-HQ/obsydian-frameworks';
const GITHUB_API_BASE = 'https://api.github.com';

export interface FrameworkManifest {
  version: string;
  framework: string;
  download_url: string;
  checksum: string;
  size: number;
  created_at: string;
}

/**
 * Get the latest framework version from GitHub Releases
 */
export async function getLatestFrameworkVersion(): Promise<string> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${FRAMEWORKS_REPO}/releases/latest`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No releases yet - return a default version for development
        Log.warn('No framework releases found. Using development version.');
        return '0.1.0';
      }
      throw new Error(`Failed to fetch latest release: ${response.statusText}`);
    }
    
    const data = await response.json() as { tag_name: string };
    const version = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix
    return version;
  } catch (error: any) {
    Log.warn(`Could not fetch latest framework version: ${error.message}`);
    // Return default version for development/testing
    return '0.1.0';
  }
}

/**
 * Get framework manifest for a specific version
 */
export async function getFrameworkManifest(version: string): Promise<FrameworkManifest> {
  try {
    const url = `https://github.com/${FRAMEWORKS_REPO}/releases/download/v${version}/manifest.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Framework version ${version} not found`);
    }
    
    return await response.json() as FrameworkManifest;
  } catch (error) {
    throw new Error(`Failed to get framework manifest for version ${version}: ${error}`);
  }
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location!, destPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

/**
 * Verify file checksum
 */
async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
  const fileBuffer = await fs.readFile(filePath);
  const hash = createHash('sha256').update(fileBuffer).digest('hex');
  return hash === expectedChecksum;
}

/**
 * Download and extract framework
 */
export async function downloadFramework(
  version: string,
  outputDir: string
): Promise<string> {
  Log.newLine();
  Log.bold(`📦 Downloading Obsydian Framework v${version}...`);
  
  // Get manifest
  const manifest = await getFrameworkManifest(version);
  
  // Create output directory
  await fs.ensureDir(outputDir);
  
  // Download framework zip
  const zipPath = path.join(outputDir, 'Obsydian.xcframework.zip');
  Log.log(`Downloading from: ${manifest.download_url}`);
  
  await downloadFile(manifest.download_url, zipPath);
  
  // Verify checksum
  Log.log('Verifying checksum...');
  const isValid = await verifyChecksum(zipPath, manifest.checksum);
  if (!isValid) {
    await fs.remove(zipPath);
    throw new Error('Framework checksum verification failed');
  }
  
  // Extract zip
  Log.log('Extracting framework...');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  await execAsync(`unzip -q -o "${zipPath}" -d "${outputDir}"`);
  
  // Remove zip file
  await fs.remove(zipPath);
  
  const frameworkPath = path.join(outputDir, 'Obsydian.xcframework');
  
  if (!await fs.pathExists(frameworkPath)) {
    throw new Error('Framework extraction failed - Obsydian.xcframework not found');
  }
  
  Log.success(`Framework installed at: ${frameworkPath}`);
  
  return frameworkPath;
}

/**
 * Get cached framework path (if exists)
 */
export async function getCachedFrameworkPath(version: string): Promise<string | null> {
  const cacheDir = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.obsydian', 'frameworks', version);
  const frameworkPath = path.join(cacheDir, 'Obsydian.xcframework');
  
  if (await fs.pathExists(frameworkPath)) {
    return frameworkPath;
  }
  
  return null;
}

/**
 * Download framework with caching
 */
export async function downloadFrameworkWithCache(
  version: string,
  projectDir: string
): Promise<string> {
  // Check cache first
  const cachedPath = await getCachedFrameworkPath(version);
  if (cachedPath) {
    Log.log(`Using cached framework: ${cachedPath}`);
    // Copy to project
    const projectFrameworkPath = path.join(projectDir, 'Frameworks', 'Obsydian.xcframework');
    await fs.ensureDir(path.dirname(projectFrameworkPath));
    await fs.copy(cachedPath, projectFrameworkPath);
    return projectFrameworkPath;
  }
  
  // Download to cache
  const cacheDir = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.obsydian', 'frameworks', version);
  await fs.ensureDir(cacheDir);
  
  const cachedFrameworkPath = await downloadFramework(version, cacheDir);
  
  // Copy to project
  const projectFrameworkPath = path.join(projectDir, 'Frameworks', 'Obsydian.xcframework');
  await fs.ensureDir(path.dirname(projectFrameworkPath));
  await fs.copy(cachedFrameworkPath, projectFrameworkPath);
  
  return projectFrameworkPath;
}
