# App Icon Setup with Icon Composer

## Overview

macOS 26 introduces Icon Composer, a new Apple primitive for app icons that automatically handles all sizes for all devices. Instead of managing multiple icon sizes manually, you create a single `.icon` file that contains vector-based layers and the system generates all required sizes automatically.

## How It Works

### Icon Composer Format

Icon Composer uses a `.icon` directory (package) that contains:
- `icon.json` - Configuration file defining layers, appearances, and platform support
- `Assets/` - Directory containing SVG or PNG assets referenced in `icon.json`

The `.icon` file format supports:
- **Multiple appearances**: Light, dark, and tinted modes
- **Liquid Glass effects**: Translucent materials that adapt to the environment
- **Vector graphics**: SVG-based assets that scale perfectly
- **Automatic sizing**: The system generates all required sizes (16pt to 1024pt) automatically

### Key Benefits

1. **One file for all sizes**: No need to create separate images for each icon size
2. **Automatic platform support**: Works across macOS, iOS, iPadOS, watchOS, and tvOS
3. **Dynamic appearance**: Icons adapt to light/dark mode and system tinting
4. **Modern design**: Supports Liquid Glass design language introduced in macOS 26

## CLI Configuration

When you create a new Obsidian app using the CLI, the following is automatically configured:

### 1. Icon File Structure

The CLI includes a default `Obsidian.icon` directory in `cli/assets/` that gets copied to your app directory. This icon contains:
- A default sparkle icon design
- Support for light and dark appearances
- Proper platform configuration for macOS

### 2. Xcode Project Configuration

The generated Xcode project is configured with:

#### File Reference
- **Type**: `folder.iconcomposer.icon`
- **Location**: Added to the main project group
- **Build Phase**: Added to Resources build phase

#### Build Settings
- `ASSETCATALOG_COMPILER_APPICON_NAME`: Set to the icon name (e.g., "Obsidian")
- `INFOPLIST_ENABLE_CFBUNDLEICONS_MERGE`: Set to `YES`
- `CFBundleIconFile`: Set in `Info.plist` to reference the icon (without `.icon` extension)

### 3. Build Process

During the build process:
1. Xcode processes the `.icon` file using `actool` (Asset Catalog Tool)
2. `actool` generates the required ICNS format internally for App Store validation
3. The `.icon` file is copied to the app bundle's Resources folder
4. The system uses the `.icon` file for display, automatically generating all sizes

## Customizing Your Icon

### Using Icon Composer App

1. Open **Icon Composer** (located in `/Applications/Xcode.app/Contents/Applications/Icon Composer.app`)
2. Create a new icon or open an existing `.icon` file
3. Add layers using SVG or PNG assets
4. Configure appearances (light, dark, tinted)
5. Set translucency and shadow effects
6. Export the `.icon` file

### Replacing the Default Icon

To use your own icon:

1. Create your `.icon` file using Icon Composer
2. Replace the `Obsidian.icon` directory in your app's root directory
3. Update `Info.plist` if your icon has a different name:
   ```xml
   <key>CFBundleIconFile</key>
   <string>YourIconName</string>
   ```
4. Update the Xcode project's `ASSETCATALOG_COMPILER_APPICON_NAME` build setting to match

### Icon Requirements

For App Store submission, ensure your `.icon` file:
- Contains assets that can render at 512pt @2x (1024x1024 pixels) resolution
- Supports the required appearances (light/dark mode)
- Uses the squircle shape (macOS 26 enforces uniform icon shape)
- Includes proper platform configuration in `icon.json`

## Technical Details

### icon.json Structure

The `icon.json` file defines:
- **Fill**: Base fill style (e.g., "system-light")
- **Groups**: Layer groups with:
  - **Layers**: Individual image layers with positions and scales
  - **Fill specializations**: Different fills for different appearances
  - **Image name specializations**: Different images for light/dark modes
- **Shadow**: Shadow configuration
- **Translucency**: Glass effect settings
- **Supported platforms**: Which platforms the icon supports

### Build Settings Explained

- **`ASSETCATALOG_COMPILER_APPICON_NAME`**: Tells `actool` which icon to process. Must match the icon name (without `.icon` extension).
- **`INFOPLIST_ENABLE_CFBUNDLEICONS_MERGE`**: Enables automatic merging of icon information into Info.plist.
- **`CFBundleIconFile`**: Info.plist key that references the icon file name (without extension).

### Why actool Processes .icon Files

Xcode processes `.icon` files with `actool` (Asset Catalog Tool) to:
1. Validate the icon structure
2. Generate internal ICNS format for App Store validation
3. Optimize assets for different platforms
4. Create the final icon representation

This is expected behavior and required for proper App Store submission.

## Troubleshooting

### App Store Validation Error: "Missing required icon"

If you see this error:
1. Verify `ASSETCATALOG_COMPILER_APPICON_NAME` matches your icon name
2. Check that `CFBundleIconFile` in Info.plist matches (without `.icon` extension)
3. Ensure your `.icon` file contains assets that can render at 1024x1024 resolution
4. Verify the icon is in the Resources build phase

### Icon Not Displaying in Finder/Dock

1. Check that `CFBundleIconFile` is set correctly in Info.plist
2. Verify the `.icon` file is in the app bundle's Resources folder
3. Rebuild and clean the project
4. Restart Finder: `killall Finder`

### Build Errors with actool

If `actool` fails:
1. Verify the `.icon` file structure is valid
2. Check that all referenced assets exist in the `Assets/` directory
3. Validate `icon.json` syntax
4. Ensure the icon name doesn't contain special characters

## Migration from ICNS

If you have an existing `.icns` file:
1. Open Icon Composer
2. Import your existing icon or create a new one
3. Export as `.icon` format
4. Replace the old `.icns` reference in your project
5. Update build settings as described above

## Resources

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/foundations/app-icons/)
- [Icon Composer Documentation](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer)
- [macOS 26 Release Notes](https://developer.apple.com/documentation/macos-release-notes/macos-26-release-notes)

## Summary

The Obsidian CLI automatically configures Icon Composer `.icon` files for your app. The setup includes:
- ✅ Default icon included in generated apps
- ✅ Proper Xcode project configuration
- ✅ Correct build settings for App Store validation
- ✅ Info.plist configuration

You can customize the icon by replacing the `Obsidian.icon` directory with your own Icon Composer file, or modify the existing one using the Icon Composer app.

