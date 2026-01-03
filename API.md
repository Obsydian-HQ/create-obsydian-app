# Obsydian Framework API Reference

Complete API reference for the Obsydian framework.

## Core API

### `obsidian::App`

Application lifecycle management.

#### Methods

- `void initialize()` - Initialize the Obsydian application
- `void run(AppCallbacks& callbacks)` - Run the application event loop

#### Example

```cpp
App app;
app.initialize();

AppCallbacks callbacks;
callbacks.onInit = []() {
    std::cout << "App initialized" << std::endl;
};

app.run(callbacks);
```

### `obsidian::AppCallbacks`

Application lifecycle callbacks.

#### Callbacks

- `std::function<void()> onInit` - Called when app initializes
- `std::function<void()> onShutdown` - Called when app shuts down

### `obsidian::Window`

Window creation and management.

#### Methods

- `void create(int width, int height, const std::string& title)` - Create a window
- `void show()` - Show the window
- `void close()` - Close the window
- `bool isValid() const` - Check if window is valid

#### Example

```cpp
Window window;
window.create(800, 600, "My Window");
window.show();
```

## UI Components

### `obsidian::Button`

Interactive button component.

#### Methods

- `void create(const std::string& title, int x, int y, int width, int height)` - Create a button
- `void setTitle(const std::string& title)` - Set button title
- `void setOnClick(std::function<void()> callback)` - Set click handler
- `void setEnabled(bool enabled)` - Enable/disable button
- `void setVisible(bool visible)` - Show/hide button
- `void addToWindow(Window& window)` - Add button to window
- `void removeFromParent()` - Remove button from parent
- `bool isValid() const` - Check if button is valid

#### Example

```cpp
Button button;
button.create("Click Me", 100, 100, 150, 40);
button.setOnClick([]() {
    std::cout << "Button clicked!" << std::endl;
});
button.addToWindow(window);
```

### `obsidian::TextField`

Single-line text input field.

#### Methods

- `void create(const std::string& placeholder, int x, int y, int width, int height)` - Create text field
- `std::string getText() const` - Get text content
- `void setText(const std::string& text)` - Set text content
- `void setPlaceholder(const std::string& placeholder)` - Set placeholder text
- `void setEnabled(bool enabled)` - Enable/disable text field
- `void setVisible(bool visible)` - Show/hide text field
- `void addToWindow(Window& window)` - Add to window
- `void removeFromParent()` - Remove from parent
- `bool isValid() const` - Check if text field is valid

### `obsidian::TextView`

Multi-line text display component.

#### Methods

- `void create(int x, int y, int width, int height)` - Create text view
- `std::string getText() const` - Get text content
- `void setText(const std::string& text)` - Set text content
- `void appendText(const std::string& text)` - Append text
- `void setEditable(bool editable)` - Set editable state
- `void setVisible(bool visible)` - Show/hide text view
- `void addToWindow(Window& window)` - Add to window
- `void removeFromParent()` - Remove from parent
- `bool isValid() const` - Check if text view is valid

### `obsidian::ScrollView`

Scrollable content area.

#### Methods

- `void create(int x, int y, int width, int height)` - Create scroll view
- `void setDocumentView(TextView& textView)` - Set document view
- `void setVisible(bool visible)` - Show/hide scroll view
- `void addToWindow(Window& window)` - Add to window
- `void removeFromParent()` - Remove from parent
- `bool isValid() const` - Check if scroll view is valid

### `obsidian::Table`

Data table component.

#### Methods

- `void create(int x, int y, int width, int height)` - Create table
- `void addColumn(const std::string& title, const std::string& identifier, int width)` - Add column
- `void addRow(const std::vector<std::string>& data)` - Add row
- `void removeRow(int index)` - Remove row
- `void clear()` - Clear all rows
- `int getRowCount() const` - Get row count
- `int getColumnCount() const` - Get column count
- `std::string getRowData(int row, int column) const` - Get cell data
- `void setRowData(int row, const std::vector<std::string>& data)` - Set row data
- `int getSelectedRow() const` - Get selected row index
- `void setSelectedRow(int row)` - Set selected row
- `void setOnSelection(std::function<void(int)> callback)` - Set selection handler
- `void setEnabled(bool enabled)` - Enable/disable table
- `void setVisible(bool visible)` - Show/hide table
- `void addToWindow(Window& window)` - Add to window
- `void removeFromParent()` - Remove from parent
- `bool isValid() const` - Check if table is valid

### `obsidian::List`

List view component.

#### Methods

- `void create(int x, int y, int width, int height)` - Create list
- `void addItem(const std::string& item)` - Add item
- `void removeItem(int index)` - Remove item
- `void setItem(int index, const std::string& item)` - Set item
- `std::string getItem(int index) const` - Get item
- `int getItemCount() const` - Get item count
- `void clear()` - Clear all items
- `int getSelectedIndex() const` - Get selected index
- `void setSelectedIndex(int index)` - Set selected index
- `void setOnSelection(std::function<void(int)> callback)` - Set selection handler
- `void setEnabled(bool enabled)` - Enable/disable list
- `void setVisible(bool visible)` - Show/hide list
- `void addToWindow(Window& window)` - Add to window
- `void removeFromParent()` - Remove from parent
- `bool isValid() const` - Check if list is valid

## System Integration

### `obsidian::Process`

Process execution and management.

#### Methods

- `void create(const std::string& command, const std::vector<std::string>& args, const std::string& workingDirectory)` - Create process
- `void start()` - Start the process
- `void terminate()` - Terminate the process
- `void waitUntilExit()` - Wait for process to exit
- `int getPid() const` - Get process ID
- `int getExitCode() const` - Get exit code
- `bool isRunning() const` - Check if process is running
- `bool isValid() const` - Check if process is valid
- `void setOnStdout(std::function<void(const std::string&)> callback)` - Set stdout handler
- `void setOnStderr(std::function<void(const std::string&)> callback)` - Set stderr handler
- `void setOnTermination(std::function<void(int)> callback)` - Set termination handler
- `void setOnError(std::function<void(const std::string&)> callback)` - Set error handler

#### Example

```cpp
Process process;
process.create("/usr/bin/ls", {"-la"}, "/tmp");
process.setOnStdout([](const std::string& output) {
    std::cout << output << std::endl;
});
process.start();
process.waitUntilExit();
```

### `obsidian::ProcessList`

System process enumeration.

#### Methods

- `std::vector<ProcessInfo> getAllProcesses()` - Get all running processes
- `bool getProcessInfo(int pid, ProcessInfo& info)` - Get process info
- `bool killProcess(int pid)` - Kill a process

## Platform Support

### macOS

Full support for all components on macOS 14.0+.

### iOS

iOS support is in development. Currently, the framework builds for macOS only.

## Error Handling

All components validate their state. Check `isValid()` before using components:

```cpp
Window window;
window.create(800, 600, "My Window");
if (!window.isValid()) {
    std::cerr << "Failed to create window" << std::endl;
    return 1;
}
```

## Thread Safety

The Obsydian framework is **not thread-safe**. All API calls must be made from the main thread.

## Memory Management

Components use RAII (Resource Acquisition Is Initialization). They automatically clean up when they go out of scope.

## Best Practices

1. **Always check `isValid()`** before using components
2. **Use callbacks** for event handling
3. **Initialize App** before creating windows
4. **Run on main thread** - all API calls must be on the main thread
5. **Handle errors** - check return values and use `isValid()`
