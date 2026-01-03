# End-to-End Test Commands

Complete command sequence to test the full Obsydian CLI workflow from app creation to TestFlight submission.

## Prerequisites

1. **App Store Connect Setup:**
   - Create app "Obsydian Test App 3" in App Store Connect
   - Register bundle ID: `com.obsydian.testobsydianapp3`
   - Configure App Store Connect API key (if not already done)

2. **Clean Up Previous Test:**
   ```bash
   # Remove previous test app
   cd /tmp
   rm -rf test-obsydian-app2
   
   # Delete from App Store Connect (manual step in web UI)
   # Go to: https://appstoreconnect.apple.com
   # Delete "test-obsydian-app2" app
   ```

## Full Test Loop

### Step 1: Create New App

```bash
cd /tmp
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js init test-obsydian-app3 \
  --platform macos \
  --team-id DA7B5U47PT \
  --bundle-id com.obsydian.testobsydianapp3
```

**Expected Output:**
- Framework downloads automatically
- Xcode project created
- Framework linked correctly
- App icon generated

### Step 2: Verify Framework

```bash
cd /tmp/test-obsydian-app3

# Check framework version
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js framework version
```

**Expected Output:**
- Shows framework version: v0.1.0
- Framework path displayed

### Step 3: Build the App

```bash
# Build for macOS
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js build --platform macos
```

**Expected Output:**
- Build succeeds
- App binary created
- Framework linked correctly

### Step 4: Run Locally (Optional)

```bash
# Run the app locally
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js run --platform macos
```

**Expected Output:**
- App launches
- Window appears with framework UI components

### Step 5: Submit to TestFlight

```bash
# Submit to TestFlight
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js submit --platform macos
```

**Expected Output:**
- Archive created
- Archive exported
- Upload to App Store Connect succeeds
- App appears in TestFlight within a few minutes

## Verification

### Check App Store Connect

1. Go to: https://appstoreconnect.apple.com
2. Navigate to "My Apps" > "Obsydian Test App 3"
3. Check "TestFlight" tab
4. Verify build appears and processes successfully

### Verify Framework Integration

The app should:
- ✅ Use Obsydian framework (not standalone)
- ✅ Include framework in Xcode project
- ✅ Link framework correctly
- ✅ Build without errors
- ✅ Run with framework UI components

## Troubleshooting

### Framework Download Fails

If framework download fails:
```bash
# Clear cache and retry
rm -rf ~/.obsydian/frameworks
cd /tmp/test-obsydian-app3
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js framework update
```

### Build Errors

If build fails:
```bash
# Clean and rebuild
cd /tmp/test-obsydian-app3
rm -rf build DerivedData
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js build --platform macos
```

### Submission Errors

If submission fails:
1. Check App Store Connect API key is configured
2. Verify bundle ID matches App Store Connect
3. Check team ID is correct
4. Ensure app exists in App Store Connect

## Success Criteria

✅ App created with framework automatically downloaded  
✅ Framework version v0.1.0 linked  
✅ App builds successfully  
✅ App runs locally (optional)  
✅ App uploads to TestFlight  
✅ App appears in App Store Connect  
✅ **No Xcode GUI opened at any point**

## Complete Command Sequence (Copy-Paste Ready)

```bash
# Clean up
cd /tmp
rm -rf test-obsydian-app2

# Create new app
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js init test-obsydian-app3 \
  --platform macos \
  --team-id DA7B5U47PT \
  --bundle-id com.obsydian.testobsydianapp3

# Navigate to app
cd test-obsydian-app3

# Check framework
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js framework version

# Build
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js build --platform macos

# Submit to TestFlight
node /Users/naaiyy/Developer/Obsydian-HQ/create-obsydian-app/dist/index.js submit --platform macos
```

## Framework Release Info

- **Version:** v0.1.0
- **Release URL:** https://github.com/Obsydian-HQ/obsydian-frameworks/releases/tag/v0.1.0
- **Framework Size:** 88KB
- **Platforms:** macOS arm64
- **Auto-download:** Yes (on `obsydian init`)
