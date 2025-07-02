# mobile-mcp-tools

A collection of Model Context Protocol (MCP) tools for Salesforce Mobile Web applications. These tools provide expert grounding for implementing various mobile capabilities in Salesforce Lightning Web Components (LWC).

[![Codecov](https://codecov.io/gh/forcedotcom/mobile-mcp-tools/branch/main/graph/badge.svg?flag=monorepo)](https://codecov.io/gh/forcedotcom/mobile-mcp-tools?flag=monorepo)
[![mobile-web coverage](https://codecov.io/gh/forcedotcom/mobile-mcp-tools/branch/main/graph/badge.svg?flag=mobile-web)](https://codecov.io/gh/forcedotcom/mobile-mcp-tools?flag=mobile-web)
[![Build Status](https://github.com/forcedotcom/mobile-mcp-tools/workflows/run-tests/badge.svg)](https://github.com/forcedotcom/mobile-mcp-tools/actions)

## Features

- **App Review**: Implement app store review functionality
- **AR Space Capture**: Capture and process AR space data
- **Barcode Scanner**: Scan and process barcodes
- **Biometrics**: Implement biometric authentication
- **Calendar**: Access and manage device calendar
- **Contacts**: Access and manage device contacts
- **Document Scanner**: Scan and process documents
- **Geofencing**: Implement location-based geofencing
- **Location**: Access device location services
- **NFC**: Implement NFC functionality
- **Payments**: Process mobile payments

## Prerequisites

- Visual Studio Code or Cursor IDE (for debugging)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/forcedotcom/mobile-mcp-tools.git
cd mobile-mcp-tools
```

2. Install dependencies:

```bash
npm install
```

## MCP Server Configuration

To use this MCP server with various AI assistants and code editors, you'll need to add it to their MCP configuration files. Below are instructions for the most popular MCP-compatible clients.

### Claude Desktop

1. **Locate your configuration file:**
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **Add the server configuration:**

   ```json
   {
     "mcpServers": {
       "mobile-web": {
         "command": "npx",
         "args": ["-y", "@salesforce/mobile-web-mcp-server"],
         "env": {}
       }
     }
   }
   ```

   Or if you're running from a local build:

   ```json
   {
     "mcpServers": {
       "mobile-web": {
         "command": "node",
         "args": ["./packages/mobile-web/dist/index.js"],
         "env": {}
       }
     }
   }
   ```

3. **Restart Claude Desktop** completely to load the new configuration.

### Cursor

Add this configuration to your Cursor `mcp.json` file (typically located in the `.cursor` directory):

```json
{
  "mcpServers": {
    "mobile-web": {
      "command": "npx",
      "args": ["-y", "@salesforce/mobile-web-mcp-server"],
      "env": {}
    }
  }
}
```

### Cline (VS Code Extension)

Add this configuration to your Cline MCP settings file:

- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "mobile-web": {
      "command": "npx",
      "args": ["-y", "@salesforce/mobile-web-mcp-server"],
      "env": {}
    }
  }
}
```

### Windsurf

Add this configuration to your Windsurf `mcp_config.json` file:

- **Windows**: `%APPDATA%\WindSurf\mcp_settings.json`
- **macOS**: `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "mobile-web": {
      "command": "npx",
      "args": ["-y", "@salesforce/mobile-web-mcp-server"],
      "env": {}
    }
  }
}
```

### Zed

Add this configuration to your Zed `settings.json`:

```json
{
  "context_servers": {
    "mobile-web": {
      "command": {
        "path": "npx",
        "args": ["-y", "@salesforce/mobile-web-mcp-server"],
        "env": {}
      }
    }
  }
}
```

### Local Development Configuration

If you're running from a local build instead of the npm package, replace the command configuration in any of the above clients with:

```json
{
  "command": "node",
  "args": ["./packages/mobile-web/dist/index.js"],
  "env": {}
}
```

Make sure to adjust the path relative to where you're running the client from.

### Available Tools

Once configured, you'll have access to the following mobile capability tools:

- **App Review** (`sfmobile-web-appReview`): App store review functionality
- **AR Space Capture** (`sfmobile-web-arSpaceCapture`): AR space data capture
- **Barcode Scanner** (`sfmobile-web-barcodeScanner`): Barcode scanning
- **Biometrics** (`sfmobile-web-biometrics`): Biometric authentication
- **Calendar** (`sfmobile-web-calendar`): Device calendar access
- **Contacts** (`sfmobile-web-contacts`): Device contacts management
- **Document Scanner** (`sfmobile-web-documentScanner`): Document scanning
- **Geofencing** (`sfmobile-web-geofencing`): Location-based geofencing
- **Location** (`sfmobile-web-location`): Device location services
- **NFC** (`sfmobile-web-nfc`): NFC functionality
- **Payments** (`sfmobile-web-payments`): Mobile payment processing

### Verifying Your Configuration

After adding the configuration and restarting your client:

- **Claude Desktop**: Look for the mobile-web tools in the tools panel when starting a new conversation
- **Cursor**: Check that the MCP server appears in your MCP status indicator
- **Cline**: The tools should be available in the Cline sidebar
- **Windsurf**: MCP tools will appear in the context menu
- **Zed**: Context servers will be shown in the status bar

### Testing the Connection

You can test that the server is working by asking your AI assistant to:

```
"Show me how to implement biometric authentication in a Salesforce Lightning Web Component"
```

The assistant should use the biometrics tool to provide you with detailed implementation guidance including type definitions and code examples.

## Development

### Build

Build all packages:

```bash
npm run build:all
```

### Testing

Run all unit tests:

```bash
npm run test:all
```

### Debugging

The project includes a VS Code/Cursor debug configuration for testing with the MCP Inspector:

1. Set breakpoints in your TypeScript files
2. Press `F5` or select `Run > Start Debugging`
3. The debugger will start and attach to the MCP server

You should see the following output:

```bash
Starting MCP inspector...
Debugger attached.
⚙️ Proxy server listening on port 6277
Debugger attached.
🔍 MCP Inspector is up and running at http://127.0.0.1:6274 🚀
```

4. Open the MCP Inspector URL (e.g., http://127.0.0.1:6274)
5. Click "Connect" to connect to the MCP server

![image](https://github.com/user-attachments/assets/7886de99-3a9c-46a3-9749-1c2334c17ff2)

6. Click "List Tools" to see available tools
   ![image](https://github.com/user-attachments/assets/dc38c37c-04ed-41e5-8af8-69978694841f)

7. Select a tool and click "Run Tool" to test it
   ![image](https://github.com/user-attachments/assets/0a128ee3-74f3-44d0-ad27-6cf8bf3825dd)

8. If you set a breakpoint, execution will pause there for debugging
   ![image](https://github.com/user-attachments/assets/e77d36da-6f5f-4edf-bb47-e2aecc4e53d6)

## Project Structure

```
packages/
  mobile-web/
    src/
      tools/           # Tool implementations
        appReview/     # App Review tool
        arSpaceCapture/# AR Space Capture tool
        barcodeScanner/# Barcode Scanner tool
        biometrics/    # Biometrics tool
        calendar/      # Calendar tool
        contacts/      # Contacts tool
        documentScanner/# Document Scanner tool
        geofencing/    # Geofencing tool
        location/      # Location tool
        nfc/          # NFC tool
        payments/     # Payments tool
      utils/          # Utility functions
    resources/        # Type definitions
    tests/           # Unit tests
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test:all`
4. Submit a pull request

## License

MIT
