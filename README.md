# create-obsydian-app

**CLI tool to scaffold new Obsydian applications.**

Create cross-platform native apps with one command.

## Installation

```bash
# Using npx (recommended)
npx create-obsydian-app@latest my-app

# Or install globally
npm install -g create-obsydian-app
create-obsydian-app my-app
```

## Usage

```bash
# Create a macOS app
npx create-obsydian-app my-app --platforms macos

# Create an iOS app (coming soon)
npx create-obsydian-app my-app --platforms ios

# Create a multi-platform app
npx create-obsydian-app my-app --platforms macos ios
```

## What Gets Generated

```
my-app/
├── main.cpp                    # Your app entry point
├── Info.plist                  # App metadata
├── entitlements.plist         # macOS entitlements
├── MODULE.bazel               # Bazel module configuration
├── BUILD                      # Bazel build targets
├── .bazelrc                   # Bazel configuration
├── .bazelversion              # Bazel version pin
├── my-app.xcodeproj/          # Xcode project for macOS/iOS
└── README.md                  # Generated documentation
```

## Building Your App

### With Xcode (Recommended for distribution)

1. Open `my-app.xcodeproj` in Xcode
2. Select your development team in Signing & Capabilities
3. Product → Archive
4. Distribute to TestFlight

### With Bazel

```bash
cd my-app

# Build
bazel build //... --config=macos

# Run
bazel run //:my_app_app --config=macos
```

## Features

- ✅ **Xcode Project Generation** - Ready for App Store submission
- ✅ **Bazel Build System** - Fast, reproducible builds
- ✅ **App Icon Support** - Generates icon placeholders
- ✅ **Code Signing** - Automatic code signing configuration
- ✅ **Entitlements** - App Sandbox ready

## Roadmap

### CLI Features (Inspired by Expo EAS CLI)

- [ ] `obsydian build` - Cloud builds
- [ ] `obsydian submit` - App Store submission
- [ ] `obsydian credentials` - Code signing management
- [ ] `obsydian device` - Device management
- [ ] `obsydian update` - OTA updates

### Platform Support

- ✅ macOS
- 🚧 iOS
- 📋 Android
- 📋 Windows
- 📋 Linux

## Architecture

This CLI is inspired by [Expo's EAS CLI](https://github.com/expo/eas-cli) but designed for C++ native development.

```
create-obsydian-app/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── scaffold.ts        # Project scaffolding
│   ├── validation.ts      # Input validation
│   ├── platforms/         # Platform-specific generators
│   │   ├── base.ts
│   │   ├── macos.ts
│   │   └── ios.ts
│   ├── templates/         # File templates
│   │   ├── mainCpp.ts
│   │   ├── infoPlist.ts
│   │   └── ...
│   └── utils/
│       ├── xcodeProject.ts    # Xcode project generation
│       ├── bundleId.ts        # Bundle ID utilities
│       └── obsidianDetector.ts
```

## Dependencies

- [@bacons/xcode](https://github.com/EvanBacon/xcode) - Xcode project manipulation
- [commander](https://github.com/tj/commander.js) - CLI framework
- [fs-extra](https://github.com/jprichardson/node-fs-extra) - File system utilities

## Related Projects

- [obsydian](https://github.com/Obsydian-HQ/obsydian) - Main Obsydian framework
- [obsydian-devtools](https://github.com/Obsydian-HQ/obsydian-devtools) - Developer tools

## License

MIT License - see [LICENSE](LICENSE) for details.
