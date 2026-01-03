# Release Checklist

## Framework Release v0.1.0

### ✅ Completed

- [x] Framework build script tested and working
- [x] XCFramework created successfully (macOS arm64)
- [x] Framework packaged (zip + checksum)
- [x] Manifest created with correct metadata
- [x] Platform-specific Xcode project generation fixed
- [x] Framework embedding for iOS implemented
- [x] Standalone support removed (framework-only)
- [x] Framework management commands added
- [x] Error handling enhanced
- [x] Framework validation added
- [x] Documentation written (FRAMEWORK.md, API.md)
- [x] CLI builds successfully

### 📦 Release Files

Located in `/Users/naaiyy/Developer/Obsydian-HQ/obsydian/dist/`:

- `Obsydian.xcframework.zip` - Framework archive
- `Obsydian.xcframework.zip.sha256` - Checksum file
- `manifest.json` - Version metadata

### 🚀 Create Release

#### Option 1: Via GitHub Actions (Recommended)

1. Tag the obsydian repository:
   ```bash
   cd /Users/naaiyy/Developer/Obsydian-HQ/obsydian
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. GitHub Actions will automatically:
   - Build the framework
   - Create the release in `obsydian-frameworks` repo
   - Upload the framework files

#### Option 2: Manual Release

1. Copy files to `obsydian-frameworks` repo:
   ```bash
   cd /Users/naaiyy/Developer/Obsydian-HQ/obsydian-frameworks
   mkdir -p releases/v0.1.0
   cp ../obsydian/dist/* releases/v0.1.0/
   ```

2. Create GitHub release:
   - Go to https://github.com/Obsydian-HQ/obsydian-frameworks/releases/new
   - Tag: `v0.1.0`
   - Title: `Obsydian Framework v0.1.0`
   - Upload `Obsydian.xcframework.zip` and `manifest.json`

### ✅ Post-Release Verification

After release is created:

1. Test framework download:
   ```bash
   cd /tmp
   obsydian init test-app
   ```

2. Verify framework is linked:
   ```bash
   cd test-app
   obsydian build --platform macos
   ```

3. Check framework version:
   ```bash
   obsydian framework version
   ```

### 📝 Release Notes

**Obsydian Framework v0.1.0**

Initial release of the Obsydian framework.

**Features:**
- Cross-platform UI components (Window, Button, TextField, etc.)
- Process management APIs
- macOS arm64 support
- Framework-only CLI (standalone mode removed)

**Installation:**
The framework is automatically downloaded when creating a new Obsydian app:
```bash
obsydian init my-app
```

**Documentation:**
- Framework guide: [FRAMEWORK.md](../create-obsydian-app/FRAMEWORK.md)
- API reference: [API.md](../create-obsydian-app/API.md)
