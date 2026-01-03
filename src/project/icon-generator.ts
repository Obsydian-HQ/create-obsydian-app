/**
 * Generate placeholder app icon
 * Creates a simple icon and Assets.xcassets structure for App Store submission
 */

import fs from 'fs-extra';
import path from 'path';
import { exec } from '../utils/exec.js';

/**
 * Generate a simple placeholder icon using macOS built-in tools
 * Creates Assets.xcassets/AppIcon.appiconset with all required sizes
 */
export async function generatePlaceholderIcon(projectDir: string, projectName: string): Promise<void> {
  const assetsDir = path.join(projectDir, 'Assets.xcassets', 'AppIcon.appiconset');
  await fs.ensureDir(assetsDir);

  // Create Contents.json for the asset catalog
  const contentsJson = {
    images: [
      {
        filename: 'icon_512x512@2x.png',
        idiom: 'mac',
        scale: '2x',
        size: '512x512',
      },
      {
        filename: 'icon_512x512.png',
        idiom: 'mac',
        scale: '1x',
        size: '512x512',
      },
      {
        filename: 'icon_256x256@2x.png',
        idiom: 'mac',
        scale: '2x',
        size: '256x256',
      },
      {
        filename: 'icon_256x256.png',
        idiom: 'mac',
        scale: '1x',
        size: '256x256',
      },
      {
        filename: 'icon_128x128@2x.png',
        idiom: 'mac',
        scale: '2x',
        size: '128x128',
      },
      {
        filename: 'icon_128x128.png',
        idiom: 'mac',
        scale: '1x',
        size: '128x128',
      },
      {
        filename: 'icon_32x32@2x.png',
        idiom: 'mac',
        scale: '2x',
        size: '32x32',
      },
      {
        filename: 'icon_32x32.png',
        idiom: 'mac',
        scale: '1x',
        size: '32x32',
      },
      {
        filename: 'icon_16x16@2x.png',
        idiom: 'mac',
        scale: '2x',
        size: '16x16',
      },
      {
        filename: 'icon_16x16.png',
        idiom: 'mac',
        scale: '1x',
        size: '16x16',
      },
    ],
    info: {
      author: 'xcode',
      version: 1,
    },
  };

  await fs.writeFile(
    path.join(assetsDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2) + '\n'
  );

  // Generate placeholder PNGs
  await generateIconPNGs(assetsDir, projectName);
}

/**
 * Generate placeholder PNG icons
 * Uses a simple approach: create a colored square using sips
 */
async function generateIconPNGs(assetsDir: string, projectName: string): Promise<void> {
  // Create a 1024x1024 blue square using sips
  // First, create a 1x1 pixel PNG, then resize and color it
  const tempPng = path.join(assetsDir, 'temp-icon-1024.png');
  
  try {
    // Method 1: Use sips to create a colored square
    // Create a temporary 1x1 PNG first
    const temp1x1 = path.join(assetsDir, 'temp-1x1.png');
    
    // Create a minimal valid 1x1 PNG (blue pixel)
    // Base64: 1x1 blue PNG
    const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const Buffer = (await import('buffer')).Buffer;
    const minimalPng = Buffer.from(minimalPngBase64, 'base64');
    await fs.writeFile(temp1x1, minimalPng);
    
    // Resize to 1024x1024 with blue padding
    await exec('sips', [
      '-z', '1024', '1024',
      '--padToHeightWidth', '1024', '1024',
      '--padColor', '007AFF',
      temp1x1,
      '--out', tempPng
    ], {
      cwd: assetsDir,
      silent: true,
    });
    
    await fs.remove(temp1x1);
  } catch {
    // Fallback: Use Python with PIL if available
    await createIconWithPython(assetsDir, tempPng, projectName);
  }

  // Resize to all required sizes using sips
  const sizes = [
    { size: 1024, name: 'icon_512x512@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 16, name: 'icon_16x16.png' },
  ];

  for (const { size, name } of sizes) {
    const outputPath = path.join(assetsDir, name);
    try {
      await exec('sips', ['-z', size.toString(), size.toString(), tempPng, '--out', outputPath], {
        cwd: assetsDir,
        silent: true,
      });
    } catch {
      // If resize fails, just copy (will be wrong size but valid PNG)
      await fs.copyFile(tempPng, outputPath);
    }
  }

  // Clean up
  await fs.remove(tempPng);
}

/**
 * Fallback: Create icon using Python with PIL
 */
async function createIconWithPython(assetsDir: string, outputPath: string, projectName: string): Promise<void> {
  const initial = projectName.charAt(0).toUpperCase();
  const pythonScript = `from PIL import Image, ImageDraw, ImageFont
size = 1024
img = Image.new('RGB', (size, size), color='#007AFF')
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([(0, 0), (size, size)], radius=180, fill='#007AFF')
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 400)
except:
    font = ImageFont.load_default()
bbox = draw.textbbox((0, 0), '${initial}', font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = (size - text_width) // 2
y = (size - text_height) // 2 - 50
draw.text((x, y), '${initial}', fill='white', font=font)
img.save('${outputPath}')
`;

  try {
    const scriptPath = path.join(assetsDir, 'gen_icon.py');
    await fs.writeFile(scriptPath, pythonScript);
    await exec('python3', [scriptPath], { cwd: assetsDir, silent: true });
    await fs.remove(scriptPath);
  } catch {
    // Ultimate fallback: Create minimal valid PNGs
    // Just copy a minimal PNG to all sizes (will be tiny but valid)
    const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const Buffer = (await import('buffer')).Buffer;
    const minimalPng = Buffer.from(minimalPngBase64, 'base64');
    await fs.writeFile(outputPath, minimalPng);
  }
}
