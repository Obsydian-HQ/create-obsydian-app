/**
 * Generate main.m template with Obsydian framework
 * Creates an app using the Obsydian framework API
 */

export function generateMainWithFramework(projectName: string): string {
  return `/**
 * ${projectName} - Built with Obsydian Framework
 * 
 * This app uses the Obsydian framework for cross-platform UI components.
 */

#include <obsidian/obsidian.h>
#import <Cocoa/Cocoa.h>

using namespace obsidian;

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // Initialize Obsydian app
        App app;
        app.initialize();
        
        // Create a window using Obsydian API
        Window window;
        window.create(800, 600, "${projectName}");
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
            std::cout << "${projectName} initialized!" << std::endl;
        };
        
        app.run(callbacks);
    }
    return 0;
}
`;
}
