/**
 * Xcode project generation
 * Uses @bacons/xcode for pbxproj manipulation
 */

import fs from 'fs-extra';
import path from 'path';
import { createRequire } from 'module';
import type { Platform } from './config.js';

// Use createRequire for CommonJS module
const require = createRequire(import.meta.url);
const { build } = require('@bacons/xcode/json');

export interface XcodeProjectOptions {
  projectDir: string;
  projectName: string;
  bundleId: string;
  platforms: Platform[];
  sourceFiles: string[];
  infoPlistPath: string;
  entitlementsPath?: string;
  minimumOsVersion?: string;
  teamId?: string;
}

/**
 * Get file type for Xcode based on extension
 */
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.m': return 'sourcecode.c.objc';
    case '.mm': return 'sourcecode.cpp.objcpp';
    case '.c': return 'sourcecode.c.c';
    case '.cpp': case '.cc': return 'sourcecode.cpp.cpp';
    case '.swift': return 'sourcecode.swift';
    case '.h': return 'sourcecode.c.h';
    case '.hpp': return 'sourcecode.cpp.h';
    default: return 'text';
  }
}

/**
 * Generate an Xcode project for the app
 */
export async function generateXcodeProject(options: XcodeProjectOptions): Promise<string> {
  const {
    projectDir,
    projectName,
    bundleId,
    sourceFiles,
    infoPlistPath,
    minimumOsVersion = '14.0',
    teamId = '',
  } = options;

  // Create .xcodeproj directory
  const xcodeProjectDir = path.join(projectDir, `${projectName}.xcodeproj`);
  await fs.ensureDir(xcodeProjectDir);

  // Generate UUIDs
  const generateUUID = () => {
    return (
      Math.random().toString(16).substring(2, 10) +
      Math.random().toString(16).substring(2, 10)
    ).toUpperCase().slice(0, 24);
  };

  const rootObjectUUID = generateUUID();
  const mainGroupUUID = generateUUID();
  const productsGroupUUID = generateUUID();
  const frameworksGroupUUID = generateUUID();
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
  const assetsCatalogBuildUUID = generateUUID();

  // Framework references
  const cocoaFrameworkRefUUID = generateUUID();
  const cocoaFrameworkBuildUUID = generateUUID();

  // Create file references for source files
  const fileRefs: Record<string, any> = {};
  const buildFiles: Record<string, any> = {};
  const sourceBuildFileUUIDs: string[] = [];
  const mainGroupChildren: string[] = [];

  for (const filePath of sourceFiles) {
    const fileRefUUID = generateUUID();
    const buildFileUUID = generateUUID();
    
    fileRefs[fileRefUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: getFileType(filePath),
      path: filePath,
      sourceTree: '<group>',
    };
    
    buildFiles[buildFileUUID] = {
      isa: 'PBXBuildFile',
      fileRef: fileRefUUID,
    };
    
    sourceBuildFileUUIDs.push(buildFileUUID);
    mainGroupChildren.push(fileRefUUID);
  }

  // Info.plist reference
  const infoPlistRefUUID = generateUUID();
  fileRefs[infoPlistRefUUID] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'text.plist.xml',
    path: infoPlistPath,
    sourceTree: '<group>',
  };
  mainGroupChildren.push(infoPlistRefUUID);

  // Entitlements reference (if provided)
  let entitlementsRefUUID: string | undefined;
  if (options.entitlementsPath) {
    entitlementsRefUUID = generateUUID();
    fileRefs[entitlementsRefUUID] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.entitlements',
      path: options.entitlementsPath,
      sourceTree: '<group>',
    };
    mainGroupChildren.push(entitlementsRefUUID);
  }

  // Assets.xcassets reference (for app icon)
  const assetsCatalogUUID = generateUUID();
  fileRefs[assetsCatalogUUID] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'folder.assetcatalog',
    path: 'Assets.xcassets',
    sourceTree: '<group>',
  };
  mainGroupChildren.push(assetsCatalogUUID);

  // Cocoa framework reference
  fileRefs[cocoaFrameworkRefUUID] = {
    isa: 'PBXFileReference',
    lastKnownFileType: 'wrapper.framework',
    name: 'Cocoa.framework',
    path: 'System/Library/Frameworks/Cocoa.framework',
    sourceTree: 'SDKROOT',
  };

  buildFiles[cocoaFrameworkBuildUUID] = {
    isa: 'PBXBuildFile',
    fileRef: cocoaFrameworkRefUUID,
  };

  // Assets catalog build file
  buildFiles[assetsCatalogBuildUUID] = {
    isa: 'PBXBuildFile',
    fileRef: assetsCatalogUUID,
  };

  // Product reference
  fileRefs[productRefUUID] = {
    isa: 'PBXFileReference',
    explicitFileType: 'wrapper.application',
    includeInIndex: 0,
    path: `${projectName}.app`,
    sourceTree: 'BUILT_PRODUCTS_DIR',
  };

  // Build settings for target
  const baseBuildSettings: Record<string, any> = {
    ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: '',
    CLANG_CXX_LANGUAGE_STANDARD: 'gnu++20',
    CLANG_ENABLE_MODULES: 'YES',
    CLANG_ENABLE_OBJC_ARC: 'YES',
    CLANG_ENABLE_OBJC_WEAK: 'YES',
    CODE_SIGN_STYLE: 'Automatic',
    COMBINE_HIDPI_IMAGES: 'YES',
    CURRENT_PROJECT_VERSION: '1',
    DEVELOPMENT_TEAM: teamId,
    GENERATE_INFOPLIST_FILE: 'NO',
    INFOPLIST_FILE: infoPlistPath,
    INFOPLIST_KEY_NSMainNibFile: '',
    INFOPLIST_KEY_NSPrincipalClass: 'NSApplication',
    LD_RUNPATH_SEARCH_PATHS: '$(inherited) @executable_path/../Frameworks',
    MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
    MARKETING_VERSION: '1.0',
    PRODUCT_BUNDLE_IDENTIFIER: bundleId,
    PRODUCT_NAME: '$(TARGET_NAME)',
    SDKROOT: 'macosx',
    SWIFT_EMIT_LOC_STRINGS: 'YES',
  };

  // Add entitlements if provided
  if (options.entitlementsPath) {
    baseBuildSettings.CODE_SIGN_ENTITLEMENTS = options.entitlementsPath;
  }

  // Build configurations for target
  const debugConfig = {
    isa: 'XCBuildConfiguration',
    name: 'Debug',
    buildSettings: {
      ...baseBuildSettings,
      DEBUG_INFORMATION_FORMAT: 'dwarf',
      GCC_DYNAMIC_NO_PIC: 'NO',
      GCC_OPTIMIZATION_LEVEL: '0',
      GCC_PREPROCESSOR_DEFINITIONS: ['DEBUG=1', '$(inherited)'],
      MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
      MTL_FAST_MATH: 'YES',
    },
  };

  const releaseConfig = {
    isa: 'XCBuildConfiguration',
    name: 'Release',
    buildSettings: {
      ...baseBuildSettings,
      COPY_PHASE_STRIP: 'NO',
      DEBUG_INFORMATION_FORMAT: 'dwarf-with-dsym',
      ENABLE_NS_ASSERTIONS: 'NO',
      MTL_ENABLE_DEBUG_INFO: 'NO',
      MTL_FAST_MATH: 'YES',
    },
  };

  // Project-level build settings
  const projectBuildSettings = {
    ALWAYS_SEARCH_USER_PATHS: 'NO',
    CLANG_ANALYZER_NONNULL: 'YES',
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
    CLANG_CXX_LANGUAGE_STANDARD: 'gnu++20',
    CLANG_ENABLE_MODULES: 'YES',
    CLANG_ENABLE_OBJC_ARC: 'YES',
    CLANG_ENABLE_OBJC_WEAK: 'YES',
    CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING: 'YES',
    CLANG_WARN_BOOL_CONVERSION: 'YES',
    CLANG_WARN_COMMA: 'YES',
    CLANG_WARN_CONSTANT_CONVERSION: 'YES',
    CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS: 'YES',
    CLANG_WARN_DIRECT_OBJC_ISA_USAGE: 'YES_ERROR',
    CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
    CLANG_WARN_EMPTY_BODY: 'YES',
    CLANG_WARN_ENUM_CONVERSION: 'YES',
    CLANG_WARN_INFINITE_RECURSION: 'YES',
    CLANG_WARN_INT_CONVERSION: 'YES',
    CLANG_WARN_NON_LITERAL_NULL_CONVERSION: 'YES',
    CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF: 'YES',
    CLANG_WARN_OBJC_LITERAL_CONVERSION: 'YES',
    CLANG_WARN_OBJC_ROOT_CLASS: 'YES_ERROR',
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
    CLANG_WARN_RANGE_LOOP_ANALYSIS: 'YES',
    CLANG_WARN_STRICT_PROTOTYPES: 'YES',
    CLANG_WARN_SUSPICIOUS_MOVE: 'YES',
    CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
    CLANG_WARN_UNREACHABLE_CODE: 'YES',
    CLANG_WARN__DUPLICATE_METHOD_MATCH: 'YES',
    COPY_PHASE_STRIP: 'NO',
    ENABLE_STRICT_OBJC_MSGSEND: 'YES',
    GCC_C_LANGUAGE_STANDARD: 'gnu17',
    GCC_NO_COMMON_BLOCKS: 'YES',
    GCC_WARN_64_TO_32_BIT_CONVERSION: 'YES',
    GCC_WARN_ABOUT_RETURN_TYPE: 'YES_ERROR',
    GCC_WARN_UNDECLARED_SELECTOR: 'YES',
    GCC_WARN_UNINITIALIZED_AUTOS: 'YES_AGGRESSIVE',
    GCC_WARN_UNUSED_FUNCTION: 'YES',
    GCC_WARN_UNUSED_VARIABLE: 'YES',
    MACOSX_DEPLOYMENT_TARGET: minimumOsVersion,
    MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
    MTL_FAST_MATH: 'YES',
    SDKROOT: 'macosx',
  };

  const projectDebugConfig = {
    isa: 'XCBuildConfiguration',
    name: 'Debug',
    buildSettings: {
      ...projectBuildSettings,
      DEBUG_INFORMATION_FORMAT: 'dwarf',
      ENABLE_TESTABILITY: 'YES',
      GCC_DYNAMIC_NO_PIC: 'NO',
      GCC_OPTIMIZATION_LEVEL: '0',
      GCC_PREPROCESSOR_DEFINITIONS: ['DEBUG=1', '$(inherited)'],
      ONLY_ACTIVE_ARCH: 'YES',
    },
  };

  const projectReleaseConfig = {
    isa: 'XCBuildConfiguration',
    name: 'Release',
    buildSettings: {
      ...projectBuildSettings,
      DEBUG_INFORMATION_FORMAT: 'dwarf-with-dsym',
      ENABLE_NS_ASSERTIONS: 'NO',
      VALIDATE_PRODUCT: 'YES',
    },
  };

  // Build phases
  const sourcesPhase = {
    isa: 'PBXSourcesBuildPhase',
    buildActionMask: 2147483647,
    files: sourceBuildFileUUIDs,
    runOnlyForDeploymentPostprocessing: 0,
  };

  const frameworksPhase = {
    isa: 'PBXFrameworksBuildPhase',
    buildActionMask: 2147483647,
    files: [cocoaFrameworkBuildUUID],
    runOnlyForDeploymentPostprocessing: 0,
  };

  const resourcesPhase = {
    isa: 'PBXResourcesBuildPhase',
    buildActionMask: 2147483647,
    files: [assetsCatalogBuildUUID],
    runOnlyForDeploymentPostprocessing: 0,
  };

  // Configuration lists
  const targetConfigList = {
    isa: 'XCConfigurationList',
    buildConfigurations: [debugConfigUUID, releaseConfigUUID],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: 'Release',
  };

  const projectConfigList = {
    isa: 'XCConfigurationList',
    buildConfigurations: [projectDebugConfigUUID, projectReleaseConfigUUID],
    defaultConfigurationIsVisible: 0,
    defaultConfigurationName: 'Release',
  };

  // Native target
  const nativeTarget = {
    isa: 'PBXNativeTarget',
    buildConfigurationList: targetConfigListUUID,
    buildPhases: [sourcesPhaseUUID, frameworksPhaseUUID, resourcesPhaseUUID],
    buildRules: [],
    dependencies: [],
    name: projectName,
    productName: projectName,
    productReference: productRefUUID,
    productType: 'com.apple.product-type.application',
  };

  // Groups
  const mainGroup = {
    isa: 'PBXGroup',
    children: [...mainGroupChildren, frameworksGroupUUID, productsGroupUUID],
    sourceTree: '<group>',
  };

  const productsGroup = {
    isa: 'PBXGroup',
    children: [productRefUUID],
    name: 'Products',
    sourceTree: '<group>',
  };

  const frameworksGroup = {
    isa: 'PBXGroup',
    children: [cocoaFrameworkRefUUID],
    name: 'Frameworks',
    sourceTree: '<group>',
  };

  // Root project
  const rootObject = {
    isa: 'PBXProject',
    attributes: {
      BuildIndependentTargetsInParallel: 1,
      LastUpgradeCheck: '1500',
      TargetAttributes: {
        [targetUUID]: {
          CreatedOnToolsVersion: '15.0',
        },
      },
    },
    buildConfigurationList: projectConfigListUUID,
    compatibilityVersion: 'Xcode 14.0',
    developmentRegion: 'en',
    hasScannedForEncodings: 0,
    knownRegions: ['en', 'Base'],
    mainGroup: mainGroupUUID,
    productRefGroup: productsGroupUUID,
    projectDirPath: '',
    projectRoot: '',
    targets: [targetUUID],
  };

  // Assemble all objects
  const objects: Record<string, any> = {
    [rootObjectUUID]: rootObject,
    [mainGroupUUID]: mainGroup,
    [productsGroupUUID]: productsGroup,
    [frameworksGroupUUID]: frameworksGroup,
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

  const projectJson = {
    archiveVersion: 1,
    classes: {},
    objectVersion: 56,
    objects,
    rootObject: rootObjectUUID,
  };

  // Write project.pbxproj
  const pbxprojPath = path.join(xcodeProjectDir, 'project.pbxproj');
  const pbxprojContent = build(projectJson);
  await fs.writeFile(pbxprojPath, pbxprojContent);

  // Create xcscheme for the target
  const schemesDir = path.join(xcodeProjectDir, 'xcshareddata', 'xcschemes');
  await fs.ensureDir(schemesDir);
  
  const schemeContent = generateScheme(projectName, targetUUID);
  await fs.writeFile(path.join(schemesDir, `${projectName}.xcscheme`), schemeContent);

  return xcodeProjectDir;
}

/**
 * Generate xcscheme file content
 */
function generateScheme(projectName: string, targetUUID: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "${targetUUID}"
               BuildableName = "${projectName}.app"
               BlueprintName = "${projectName}"
               ReferencedContainer = "container:${projectName}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${targetUUID}"
            BuildableName = "${projectName}.app"
            BlueprintName = "${projectName}"
            ReferencedContainer = "container:${projectName}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "${targetUUID}"
            BuildableName = "${projectName}.app"
            BlueprintName = "${projectName}"
            ReferencedContainer = "container:${projectName}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>`;
}
