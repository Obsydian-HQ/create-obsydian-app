# Obsydian CLI: TestFlight Submission Guide

Complete guide to submitting your Obsydian app to TestFlight without opening Xcode.

## Prerequisites

1. **Apple Developer Program** membership ($99/year)
   - Sign up at https://developer.apple.com/programs/

2. **Xcode** installed (for build tools, but you won't open the GUI)

---

## Step 1: Get Your App Store Connect API Key (One-Time)

1. Go to **https://appstoreconnect.apple.com/access/api**
2. Click **"+"** to create a new key
3. Give it a name (e.g., "Obsydian CLI")
4. Select **"Admin"** or **"App Manager"** role
5. Click **"Generate"**
6. **Download the `.p8` file** (you can only download it ONCE!)
7. Note the **Key ID** (10 characters, e.g., `DZJ584RBHR`)
8. Note the **Issuer ID** (UUID at top of page, e.g., `c8edd2ec-206c-45d6-80ee-f7329398abe8`)

---

## Step 2: Configure Credentials

### Option A: Using the CLI (Interactive)
```bash
obsydian credentials setup
```

### Option B: Manual Setup
```bash
# Create directories
mkdir -p ~/.appstoreconnect/private_keys
mkdir -p ~/.obsydian

# Copy your API key
cp /path/to/AuthKey_XXXXXXXXXX.p8 ~/.appstoreconnect/private_keys/

# Create config file
cat > ~/.obsydian/credentials.json << 'EOF'
{
  "appStoreConnect": {
    "keyPath": "/Users/YOUR_USERNAME/.appstoreconnect/private_keys/AuthKey_XXXXXXXXXX.p8",
    "keyId": "XXXXXXXXXX",
    "issuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
EOF
```

### Verify Setup
```bash
obsydian credentials show
```

---

## Step 3: Get Your Team ID (One-Time)

Your Team ID is needed for code signing.

1. Go to **https://developer.apple.com/account**
2. Look in the top right - your Team ID is shown
3. OR check **Membership Details** → Team ID (10 characters, e.g., `A1B2C3D4E5`)

---

## Step 4: Register Your App (One-Time Per App)

**⚠️ Apple's API does NOT support creating new apps - this must be done manually.**

1. Go to **https://appstoreconnect.apple.com**
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platforms**: Select macOS and/or iOS
   - **Name**: Your app's display name (e.g., "My Cool App")
   - **Primary Language**: English (or your language)
   - **Bundle ID**: 
     - If not listed, click "Register a new Bundle ID"
     - Enter exactly what's in your `obsydian.json` (e.g., `com.obsydian.myapp`)
   - **SKU**: Any unique identifier (e.g., `myapp-2024`)
4. Click **"Create"**

---

## Step 5: Create Your App

```bash
# Create a new app with your Team ID
obsydian init my-app --platform macos --team-id YOUR_TEAM_ID --bundle-id com.yourcompany.myapp
```

Or if you already have a project, add your Team ID to `obsydian.json`:

```json
{
  "name": "my-app",
  "bundleId": "com.yourcompany.myapp",
  "version": "1.0.0",
  "platforms": ["macos"],
  "teamId": "A1B2C3D4E5"
}
```

---

## Step 6: Submit to TestFlight

```bash
cd my-app

# Submit to TestFlight (builds, signs, and uploads automatically)
obsydian submit --platform macos

# With verbose output
obsydian submit --platform macos --verbose
```

---

## What Happens During Submit

1. **Archive** - Creates a signed `.xcarchive` using `xcodebuild archive`
2. **Export** - Exports to App Store format with proper signing
3. **Upload** - Uses `xcrun altool` to upload to App Store Connect
4. **Processing** - Apple processes your build (5-30 minutes)
5. **Available** - Build appears in TestFlight

---

## App Icon Requirement

**⚠️ Important:** App Store requires an app icon in ICNS format with a 512pt x 512pt @2x image.

The CLI doesn't generate icons automatically. You need to:

1. **Create an icon** (1024x1024 PNG)
2. **Convert to ICNS**:
   ```bash
   # Using iconutil (macOS)
   mkdir MyIcon.iconset
   # Add your icon files (icon_16x16.png, icon_16x16@2x.png, etc.)
   iconutil -c icns MyIcon.iconset
   ```
3. **Add to Xcode project**:
   - Open your `.xcodeproj` in Xcode
   - Drag the `.icns` file into the project
   - Set it as the App Icon in the target's General settings

Or use a tool like [IconGenerator](https://icon-generator.app) to create all required sizes.

**Note:** For now, you can submit without an icon for testing, but you'll need one before App Store review.

---

## Troubleshooting

### "No Team Found in Archive"
Your project doesn't have a Team ID configured.
- Add `"teamId": "YOUR_TEAM_ID"` to `obsydian.json`
- Or regenerate project with `--team-id` flag

### "Unable to authenticate"
- Verify your API Key ID and Issuer ID are correct
- Ensure the `.p8` file is in `~/.appstoreconnect/private_keys/`
- Check that your API key has "Admin" or "App Manager" role

### "No App record found" or "Error Downloading App Information"
**If you haven't created the app:**
- Go to https://appstoreconnect.apple.com → My Apps → + → New App
- Make sure the Bundle ID matches exactly

**If you removed an app and are trying to reuse the bundle ID:**
- ⚠️ **Bundle identifiers CANNOT be reused** - they are permanently tied to the original app
- Even if you delete an app from App Store Connect, the bundle ID remains associated with it
- **There is NO waiting period** - bundle IDs cannot be reused even after app deletion
- **Solution:** Create a NEW bundle identifier:
  1. Go to https://developer.apple.com/account/resources/identifiers/list
  2. Register a new App ID with a different bundle identifier
  3. Update your app's bundle ID in Xcode project settings
  4. Create a NEW app in App Store Connect with the new bundle ID
  5. Then try submitting again
- **Note:** App names can be reused by other developers, but bundle IDs and SKUs cannot be reused within your account

### "Provisioning profile" errors
- Make sure your Team ID is correct
- The CLI uses automatic signing - your API key should have permissions

### "Missing required icon"
The app needs an icon in ICNS format with a 512pt x 512pt @2x image.
- Create a 1024x1024 PNG icon
- Convert to ICNS using `iconutil` or an online tool
- Add to Xcode project and set as App Icon in target settings
- See "App Icon Requirement" section below

### "LSApplicationCategoryType" error
This should be fixed automatically in new projects. If you see this:
- Check your `Info.plist` has `LSApplicationCategoryType` key
- Valid values: `public.app-category.utilities`, `public.app-category.productivity`, etc.

### "App sandbox not enabled"
This should be fixed automatically. If you see this:
- Check `entitlements.plist` exists in your project
- Verify `CODE_SIGN_ENTITLEMENTS` is set in Xcode build settings

### Build processing takes forever
- First builds can take 30+ minutes
- Check status at https://appstoreconnect.apple.com → TestFlight

---

## Quick Reference

| Task | Command |
|------|---------|
| Create new app | `obsydian init my-app --platform macos --team-id XXXX` |
| Build locally | `obsydian build --platform macos` |
| Run locally | `obsydian run --platform macos` |
| Submit to TestFlight | `obsydian submit --platform macos` |
| Check credentials | `obsydian credentials show` |
| Configure credentials | `obsydian credentials setup` |

---

## File Locations

| File | Purpose |
|------|---------|
| `~/.obsydian/credentials.json` | Global API key config |
| `~/.appstoreconnect/private_keys/` | API key `.p8` files |
| `obsydian.json` | Project config (bundleId, teamId, etc.) |
| `.keys/` | Project-level API keys (gitignored) |
