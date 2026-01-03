# @obsydian/cli

**Create, build, and ship native Obsydian apps to TestFlight and App Store.**

No Xcode GUI required.

## Installation

```bash
npm install -g @obsydian/cli
# or
npx @obsydian/cli <command>
```

## Quick Start

```bash
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

## Configuration

Projects are configured via `obsydian.json`:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "bundleId": "com.example.myapp",
  "platforms": ["macos"],
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

## How It Works

1. **init** - Generates an Xcode project and Bazel build files
2. **build** - Uses `xcodebuild` to compile your C++ code
3. **submit** - Uses `xcrun altool` to upload to App Store Connect

No need to open Xcode GUI at all!

## Inspired By

- [Expo EAS CLI](https://github.com/expo/eas-cli) - Build and submit workflow
- [@bacons/xcode](https://github.com/EvanBacon/xcode) - Xcode project manipulation
- [Fastlane](https://fastlane.tools/) - iOS deployment automation

## License

MIT
