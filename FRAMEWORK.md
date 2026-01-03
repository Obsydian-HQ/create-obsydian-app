# Obsydian Framework

The Obsydian framework provides cross-platform UI components and APIs for building native applications.

## Overview

The Obsydian CLI is **framework-only** - all apps created with `obsydian init` automatically include the Obsydian framework. This ensures consistency and provides access to all cross-platform UI components.

## Framework Management

### Checking Framework Version

```bash
obsydian framework version
```

Shows the current framework version and checks for updates.

### Updating Framework

```bash
obsydian framework update
```

Updates your project to the latest framework version. The framework is cached locally, so updates are fast.

## Framework API

The Obsydian framework provides a C++ API for building cross-platform native apps:

### Core Classes

- **`obsidian::App`** - Application lifecycle management
- **`obsidian::Window`** - Window creation and management
- **`obsidian::AppCallbacks`** - Application lifecycle callbacks

### UI Components

- **`obsidian::Button`** - Interactive buttons
- **`obsidian::TextField`** - Text input fields
- **`obsidian::TextView`** - Multi-line text display
- **`obsidian::ScrollView`** - Scrollable content areas
- **`obsidian::Table`** - Data tables
- **`obsidian::List`** - List views

### System Integration

- **`obsidian::Process`** - Process execution and management
- **`obsidian::ProcessList`** - System process enumeration

## Usage Example

```cpp
#include <obsidian/obsidian.h>
#import <Cocoa/Cocoa.h>

using namespace obsidian;

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // Initialize Obsydian app
        App app;
        app.initialize();
        
        // Create a window
        Window window;
        window.create(800, 600, "My App");
        window.show();
        
        // Create a button
        Button button;
        button.create("Click Me!", 100, 100, 150, 40);
        button.setOnClick([]() {
            std::cout << "Button clicked!" << std::endl;
        });
        button.addToWindow(window);
        
        // Run the app
        AppCallbacks callbacks;
        callbacks.onInit = []() {
            std::cout << "App initialized!" << std::endl;
        };
        
        app.run(callbacks);
    }
    return 0;
}
```

## Framework Distribution

Frameworks are distributed via GitHub Releases in the [obsydian-frameworks](https://github.com/Obsydian-HQ/obsydian-frameworks) repository. Each release includes:

- `Obsydian.xcframework.zip` - Universal framework for macOS and iOS
- `manifest.json` - Version metadata and checksums

The CLI automatically downloads and links the framework when you create a new project.

## Framework Structure

The framework is distributed as an XCFramework, which includes:

- **macOS (arm64)** - Native macOS support
- **iOS (arm64)** - Native iOS support (coming soon)
- **iOS Simulator (arm64)** - iOS Simulator support (coming soon)

## Versioning

Framework versions follow [Semantic Versioning](https://semver.org/):

- **Major** - Breaking API changes
- **Minor** - New features, backward compatible
- **Patch** - Bug fixes, backward compatible

## Troubleshooting

### Framework Download Fails

If framework download fails:

1. Check your internet connection
2. Verify GitHub access (the framework is hosted on GitHub Releases)
3. Try clearing the cache: `rm -rf ~/.obsydian/frameworks`
4. Check for rate limiting: GitHub API has rate limits

### Framework Validation Errors

If you see validation errors:

1. The downloaded framework may be corrupted - try updating: `obsydian framework update`
2. Clear the cache and re-download
3. Check the framework repository for known issues

### Build Errors

If you see build errors related to the framework:

1. Ensure the framework is properly linked in your Xcode project
2. Check that you're using a compatible framework version
3. Verify your Xcode version is up to date
4. Try cleaning and rebuilding: `obsydian build --platform macos --clean`

## Framework Development

For framework development, see the [obsydian](https://github.com/Obsydian-HQ/obsydian) repository.
