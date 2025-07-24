# @salesforce/mobile-web-mcp-server

A Model Context Protocol (MCP) server that provides expert grounding for implementing various mobile capabilities in Salesforce Lightning Web Components (LWC). This server hosts multiple tool suites targeting specific mobile web development use cases.

[![mobile-web coverage](https://codecov.io/gh/forcedotcom/mobile-mcp-tools/branch/main/graph/badge.svg?flag=mobile-web)](https://codecov.io/gh/forcedotcom/mobile-mcp-tools?flag=mobile-web)

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
- **Mobile Offline**: Analyze and fix offline compatibility issues

## Prerequisites

- Visual Studio Code or Cursor IDE (for debugging)

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

**Native Capabilities:**

- **App Review** (`sfmobile-web-app-review`): App store review functionality
- **AR Space Capture** (`sfmobile-web-ar-space-capture`): AR space data capture
- **Barcode Scanner** (`sfmobile-web-barcode-scanner`): Barcode scanning
- **Biometrics** (`sfmobile-web-biometrics`): Biometric authentication
- **Calendar** (`sfmobile-web-calendar`): Device calendar access
- **Contacts** (`sfmobile-web-contacts`): Device contacts management
- **Document Scanner** (`sfmobile-web-document-scanner`): Document scanning
- **Geofencing** (`sfmobile-web-geofencing`): Location-based geofencing
- **Location** (`sfmobile-web-location`): Device location services
- **NFC** (`sfmobile-web-nfc`): NFC functionality
- **Payments** (`sfmobile-web-payments`): Mobile payment processing

**Mobile Offline:**

- **Offline Guidance** (`sfmobile-web-offline-guidance`): Expert instructions for offline compatibility analysis
- **Offline Analysis** (`sfmobile-web-offline-analysis`): Static analysis for offline violations

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

## Debugging

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

6. Click "List Tools" to see available tools

7. Select a tool and click "Run Tool" to test it

8. If you set a breakpoint, execution will pause there for debugging

## Project Structure

```
src/
  tools/                    # Tool implementations
    mobile-offline/         # Mobile Offline tool suite
      offline-analysis/     # Static analysis tool
      offline-guidance/     # Expert guidance tool
    native-capabilities/    # Native Capabilities tool suite
      appReview/            # App Review tool
      arSpaceCapture/       # AR Space Capture tool
      barcodeScanner/       # Barcode Scanner tool
      biometrics/           # Biometrics tool
      calendar/             # Calendar tool
      contacts/             # Contacts tool
      documentScanner/      # Document Scanner tool
      geofencing/           # Geofencing tool
      location/             # Location tool
      nfc/                  # NFC tool
      payments/             # Payments tool
  schemas/                  # Zod schema definitions
  index.ts                  # MCP server entry point
resources/                  # TypeScript declarations and resources
  mobileCapabilities.d.ts   # Main mobile capabilities declarations
  BaseCapability.d.ts       # Base capability interface
  appReview/                # App review specific declarations
  barcodeScanner/           # Barcode scanner specific declarations
  # ... other capability-specific directories
tests/                      # Unit tests
  tools/                    # Tool-specific tests
dist/                       # Compiled JavaScript output
```

## Documentation

For comprehensive documentation about this MCP server, including tool suite designs and technical implementation details, see:

- [Salesforce Mobile Web MCP Server](../../docs/2_salesforce-mobile-web-mcp-server.md)
- [Mobile Native Capabilities](../../docs/3_mobile_native_capabilities.md)
- [Mobile Offline](../../docs/4_mobile_offline.md)

## Contributing

1. Make a fork of the repo and create a feature branch
2. Make your changes
3. Run tests: `npm run test` (from this package directory) or `npm run test:all` (from monorepo root)
4. Submit a pull request

## License

MIT
