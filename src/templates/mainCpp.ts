/**
 * main.cpp template generator
 */

export function generateMainCpp(appName: string): string {
  return `/**
 * ${appName} - Obsidian Application
 * 
 * This is a minimal Obsidian app that demonstrates:
 * - Using the public Obsidian API
 * - Application lifecycle management
 * - Window creation and management
 * 
 * This example uses ONLY the public API - no internal headers are included.
 */

#include <iostream>
#include <obsidian/obsidian.h>

using namespace obsidian;

int main(int /* argc */, char* /* argv */[]) {
    std::cout << "=== ${appName} ===\\n\\n";
    
    // Create and initialize the application
    App app;
    
    if (!app.initialize()) {
        std::cerr << "Failed to initialize Obsidian application\\n";
        return 1;
    }
    std::cout << "Obsidian application initialized successfully\\n";
    
    // Create a window using the public API
    std::cout << "Creating window...\\n";
    Window window;
    
    if (!window.create(800, 600, "${appName}")) {
        std::cerr << "Failed to create window\\n";
        app.shutdown();
        return 1;
    }
    
    std::cout << "Window created successfully\\n";
    window.show();
    std::cout << "Window displayed\\n";
    
    // Set up application callbacks
    AppCallbacks callbacks;
    callbacks.onInit = []() {
        std::cout << "Application initialized\\n";
    };
    callbacks.onUpdate = []() {
        // In a real app, this would process events
    };
    callbacks.onShutdown = []() {
        std::cout << "Application shutting down\\n";
    };
    
    // Run the application event loop
    std::cout << "\\nRunning Obsidian application...\\n";
    std::cout << "Window should be visible. Close it to exit.\\n";
    
    // Run the application (this blocks until app quits)
    app.run(callbacks);
    
    // Cleanup is automatic (RAII), but we can be explicit
    window.close();
    app.shutdown();
    
    std::cout << "\\n=== Application exited ===\\n";
    return 0;
}
`;
}

