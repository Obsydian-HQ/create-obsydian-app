# @obsydian/cli

**Create, build, and ship native Obsydian apps to TestFlight and App Store.**

No Xcode GUI required. Framework-only - all apps use the Obsydian framework for cross-platform UI components.

## Installation

```bash
npm install -g @obsydian/cli
# or
npx @obsydian/cli <command>
```

## Quick Start

```bash
# Interactive menu (guided mode)
obsydian

# Create a new app
obsydian init my-app

# Build
cd my-app
obsydian build --platform macos

# Run locally
obsydian run --platform macos

# Submit to TestFlight
obsydian credentials setup  # First time only
obsydian submit --platform macos
```

## Interactive Menu (Guided Mode)

If you're not sure which command to run, start with:

```bash
obsydian
# or
obsydian menu
```

This opens an interactive, arrow-key driven menu that can launch the underlying subcommands and then return you back to the menu.

Navigation:

- **Up/Down**: move selection
- **Enter**: select
- **Esc**: go back
- **Ctrl+C**: exit

## Running on a physical iPhone/iPad

`obsydian run --platform ios` targets the **iOS Simulator**.

To build + install + launch on a **connected physical device**, use the Xcode runner:

```bash
# (Optional) see available devices
obsydian xcode devices

# Build + run on a physical iOS device (will prompt you to pick one)
obsydian xcode run --platform ios --device
```

If you’re doing this for the first time (signing/provisioning), try:

```bash
obsydian xcode run --platform ios --device --allow-provisioning-updates --allow-provisioning-device-registration
```

## Commands

### `obsydian init [name]`

Create a new Obsydian project.

```bash
obsydian init my-app
obsydian init my-app --platform macos
```

### `obsydian build`

Build your app using xcodebuild.

```bash
obsydian build --platform macos
obsydian build --platform macos --configuration Debug
obsydian build --platform macos --archive  # Create distributable archive
```

### `obsydian run`

Run your app locally.

```bash
obsydian run --platform macos
obsydian run --platform ios  # Runs in iOS Simulator
```

### `obsydian credentials setup`

Configure App Store Connect API credentials.

```bash
obsydian credentials setup
obsydian credentials show
```

You'll need an API key from [App Store Connect](https://appstoreconnect.apple.com/access/api).

### `obsydian submit`

Submit your app to TestFlight and App Store.

```bash
obsydian submit --platform macos
obsydian submit --platform ios
```

### `obsydian framework`

Manage Obsydian framework versions.

```bash
obsydian framework version    # Show current version
obsydian framework update      # Update to latest version
```

## Configuration

Projects are configured via `obsydian.json`:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "bundleId": "com.example.myapp",
  "platforms": ["macos"],
  "framework": {
    "version": "0.1.0",
    "source": "github"
  },
  "apple": {
    "teamId": "XXXXXXXXXX",
    "minimumOsVersion": "14.0"
  },
  "build": {
    "production": {
      "platform": "macos",
      "configuration": "Release"
    }
  },
  "submit": {
    "production": {
      "platform": "macos",
      "ascApiKeyPath": ".keys/AuthKey_XXXXXXXXXX.p8",
      "ascApiKeyId": "XXXXXXXXXX",
      "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

## Requirements

- macOS 14.0+
- Xcode 15.0+
- Node.js 18+
- Apple Developer Account (for TestFlight/App Store)

## Framework Management

The Obsydian CLI is **framework-only** - all apps automatically include the Obsydian framework:

```bash
# Check framework version
obsydian framework version

# Update to latest framework
obsydian framework update
```

See [FRAMEWORK.md](./FRAMEWORK.md) for framework documentation and [API.md](./API.md) for API reference.

## How It Works

1. **init** - Downloads Obsydian framework and generates Xcode project
2. **build** - Uses `xcodebuild` to compile your C++ code with the framework
3. **submit** - Uses `xcrun altool` to upload to App Store Connect

No need to open Xcode GUI at all!

## Inspired By

- [Expo EAS CLI](https://github.com/expo/eas-cli) - Build and submit workflow
- [@bacons/xcode](https://github.com/EvanBacon/xcode) - Xcode project manipulation
- [Fastlane](https://fastlane.tools/) - iOS deployment automation

## License

MIT
