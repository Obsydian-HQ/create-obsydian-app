/**
 * Xcode project generator
 * Creates a complete .xcodeproj file that can be opened in Xcode
 * and used for archiving and TestFlight distribution
 */

// @ts-ignore - ESM import issue with @bacons/xcode/json
import { build } from "@bacons/xcode/build/json/index.js";
import { XcodeProject, PBXShellScriptBuildPhase, PBXFileReference, PBXGroup, PBXBuildFile } from "@bacons/xcode";
import { ensureDirectory, joinPath, writeFile, pathExists } from "./fileSystem.js";
import path from "path";
import fs from "fs-extra";

export interface XcodeProjectOptions {
  appName: string;
  appDir: string;
  bundleId: string;
  executableName: string;
  minimumOsVersion: string;
  sourceFiles: string[];
  infoPlistPath: string;
  entitlementsPath?: string;
  iconPath?: string;
  obsidianPath?: string;
}

/**
 * Generate a complete Xcode project for a macOS application
 */
export async function generateXcodeProject(
  options: XcodeProjectOptions
): Promise<string> {
  const {
    appName,
    appDir,
    bundleId,
    executableName,
    minimumOsVersion,
    sourceFiles,
    infoPlistPath,
    entitlementsPath,
    iconPath,
    obsidianPath,
  } = options;

  // Create .xcodeproj directory
  const xcodeProjectDir = joinPath(appDir, `${appName}.xcodeproj`);
  await ensureDirectory(xcodeProjectDir);

  const projectPbxprojPath = joinPath(xcodeProjectDir, "project.pbxproj");

  // Create a minimal valid project structure
  const minimalProject = createMinimalProject({
    appName,
    bundleId,
    executableName,
    minimumOsVersion,
    sourceFiles: sourceFiles.map((f) => path.relative(appDir, f)),
    infoPlistPath: path.relative(appDir, infoPlistPath),
    obsidianPath,
    appDir,
  });

  // Write the initial project
  // Type assertion needed because we're creating the structure manually
  // The build function expects a parsed XcodeProject JSON structure
  const initialPbxproj = build(minimalProject as unknown as Parameters<typeof build>[0]);
  await writeFile(projectPbxprojPath, initialPbxproj);

  // Now use the high-level API to enhance it
  const project = XcodeProject.open(projectPbxprojPath);
  await enhanceProject(project, {
    appName,
    bundleId,
    executableName,
    minimumOsVersion,
    sourceFiles: sourceFiles.map((f) => path.relative(appDir, f)),
    infoPlistPath: path.relative(appDir, infoPlistPath),
    entitlementsPath: entitlementsPath ? path.relative(appDir, entitlementsPath) : undefined,
    iconPath: iconPath ? path.relative(appDir, iconPath) : undefined,
    obsidianPath,
    appDir,
  });

  // Save the enhanced project
  const finalPbxproj = build(project.toJSON());
  await writeFile(projectPbxprojPath, finalPbxproj);

  return xcodeProjectDir;
}

/**
 * Create a minimal valid Xcode project structure
 */
function createMinimalProject(options: {
  appName: string;
  bundleId: string;
  executableName: string;
  minimumOsVersion: string;
  sourceFiles: string[];
  infoPlistPath: string;
  obsidianPath?: string;
  appDir: string;
}) {
  const {
    appName,
    bundleId,
    executableName,
    minimumOsVersion,
    sourceFiles,
    infoPlistPath,
  } = options;

  const generateUUID = () => {
    return (
      Math.random().toString(16).substring(2, 10) +
      Math.random().toString(16).substring(2, 10)
    ).toUpperCase();
  };

  const rootObjectUUID = generateUUID();
  const mainGroupUUID = generateUUID();
  const productsGroupUUID = generateUUID();
  const targetUUID = generateUUID();
  const targetConfigListUUID = generateUUID();
  const projectConfigListUUID = generateUUID();
  const debugConfigUUID = generateUUID();
  const releaseConfigUUID = generateUUID();
  const projectDebugConfigUUID = generateUUID();
  const projectReleaseConfigUUID = generateUUID();
  const sourcesPhaseUUID = generateUUID();
  const frameworksPhaseUUID = generateUUID();
  const resourcesPhaseUUID = generateUUID();
  const productRefUUID = generateUUID();

  // Create file references
  const fileRefs: Record<string, Record<string, unknown>> = {};
  const buildFiles: Record<string, Record<string, unknown>> = {};
  const sourceBuildFileUUIDs: string[] = [];

  // Add source files
  sourceFiles.forEach((filePath) => {
    const fileRefUUID = generateUUID();
    const buildFileUUID = generateUUID();
    fileRefs[fileRefUUID] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.cpp.cpp",
      path: filePath,
      sourceTree: "<group>",
    };
    buildFiles[buildFileUUID] = {
      isa: "PBXBuildFile",
      fileRef: fileRefUUID,
    };
    sourceBuildFileUUIDs.push(buildFileUUID);
  });

  // Info.plist file reference
  const infoPlistRefUUID = generateUUID();
  fileRefs[infoPlistRefUUID] = {
    isa: "PBXFileReference",
    lastKnownFileType: "text.plist.xml",
    path: infoPlistPath,
    sourceTree: "<group>",
  };

  const infoPlistBuildFileUUID = generateUUID();
  buildFiles[infoPlistBuildFileUUID] = {
    isa: "PBXBuildFile",
    fileRef: infoPlistRefUUID,
  };

  // Product reference
  fileRefs[productRefUUID] = {
    isa: "PBXFileReference",
    explicitFileType: "wrapper.application",
    includeInIndex: 0,
    path: `${executableName}.app`,
    sourceTree: "BUILT_PRODUCTS_DIR",
  };

  // Build configurations
  const debugConfig = {
    isa: "XCBuildConfiguration",
    name: "Debug",
    buildSettings: {
      CLANG_CXX_LANGUAGE_STANDARD: "c++20",
      MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: executableName,
      INFOPLIST_FILE: infoPlistPath,
      SDKROOT: "macosx",
      CODE_SIGN_STYLE: "Automatic",
      DEVELOPMENT_TEAM: "",
    },
  };

  const releaseConfig = {
    isa: "XCBuildConfiguration",
    name: "Release",
    buildSettings: {
      CLANG_CXX_LANGUAGE_STANDARD: "c++20",
      MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
      PRODUCT_BUNDLE_IDENTIFIER: bundleId,
      PRODUCT_NAME: executableName,
      INFOPLIST_FILE: infoPlistPath,
      SDKROOT: "macosx",
      CODE_SIGN_STYLE: "Automatic",
      DEVELOPMENT_TEAM: "",
    },
  };

  const projectDebugConfig = {
    isa: "XCBuildConfiguration",
    name: "Debug",
    buildSettings: {
      CLANG_CXX_LANGUAGE_STANDARD: "c++20",
      MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
      SDKROOT: "macosx",
    },
  };

  const projectReleaseConfig = {
    isa: "XCBuildConfiguration",
    name: "Release",
    buildSettings: {
      CLANG_CXX_LANGUAGE_STANDARD: "c++20",
      MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
      SDKROOT: "macosx",
    },
  };

  // Build phases
  const sourcesPhase = {
    isa: "PBXSourcesBuildPhase",
    buildActionMask: 2147483647,
    files: sourceBuildFileUUIDs,
    runOnlyForDeploymentPostprocessing: 0,
  };

  const frameworksPhase = {
    isa: "PBXFrameworksBuildPhase",
    buildActionMask: 2147483647,
    files: [],
    runOnlyForDeploymentPostprocessing: 0,
  };

  const resourcesPhase = {
    isa: "PBXResourcesBuildPhase",
    buildActionMask: 2147483647,
    files: [], // Info.plist should NOT be in resources phase - it's processed automatically
    runOnlyForDeploymentPostprocessing: 0,
  };

  // Configuration lists
  const targetConfigList = {
    isa: "XCConfigurationList",
    buildConfigurations: [debugConfigUUID, releaseConfigUUID],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  };

  const projectConfigList = {
    isa: "XCConfigurationList",
    buildConfigurations: [projectDebugConfigUUID, projectReleaseConfigUUID],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: "Release",
  };

  // Native target
  const nativeTarget = {
    isa: "PBXNativeTarget",
    buildConfigurationList: targetConfigListUUID,
    buildPhases: [sourcesPhaseUUID, frameworksPhaseUUID, resourcesPhaseUUID],
    buildRules: [],
    dependencies: [],
    name: appName,
    productName: executableName,
    productReference: productRefUUID,
    productType: "com.apple.product-type.application",
  };

  // Main group
  const mainGroup = {
    isa: "PBXGroup",
    children: [
      ...Object.keys(fileRefs).filter((uuid) => uuid !== productRefUUID),
      productsGroupUUID,
    ],
    sourceTree: "<group>",
  };

  // Products group
  const productsGroup = {
    isa: "PBXGroup",
    children: [productRefUUID],
    name: "Products",
    sourceTree: "<group>",
  };

  // Root project object
  const rootObject = {
    isa: "PBXProject",
    attributes: {
      LastSwiftUpdateCheck: "2600",
      LastUpgradeCheck: "2600",
      TargetAttributes: {
        [targetUUID]: {
          CreatedOnToolsVersion: "26.0",
        },
      },
    },
    buildConfigurationList: projectConfigListUUID,
    compatibilityVersion: "Xcode 26.0",
    developmentRegion: "en",
    hasScannedForEncodings: 0,
    knownRegions: ["en", "Base"],
    mainGroup: mainGroupUUID,
    productRefGroup: productsGroupUUID,
    projectDirPath: "",
    projectRoot: "",
    targets: [targetUUID],
  };

  // Assemble all objects
  const objects: Record<string, Record<string, unknown>> = {
    [rootObjectUUID]: rootObject,
    [mainGroupUUID]: mainGroup,
    [productsGroupUUID]: productsGroup,
    [targetUUID]: nativeTarget,
    [targetConfigListUUID]: targetConfigList,
    [projectConfigListUUID]: projectConfigList,
    [sourcesPhaseUUID]: sourcesPhase,
    [frameworksPhaseUUID]: frameworksPhase,
    [resourcesPhaseUUID]: resourcesPhase,
    [debugConfigUUID]: debugConfig,
    [releaseConfigUUID]: releaseConfig,
    [projectDebugConfigUUID]: projectDebugConfig,
    [projectReleaseConfigUUID]: projectReleaseConfig,
    ...fileRefs,
    ...buildFiles,
  };

  return {
    archiveVersion: 1,
    classes: {},
    objectVersion: 56,
    objects,
    rootObject: rootObjectUUID,
  };
}

/**
 * Enhance the project using the high-level API
 */
async function enhanceProject(
  project: XcodeProject,
  options: {
    appName: string;
    bundleId: string;
    executableName: string;
    minimumOsVersion: string;
    sourceFiles: string[];
    infoPlistPath: string;
    entitlementsPath?: string;
    iconPath?: string;
    obsidianPath?: string;
    appDir: string;
  }
): Promise<void> {
  const { bundleId, minimumOsVersion, obsidianPath, appDir, entitlementsPath, iconPath } = options;
  
  // Extract icon name for build settings (without .icon extension)
  const iconName = iconPath ? path.basename(iconPath, '.icon') : undefined;
  
  const mainGroup = project.rootObject.props.mainGroup;
  
  // Get the main target (should be the only one)
  const targets = project.rootObject.props.targets;
  if (targets.length === 0) {
    throw new Error("No targets found in project");
  }

  const mainTarget = targets[0];
  
  // Add entitlements file to project if it exists
  if (entitlementsPath) {
    mainGroup.createFile({
      path: entitlementsPath,
      sourceTree: "<group>",
    });
  }
  
  // Add icon directory to project if it exists
  // .icon is a package (directory bundle) that should be added as a single file reference
  // According to Apple docs: https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer
  if (iconPath) {
    const iconFullPath = path.join(appDir, iconPath);
    if (await pathExists(iconFullPath)) {
      // Create a file reference for the .icon package (not a group)
      // Xcode recognizes .icon directories as "folder.iconcomposer.icon" type
      // Match the working project: only set lastKnownFileType, no other properties
      const iconFileRef = PBXFileReference.create(project, {
        path: iconPath,
        sourceTree: "<group>",
      });
      
      // Set the correct file type for Icon Composer packages
      // Use type assertion since @bacons/xcode may not have this specific type in its definitions
      // Match exactly the working project configuration
      (iconFileRef.props as any).lastKnownFileType = "folder.iconcomposer.icon";
      
      // Add to main group
      mainGroup.props.children.push(iconFileRef);
      
      // Add to Resources build phase
      // Note: Xcode will process .icon files with actool, which is expected behavior
      // The .icon file must be in Resources for CFBundleIconFile to work
      // For App Store validation, ensure the .icon file contains all required sizes
      // including 512pt @2x (1024x1024) image. Icon Composer can export ICNS if needed.
      if ('getResourcesBuildPhase' in mainTarget) {
        const resourcesPhase = mainTarget.getResourcesBuildPhase();
        const iconBuildFile = PBXBuildFile.create(project, {
          fileRef: iconFileRef,
        });
        resourcesPhase.props.files.push(iconBuildFile);
      }
    }
  }

  // Add build script phase to build Obsidian with Bazel before linking
  if (obsidianPath && 'getFrameworksBuildPhase' in mainTarget) {
    const obsidianAbsPath = path.resolve(obsidianPath);
    const relativeObsidianPath = path.relative(appDir, obsidianAbsPath);
    
    // Get Bazel output path - Bazel outputs to bazel-out/darwin_arm64-fastbuild/bin
    const bazelOutPath = path.join(relativeObsidianPath, "bazel-out/darwin_arm64-fastbuild/bin");
    const libraryOutputPath = path.join(bazelOutPath, "src/libobsidian.a");
    
    // Create build script phase to build Obsidian library and all dependencies
    // obsidian_impl depends on core:runtime, core:ffi_base, and packages/apple:apple_ffi
    // apple_ffi depends on apple_objc_bridge (objc_library)
    // Build all dependencies to ensure they're available for linking
    const buildScript = mainTarget.createBuildPhase(PBXShellScriptBuildPhase, {
      name: "Build Obsidian Library",
      shellScript: `set -e

# Find Bazel in common installation locations
BAZEL_CMD=""
if command -v bazel >/dev/null 2>&1; then
    BAZEL_CMD="bazel"
elif [ -f "/opt/homebrew/bin/bazel" ]; then
    BAZEL_CMD="/opt/homebrew/bin/bazel"
elif [ -f "/usr/local/bin/bazel" ]; then
    BAZEL_CMD="/usr/local/bin/bazel"
elif [ -f "$HOME/.bazel/bin/bazel" ]; then
    BAZEL_CMD="$HOME/.bazel/bin/bazel"
else
    echo "error: Bazel not found. Please install Bazel or add it to your PATH."
    exit 1
fi

cd "${relativeObsidianPath}"
# Build all Obsidian dependencies needed for linking
# Note: Bazel handles caching, so this is fast on subsequent builds
$BAZEL_CMD build //src:obsidian_impl //core:runtime //core:ffi_base //packages/apple:apple_ffi //packages/apple:apple_objc_bridge --config=macos`,
      shellPath: "/bin/sh",
      inputPaths: [],
      outputPaths: [], // Don't specify outputs to avoid dependency cycles with linker
      showEnvVarsInLog: 0,
    });
    
    // Move script phase before frameworks phase (so it runs before linking)
    const buildPhases = mainTarget.props.buildPhases;
    const scriptIndex = buildPhases.indexOf(buildScript);
    const frameworksPhase = mainTarget.getFrameworksBuildPhase();
    const frameworksIndex = buildPhases.indexOf(frameworksPhase);
    
    if (scriptIndex !== -1 && frameworksIndex !== -1 && scriptIndex > frameworksIndex) {
      // Remove from current position
      buildPhases.splice(scriptIndex, 1);
      // Insert before frameworks phase
      buildPhases.splice(frameworksIndex, 0, buildScript);
    }
  }

  // Update build configurations with more complete settings
  const configList = mainTarget.props.buildConfigurationList;
  if (configList?.props.buildConfigurations) {
    for (const config of configList.props.buildConfigurations) {
      const buildSettings = config.props.buildSettings || {};
      
      // Calculate header search paths for Obsidian framework
      const headerSearchPaths: string[] = [];
      const librarySearchPaths: string[] = [];
      const otherLdFlags: string[] = [];
      
      if (obsidianPath) {
        // Add Obsidian include directory to header search paths
        const obsidianIncludePath = path.resolve(obsidianPath, "include");
        const relativeIncludePath = path.relative(appDir, obsidianIncludePath);
        headerSearchPaths.push(`"$(SRCROOT)/${relativeIncludePath}"`);
        
        // Add Bazel output directories to library search paths
        // Bazel outputs libraries to bazel-bin/ (symlink in workspace)
        const relativeObsidianPath = path.relative(appDir, path.resolve(obsidianPath));
        const bazelBinBase = `"$(SRCROOT)/${relativeObsidianPath}/bazel-bin"`;
        librarySearchPaths.push(`${bazelBinBase}/src`);
        librarySearchPaths.push(`${bazelBinBase}/core`);
        librarySearchPaths.push(`${bazelBinBase}/packages/apple`);
        
        // Link against all Obsidian libraries in dependency order
        // apple_objc_bridge -> apple_ffi -> ffi_base -> runtime -> obsidian_impl
        // Also link required macOS frameworks
        otherLdFlags.push("-lobsidian_impl");
        otherLdFlags.push("-lruntime");
        otherLdFlags.push("-lffi_base");
        otherLdFlags.push("-lapple_ffi");
        otherLdFlags.push("-lapple_objc_bridge");
        otherLdFlags.push("-framework", "AppKit");
        otherLdFlags.push("-framework", "Foundation");
      }

      // Add comprehensive build settings
      Object.assign(buildSettings, {
        ALWAYS_SEARCH_USER_PATHS: "NO",
        CLANG_ANALYZER_NONNULL: "YES",
        CLANG_CXX_LANGUAGE_STANDARD: "c++20",
        CLANG_ENABLE_MODULES: "YES",
        CLANG_ENABLE_OBJC_ARC: "YES",
        CLANG_ENABLE_OBJC_WEAK: "YES",
        CODE_SIGN_STYLE: "Automatic",
        COPY_PHASE_STRIP: "NO",
        DEBUG_INFORMATION_FORMAT:
          config.props.name === "Debug" ? "dwarf" : "dwarf-with-dsym",
        ENABLE_STRICT_OBJC_MSGSEND: "YES",
        GCC_C_LANGUAGE_STANDARD: "gnu11",
        GCC_WARN_64_TO_32_BIT_CONVERSION: "YES",
        GCC_WARN_ABOUT_RETURN_TYPE: "YES_ERROR",
        GCC_WARN_UNINITIALIZED_AUTOS: "YES_AGGRESSIVE",
        GCC_WARN_UNUSED_FUNCTION: "YES",
        GCC_WARN_UNUSED_VARIABLE: "YES",
        HEADER_SEARCH_PATHS: headerSearchPaths.length > 0 
          ? [...headerSearchPaths, "$(inherited)"]
          : ["$(inherited)"],
        LIBRARY_SEARCH_PATHS: librarySearchPaths.length > 0
          ? [...librarySearchPaths, "$(inherited)"]
          : ["$(inherited)"],
        OTHER_LDFLAGS: otherLdFlags.length > 0
          ? [...otherLdFlags, "$(inherited)"]
          : ["$(inherited)"],
        MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
        PRODUCT_BUNDLE_IDENTIFIER: bundleId,
        SDKROOT: "macosx",
        // Only build for arm64 (Apple Silicon)
        // x86_64 support can be added later when cross-compilation is configured
        ARCHS: "arm64",
        // Configure entitlements for App Sandbox
        ...(entitlementsPath ? {
          CODE_SIGN_ENTITLEMENTS: entitlementsPath,
        } : {}),
        // Configure asset catalog settings to match working project
        // Icon Composer .icon files are processed by actool, and need these settings
        ...(iconName ? {
          ASSETCATALOG_COMPILER_APPICON_NAME: iconName,
        } : {}),
        INFOPLIST_ENABLE_CFBUNDLEICONS_MERGE: "YES",
        ...(config.props.name === "Debug"
          ? {
              GCC_OPTIMIZATION_LEVEL: 0,
              GCC_PREPROCESSOR_DEFINITIONS: ["DEBUG=1", "$(inherited)"],
            }
          : {
              ENABLE_NS_ASSERTIONS: "NO",
            }),
      });

      config.props.buildSettings = buildSettings;
    }
  }
}

