/**
 * Generate main.cpp template
 * Creates a simple standalone macOS/iOS app using native APIs
 */

export function generateMainCpp(projectName: string): string {
  return `/**
 * ${projectName} - Built with Obsydian
 * 
 * This is a standalone native app. The Obsidian framework
 * can be added later for cross-platform UI components.
 */

#import <Cocoa/Cocoa.h>

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property (strong, nonatomic) NSWindow *window;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    // Create the main window
    NSRect frame = NSMakeRect(0, 0, 800, 600);
    NSWindowStyleMask style = NSWindowStyleMaskTitled | 
                              NSWindowStyleMaskClosable | 
                              NSWindowStyleMaskMiniaturizable | 
                              NSWindowStyleMaskResizable;
    
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                              styleMask:style
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    
    [self.window setTitle:@"${projectName}"];
    [self.window center];
    
    // Create a simple label
    NSTextField *label = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 400, 100)];
    [label setStringValue:@"Welcome to ${projectName}!"];
    [label setBezeled:NO];
    [label setDrawsBackground:NO];
    [label setEditable:NO];
    [label setSelectable:NO];
    [label setAlignment:NSTextAlignmentCenter];
    [label setFont:[NSFont systemFontOfSize:32 weight:NSFontWeightMedium]];
    [label setTextColor:[NSColor labelColor]];
    
    // Center the label in the window
    NSView *contentView = [self.window contentView];
    [label setTranslatesAutoresizingMaskIntoConstraints:NO];
    [contentView addSubview:label];
    
    [NSLayoutConstraint activateConstraints:@[
        [label.centerXAnchor constraintEqualToAnchor:contentView.centerXAnchor],
        [label.centerYAnchor constraintEqualToAnchor:contentView.centerYAnchor]
    ]];
    
    [self.window makeKeyAndOrderFront:nil];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        [app setDelegate:delegate];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app activateIgnoringOtherApps:YES];
        [app run];
    }
    return 0;
}
`;
}

/**
 * Generate main.m for Objective-C projects
 */
export function generateMainObjC(projectName: string): string {
  return generateMainCpp(projectName);
}
