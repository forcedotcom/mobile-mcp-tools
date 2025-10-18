# Proof of Life: Contact List Mobile App - Implementation Plan

## Overview

**This is a living document** that outlines the specific implementation requirements for our first technology preview iteration: an end-to-end workflow that transforms a user utterance into a functioning mobile app displaying a list of Salesforce Contacts.

**Current Iteration Scope**: This first iteration of the document represents a waypoint to define the basic scaffolding of a "happy path" end-to-end flow. It by no means fully defines the end deliverable for customers, but rather establishes the foundational workflow and tooling architecture.

**Evolution Plan**: As we evolve past our proof-of-life iteration, we will evolve this document to flesh out the necessary features for our next steps. The purpose of this document is to:

- Cover the work we're doing right now
- Evolve to reflect the details of the work to come
- Maintain a living reference for implementation teams

**Alignment Note**: This implementation plan directly implements the principles and architecture outlined in [`5_mobile_native_app_generation.md`](./5_mobile_native_app_generation.md), serving as a concrete proof-of-concept for the instruction-first, three-phase workflow approach.

## Success Criteria

**User Journey**: From utterance _"I want an iOS mobile app that will show me a list of all of my Salesforce Contacts"_ to a running mobile app displaying Contacts in a simulator/emulator.

**Technical Validation**: Demonstrates instruction-first MCP tools successfully guiding an LLM through the Plan → Run workflow with orchestration.

---

## Prerequisites and Assumptions

### Environment Assumptions (Happy Path Focus)

- User is on a supported development platform (macOS for iOS development, macOS/Windows/Linux for Android development)
- User is using Cursor IDE for agentic development
- Pre-installed tools:
  - `@salesforce/mobile-native-mcp-server` MCP server
  - Salesforce CLI with `sfdx-mobilesdk-plugin` and `@salesforce/lwc-dev-mobile` plugins
  - Platform-specific development tools will be validated based on target platform (Xcode for iOS, Android Studio for Android)
- User has a pre-configured Salesforce Connected App with credentials set in environment variables:
  - `CONNECTED_APP_CONSUMER_KEY`: Connected App Consumer Key (Client ID)
  - `CONNECTED_APP_CALLBACK_URL`: Connected App Callback URI for OAuth redirects

### Resource Paths

- `<ServerRoot>`: Filesystem path to `@salesforce/mobile-native-mcp-server` package contents
- Templates located at: `<ServerRoot>/templates/` (Git submodule pointing to [SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates))
- Workflow artifacts directory: `~/.magen/` (or `$PROJECT_PATH/.magen/` if `PROJECT_PATH` environment variable is set)

---

## High-Level Agentic Workflow

### Instruction-First Approach

1. **User utterance**: _"I want an iOS mobile app that will show me a list of all of my Salesforce Contacts."_

2. **LLM calls Orchestrator** → `sfmobile-native-project-manager` manages workflow execution

3. **Workflow Execution**: Orchestrator manages state transitions and tool invocations through the following phases:

   **Environment Validation Phase**:
   - Validates Connected App credentials in environment variables
   - Terminates with clear guidance if prerequisites not met

   **User Input Collection Phase**:
   - Multi-turn conversation to gather required project properties
   - LLM-based extraction from user utterances
   - Dynamic question generation for missing properties
   - Loop continues until all properties collected

   **Plan Phase**:
   - Template Discovery → Project Generation → Build Validation

   **Run Phase**:
   - Deployment to simulator/emulator

   **Completion Phase**:
   - Success confirmation or failure reporting with guidance

4. **Tool Invocation Patterns**: The workflow uses two functionally equivalent approaches for MCP tool invocation:

   **Direct Node-Based Invocation**:
   - Workflow nodes directly invoke MCP tools via `interrupt()` and `ToolExecutor`
   - Orchestrator surfaces tool invocation to LLM with comprehensive guidance
   - LLM executes tool instructions and returns results to orchestrator
   - Workflow resumes with next node based on results
   - Used for: Template discovery, project generation, deployment, completion/failure

   **Service-Based Invocation**:
   - Workflow nodes invoke **services** (`src/workflow/services/`) that encapsulate MCP tool invocations
   - Services provide reusable abstraction layer over tool execution
   - Services extend `AbstractService` base class for standardized patterns and dependency injection
   - Used for: Input extraction, user input collection, build validation, build recovery

   **Service Layer Rationale**: Services were introduced to package MCP tool invocations that are likely to be reused across multiple workflow nodes. Viewing workflow nodes as business processes, multiple processes may require common capabilities (e.g., user input collection, property extraction). The service layer provides this reusability. In future iterations, all MCP tool invocations may migrate to the service pattern for consistency and reusability. For this steel thread, services represent tool invocations anticipated to have cross-node utility.

5. **State Persistence**: Workflow state is persisted to `.magen` directory after each tool invocation, enabling workflow resumption across sessions

---

## MCP Server Tool Specifications

### Orchestration Tool

#### `sfmobile-native-project-manager`

**Purpose**: LangGraph-based workflow orchestrator that manages the complete mobile app generation process through human-in-the-loop pattern and instruction-first MCP tools

**Input Schema**:

```typescript
{
  userInput?: Record<string, unknown>; // Structured data from initial request or previously executed MCP tool
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation (auto-generated if not provided)
  };
}
```

**Design Note**: `userInput` is typed as `Record<string, unknown>` rather than `unknown` or `any` to prevent LLM hallucinations when constructing structured responses. This constraint encourages LLMs to produce valid JSON object structures when resuming workflows with tool outputs.

**Workflow Architecture**: Implements StateGraph with the following nodes and flow:

1. **validateEnvironment** → Validates environment prerequisites (Connected App configuration) before proceeding
2. **checkEnvironmentValidated** → Routes to failure if environment is invalid, otherwise continues
3. **initialUserInputExtraction** → `interrupt()` → `sfmobile-native-input-extraction` tool (extracts structured properties from user input)
4. **checkPropertiesFulfilled** → Conditional router checking if all required properties are collected
5. **getUserInput** → `interrupt()` → `sfmobile-native-get-input` tool (prompts user for all missing properties)
6. **templateDiscovery** → `interrupt()` → `sfmobile-native-template-discovery` tool
7. **projectGeneration** → `interrupt()` → `sfmobile-native-project-generation` tool
8. **buildValidation** → `interrupt()` → `sfmobile-native-build` tool
9. **checkBuildSuccessful** → Conditional router checking if build succeeded
10. **buildRecovery** → `interrupt()` → `sfmobile-native-build-recovery` tool (if build failed, attempts automatic fixes)
11. **deployment** → `interrupt()` → `sfmobile-native-deployment` tool (only after successful build)
12. **completion** → `interrupt()` → `sfmobile-native-completion` tool
13. **failure** → `interrupt()` → `sfmobile-native-failure` tool (on fatal errors or max retries exceeded)

**Output**: Natural language orchestration instructions embedding tool invocation data and workflow state:

```typescript
{
  orchestrationInstructionsPrompt: string; // Natural language prompt with embedded tool invocation instructions and workflow state
}
```

**Execution Pattern**:

- Each `interrupt()` surfaces tool invocation metadata to orchestrator
- Orchestrator creates natural language prompt embedding tool invocation instructions
- Orchestrator returns orchestration prompt to MCP client
- LLM receives orchestration prompt with specific tool name, input schema, and input values
- LLM invokes specified instruction-first tool and executes guidance
- LLM re-invokes orchestrator with tool results as structured `userInput` (Record<string, unknown>)
- Workflow resumes from checkpoint with `new Command({ resume: results })`

**Example Orchestration Prompt**:

````markdown
# Your Role

You are participating in a workflow orchestration process. The current (`sfmobile-native-project-manager`) MCP server tool is the orchestrator, and is sending you instructions on what to do next. These instructions describe the next participating MCP server tool to invoke, along with its input schema and input values.

# Your Task

- Invoke the following MCP server tool:

**MCP Server Tool Name**: sfmobile-native-template-discovery
**MCP Server Tool Input Schema**:

```json
{
  "type": "object",
  "properties": {
    "platform": {
      "type": "string",
      "enum": ["iOS", "Android"]
    }
  },
  "required": ["platform"]
}
```

**MCP Server Tool Input Values**:

```json
{
  "platform": "iOS"
}
```

## Additional Input: `workflowStateData`

`workflowStateData` is an additional input parameter that is specified in the input schema above, and should be passed
to the next MCP server tool invocation, with the following object value:

```json
{
  "thread_id": "mobile-1699123456-a7b2c9"
}
```

This represents opaque workflow state data that should be round-tripped back to the `sfmobile-native-project-manager`
MCP server tool orchestrator at the completion of the next MCP server tool invocation, without modification. These
instructions will be further specified by the next MCP server tool invocation.

- The MCP server tool you invoke will respond with its output, along with further instructions for continuing the workflow.
````

**Steel Thread Workflow State**: The workflow maintains comprehensive state including:

- Core workflow data: `userInput`, `platform`
- Plan phase state: `validEnvironment`, `workflowFatalErrorMessages`, `selectedTemplate`, `projectName`, `projectPath`, `packageName`, `organization`, `connectedAppClientId`, `connectedAppCallbackUri`, `loginHost`
- Build and deployment state: `buildType`, `targetDevice`, `buildSuccessful`, `buildAttemptCount`, `buildErrorMessages`, `maxBuildRetries`, `buildOutputFilePath`, `recoveryReadyForRetry`, `deploymentStatus`

**Workflow State Persistence**: State is persisted using JSON-based checkpointing, stored in the `.magen/workflow-state.json` file in the user's home directory (or `$PROJECT_PATH` if specified). This approach ensures reliable cross-platform compatibility without binary dependencies.

---

### User Input Collection Tools

The workflow implements a sophisticated multi-turn conversation system to gather all required project properties from the user. This system uses three coordinated tools to extract information, generate contextual questions, and collect user responses.

**Required Properties Collected**:

The workflow collects the following properties from user input:

- **platform**: Target mobile platform (iOS or Android)
- **projectName**: Name for the generated mobile app project
- **packageName**: Package identifier (e.g., `com.company.appname`)
- **organization**: Organization or company name
- **loginHost**: Salesforce login host (e.g., `test.salesforce.com` for sandbox, `login.salesforce.com` for production)

#### `sfmobile-native-input-extraction`

**Purpose**: Extracts structured project properties from user utterances using LLM-based natural language understanding

**Input Schema**:

```typescript
{
  userUtterance: unknown;  // Raw user input in any format
  propertiesToExtract: Array<{
    propertyName: string;  // Property name to extract
    description: string;   // Property description for context
  }>;
  resultSchema: string;  // JSON schema defining expected output structure
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Instructions for analyzing user input against property requirements
- Schema validation guidance for extracted properties
- Structured output with successfully extracted and validated properties
- Next steps for workflow continuation

#### `sfmobile-native-get-input`

**Purpose**: Prompts users for all unfulfilled required properties and collects their responses

**Input Schema**:

```typescript
{
  propertiesRequiringInput: Array<{
    propertyName: string;    // Name of the property needing input
    friendlyName: string;    // User-friendly display name
    description: string;     // Description for context
  }>;
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Instructions for generating contextual questions for each property
- Guidance on presenting properties to the user (individually or in batch)
- Response collection and validation guidance
- User response captured for workflow processing
- Next steps for incorporating the response into workflow state

**Multi-Turn Workflow Pattern**: These tools work together in a loop orchestrated by the workflow graph:

1. `input-extraction` attempts to extract all required properties from initial user utterance
2. If properties are missing, `get-input` receives metadata for all unfulfilled properties
3. `get-input` generates contextual questions and presents them to the user (individually or as a batch)
4. `get-input` collects the user's response
5. Flow returns to `input-extraction` to parse the response and check for remaining missing properties
6. Loop continues until all required properties are collected

**Service-Based Invocation**: The user input collection tools are invoked via **agentic services** (`InputExtractionService`, `GetInputService`) that encapsulate the tool execution logic. This architectural approach provides:

- **Reusability**: These capabilities (extracting properties, collecting input) are likely to be needed across multiple workflow nodes and business processes
- **Encapsulation**: Services provide a clean abstraction layer over tool invocation mechanics
- **Enhanced Functionality**: Services add validation, filtering, and error handling around tool invocations
- **Testability**: Services are independently testable with dependency injection support
- **Type Safety**: Services provide strongly-typed interfaces and comprehensive result validation
- **Future-Proofing**: As the workflow evolves, these service patterns can be extended to other tool invocations for consistency

---

### Phase 1: Plan Tools

#### `sfmobile-native-template-discovery`

**Purpose**: Guides LLM through template discovery and selection

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Plugin verification: `sf plugins inspect sfdx-mobilesdk-plugin --json` (install with `sf plugins install sfdx-mobilesdk-plugin` if needed)
- Platform-specific CLI command: `sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/templates --doc --json`
- Template metadata interpretation guidance
- Selection criteria for Contact list requirements
- Result schema with `selectedTemplate` property
- Next steps for project generation

#### `sfmobile-native-project-generation`

**Purpose**: Guides LLM through project creation and Connected App configuration

**Input Schema**:

```typescript
{
  selectedTemplate: string;       // Template ID from template discovery
  projectName: string;            // Project name (e.g., "ContactListApp")
  platform: "iOS" | "Android";    // Platform for project generation
  packageName: string;            // Package identifier (e.g., "com.mycompany.contactlistapp")
  organization: string;           // Organization name
  connectedAppClientId: string;   // Connected App Client ID from environment
  connectedAppCallbackUri: string; // Connected App Callback URI from environment
  loginHost?: string;             // Optional Salesforce login host (e.g., https://test.salesforce.com)
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific CLI command: `sf mobilesdk ios|android createwithtemplate --templaterepouri=<ServerRoot>/templates/<selectedTemplate> --appname=<projectName> --packagename=<packageName> --organization=<organization> --outputdir=<outputDirectory>`
- Connected App configuration steps using provided credentials
- File modification instructions for OAuth setup (bootconfig.json, Info.plist/AndroidManifest.xml)
- Optional login host configuration if specified
- Result schema with `projectPath` property
- Next steps for build validation

#### `sfmobile-native-build`

**Purpose**: Guides LLM through initial build verification

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";  // Platform for build validation
  projectPath: string;          // Path to generated project
  projectName: string;          // Project name for build artifacts
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific build commands: `xcodebuild` for iOS projects, `./gradlew build` for Android projects
- Build output interpretation guidance for platform-specific tools
- Build output file capture for potential recovery analysis
- Result schema with `buildSuccessful` boolean property
- Next steps: deployment if successful, recovery if failed

#### `sfmobile-native-build-recovery`

**Purpose**: Analyzes build failures and attempts automated fixes for common issues

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";       // Platform for build recovery
  projectPath: string;               // Path to generated project
  projectName: string;               // Project name for build artifacts
  buildOutputFilePath: string;       // Path to failed build output file
  attemptNumber: number;             // Current build attempt number (for retry logic)
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Build output analysis and error pattern identification
- Platform-specific common build issues and solutions
- Automated fix attempts (e.g., dependency resolution, configuration corrections, file permissions)
- Result schema with `fixesAttempted` array and `readyForRetry` boolean
- Guidance on whether to retry build or escalate to user

**Build Recovery Loop**: The workflow implements an automatic recovery pattern:

1. Build validation attempts build
2. If build fails, `checkBuildSuccessful` router directs to build recovery
3. Build recovery analyzes errors and attempts fixes
4. Flow returns to build validation for retry
5. Loop continues up to `maxBuildRetries` attempts (default: 3)
6. After max retries, workflow fails with comprehensive error messages

---

### Run Phase Tools

#### `sfmobile-native-deployment`

**Purpose**: Guides LLM through deploying app to simulator/emulator

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";  // Platform for deployment
  projectPath: string;          // Path to generated project
  buildType?: "debug" | "release"; // Build type (defaults to "debug")
  targetDevice?: string;        // Optional target device identifier
  packageName: string;          // Package name for the mobile app
  projectName: string;          // Project name
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific CLI commands: `@salesforce/lwc-dev-mobile` plugin usage for deployment
- Device selection and management (iOS simulator, Android emulator)
- App launch verification steps
- Result schema with `deploymentStatus` property
- User interaction validation guidance

---

### Workflow Completion and Failure Tools

The workflow includes explicit tools for handling successful completion and fatal failures, ensuring clear communication of final workflow states.

#### `sfmobile-native-completion`

**Purpose**: Guides LLM through communicating successful workflow completion to the user

**Input Schema**:

```typescript
{
  projectPath: string;  // Path to the completed project
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Success message formatting
- Project location and next steps
- Instructions for running the deployed app
- Additional resources and documentation references

#### `sfmobile-native-failure`

**Purpose**: Communicates workflow failures and fatal errors to the user with actionable guidance

**Input Schema**:

```typescript
{
  messages: string[];  // Array of failure messages to display
  workflowStateData?: {
    thread_id: string;
  };
}
```

**Output**: Instruction-first guidance including:

- Clear explanation of failure reasons
- Formatted error messages from workflow state
- Troubleshooting guidance
- Next steps for resolution

---

### MCP Prompts

The server implements the MCP Prompts specification to provide predefined starting points for common workflows. Prompts enable users and LLMs to initiate workflows with appropriate context and guidance.

#### `mobile_app_project`

**Purpose**: Launch the Magen (Mobile App Generation) workflow to create a new mobile application project

**Arguments**:

```typescript
{
  platform: 'iOS' | 'Android'; // Target mobile platform
}
```

**Description**: This prompt initializes the `sfmobile-native-project-manager` orchestrator with the user's platform choice, launching the complete mobile app generation workflow including:

- User input collection for project properties
- Template discovery and selection
- Project generation with OAuth configuration
- Build validation with automatic recovery
- Deployment to simulator/emulator

**Usage**: Users can invoke this prompt through their MCP-enabled IDE or client to begin the mobile app generation process. The prompt provides a structured entry point that ensures all required context is collected before workflow execution.

---

## Template Repository Integration

### Template Source Design

**Architecture Decision**: The `@salesforce/mobile-native-mcp-server` package includes the official [SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates) repository as a Git submodule located at `<ServerRoot>/templates/`, serving as the primary template source with architecture designed to support additional template repositories in future iterations.

**Template Discovery Process**:

1. `sfmobile-native-template-discovery` tool uses `sfdx-mobilesdk-plugin` CLI commands
2. Executes platform-specific commands: `sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/templates --doc --json` for comprehensive template information
3. Parses structured JSON output including descriptions, use cases, features arrays, complexity ratings, and list of customization points
4. Optionally uses platform-specific commands: `sf mobilesdk ios|android describetemplate --template=<TemplateName> --templatesource=<ServerRoot>/templates --doc --json` for detailed template investigation
5. Returns template selection guidance to LLM with rich metadata and extensible architecture for future template repositories

**Integration with CLI Tools**:

- `sfdx-mobilesdk-plugin` CLI commands reference the templates directory as template source
- Templates are immediately available for project generation without additional downloads
- Consistent with standard Mobile SDK development workflows

---

## Template Metadata Access

### CLI-Delivered Metadata

The `sfdx-mobilesdk-plugin` CLI provides comprehensive template metadata through its `--doc --json` flags, enabling LLMs to make informed template selection and customization decisions:

#### Template Discovery Workflow

**Comprehensive Template Listing**:

```bash
sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/templates --doc --json
```

- **Structured Output**: JSON format optimized for LLM parsing and decision-making
- **Rich Descriptions**: Detailed use case guidance and feature explanations
- **Feature Tagging**: Structured arrays for precise capability matching
- **Complexity Assessment**: Ratings to guide appropriate template selection
- **Platform Filtering**: Automatic filtering for target development platform

**Detailed Template Investigation**:

```bash
sf mobilesdk ios|android describetemplate --template=<TemplateName> --templatesource=<ServerRoot>/templates --doc --json
```

- **Customization Points**: Comprehensive modification guidance with file-level instructions
- **Implementation Patterns**: Proven approaches for common template adaptations
- **Dependency Information**: Platform-specific requirements and version compatibility
- **Configuration Examples**: Specific guidance for Connected App setup and OAuth integration

### Metadata Content for LLM Decision-Making

Templates provide LLMs with guidance on:

- **Feature Capabilities**: Clear mapping between user requirements and template functionality
- **Use Case Alignment**: Specific scenarios where each template excels
- **Complexity Assessment**: Appropriate template selection based on project scope
- **Customization Roadmap**: Step-by-step modification instructions for common adaptations
- **Platform Requirements**: Tool versions, dependencies, and environment prerequisites
- **Configuration Patterns**: Proven approaches for Salesforce integration and authentication setup

### LLM Workflow Integration

The CLI-delivered metadata enables LLMs to:

1. **Match User Intent**: Compare user requirements against template capabilities and use cases
2. **Assess Complexity**: Select templates appropriate for project scope and developer experience
3. **Plan Customizations**: Identify specific modification points and required file changes
4. **Validate Compatibility**: Ensure template requirements align with user environment and platform
5. **Generate Instructions**: Provide concrete next steps for project generation and customization

---

## Connected App Configuration

### Environment Variable Approach

The workflow requires Connected App configuration to be specified via environment variables prior to workflow execution. This approach ensures sensitive credential data remains outside of the LLM conversation context, addressing security and privacy concerns around potential PII exposure in MCP host environments.

**Required Environment Variables**:

1. **`CONNECTED_APP_CONSUMER_KEY`**
   - Contains the Connected App Consumer Key (Client ID) from Salesforce org
   - Standard Salesforce format: `3MVG9...`
   - Used for OAuth authentication configuration in generated projects

2. **`CONNECTED_APP_CALLBACK_URL`**
   - Contains the Connected App Callback URI for OAuth redirects
   - URL format with custom scheme (e.g., `myapp://auth/callback`)
   - Must match the callback URI configured in the Salesforce Connected App

**Environment Validation**: The workflow begins with an environment validation node that verifies these variables are set before proceeding with user input collection. If either variable is missing, the workflow terminates with clear guidance on:

- How to create a Connected App in Salesforce
- Required OAuth settings and permissions
- How to set the environment variables properly
- Links to Salesforce documentation for Connected App creation

**Configuration Integration**: During project generation, the `sfmobile-native-project-generation` tool:

1. Receives Connected App credentials from workflow state (populated from environment)
2. Guides LLM through locating OAuth configuration files in generated template
3. Provides instructions for replacing placeholder values with the credentials
4. Ensures configuration format and consistency across platform-specific files

**Rationale**: Environment variable-based configuration keeps sensitive credentials outside of LLM interactions while maintaining workflow automation. Future iterations may explore secure credential management systems or integration with platform-specific secret stores.

---

## Workflow State Management and Persistence

### The `.magen` Well-Known Directory

The workflow maintains persistent state and artifacts in a well-known directory structure to enable workflow resumption, debugging, and audit capabilities.

**Directory Location**:

- Default: `~/.magen/` (user's home directory)
- Configurable: `$PROJECT_PATH/.magen/` if `PROJECT_PATH` environment variable is set

**Directory Contents**:

1. **`workflow-state.json`**: JSON-serialized workflow checkpoints
   - Maintains complete workflow state across tool invocations
   - Enables workflow resumption after interruption
   - Thread-based state isolation for concurrent workflows
   - Cross-platform compatible (no binary dependencies)

2. **`workflow_logs.json`**: Structured workflow execution logs
   - Comprehensive audit trail of all workflow operations
   - JSON-formatted entries for programmatic analysis
   - Debugging support across sessions
   - Performance metrics and error tracking

**State Persistence Architecture**:

- **JSON-Based Checkpointing**: Uses LangGraph's checkpoint system with custom JSON serialization
  - Avoids binary database dependencies (e.g., SQLite native modules)
  - Ensures reliable cross-platform operation
  - Enables human-readable state inspection for debugging

- **Thread-Based State Management**: Each workflow session is identified by a unique `thread_id`
  - Auto-generated on first orchestrator invocation: `mobile-{timestamp}-{random}`
  - Passed through all tool invocations via `workflowStateData.thread_id`
  - Enables workflow resumption and concurrent workflow isolation

- **State Import/Export**: Workflow state is:
  - Loaded from disk at orchestrator initialization (if exists)
  - Updated after each node execution
  - Persisted to disk after each tool invocation
  - Maintains consistency across MCP server restarts

**Workflow Resumption**: When the orchestrator is invoked:

1. Checks for existing checkpointed state using provided `thread_id`
2. If interrupted state exists, resumes from last checkpoint with provided user input
3. If no state exists, starts fresh workflow execution
4. State updates are automatically persisted after each workflow node

---

## Implementation Deliverables

### Core Workflow Infrastructure

1. **Orchestrator**: `sfmobile-native-project-manager` with LangGraph StateGraph and JSON-based checkpointing
   - Workflow state persisted in `~/.magen/workflow-state.json` (or `$PROJECT_PATH/.magen/` if specified)
   - Comprehensive structured logging to `~/.magen/workflow_logs.json`
   - Human-in-the-loop pattern with interrupt-based tool coordination

2. **Environment Validation**: Upfront validation of Connected App environment variables
   - Verifies `CONNECTED_APP_CONSUMER_KEY` and `CONNECTED_APP_CALLBACK_URL` before proceeding
   - Provides clear error messages and setup guidance on validation failure

3. **User Input Collection System**: Multi-turn conversation workflow
   - **MCP Tools**:
     - `sfmobile-native-input-extraction`: LLM-based property extraction from utterances
     - `sfmobile-native-get-input`: Generates questions and collects user responses for unfulfilled properties
   - **Agentic Services** (`src/workflow/services/`):
     - `InputExtractionService`: Direct invocation of extraction tool with validation and filtering
     - `GetInputService`: Direct invocation of user input collection tool
     - `AbstractService`: Base class providing standardized tool execution patterns
   - Automated property fulfillment checking and loop coordination

### Plan Phase Tools

1. **Template Discovery**: `sfmobile-native-template-discovery`
   - CLI-based template metadata access via `sfdx-mobilesdk-plugin`
   - Platform-aware template selection guidance
   - Integration with templates directory submodule

2. **Project Generation**: `sfmobile-native-project-generation`
   - Platform-specific project creation from selected templates
   - Connected App OAuth configuration integration
   - Optional login host configuration support

3. **Build Validation with Automatic Recovery**:
   - **Build Tool**: `sfmobile-native-build`
     - Platform-specific build orchestration
     - Build output capture and interpretation
   - **Build Recovery Tool**: `sfmobile-native-build-recovery`
     - Automated analysis of build failures
     - Common issue detection and fix attempts
     - Retry coordination with configurable max attempts
   - **Build Recovery Service** (`src/workflow/services/`):
     - `BuildRecoveryService`: Direct invocation of recovery tool
     - `BuildValidationService`: Direct invocation of build tool
   - Build recovery loop with automatic retry logic (up to 3 attempts by default)

### Run Phase Tools

1. **Deployment**: `sfmobile-native-deployment`
   - Simulator/emulator deployment via `@salesforce/lwc-dev-mobile` plugin
   - Device selection and management guidance
   - App launch verification

### Workflow Completion Handling

1. **Completion Tool**: `sfmobile-native-completion`
   - Success message formatting and next steps guidance
2. **Failure Tool**: `sfmobile-native-failure`
   - Clear error communication and troubleshooting guidance

### MCP Prompts

1. **Workflow Launch Prompt**: `mobile_app_project`
   - Structured entry point for mobile app generation workflow
   - Platform selection argument
   - Initializes orchestrator with user context
   - **Prompt Infrastructure** (`src/prompts/`):
     - `AbstractPrompt`: Base class for prompt implementations
     - `MobileAppProjectPrompt`: Implementation for mobile app workflow initialization

---

## Success Metrics

### Technical Metrics

- **Time to Working App**: < 10 minutes from utterance to Contact list app in simulator/emulator
- **Build Success Rate**: 100% for happy path workflow (Contact list app builds successfully)
- **Deployment Success**: Generated Contact list app successfully runs in simulator/emulator

### Workflow Metrics

- **Tool Call Sequence**: LLM follows prescribed workflow without deviation
- **Instruction Following**: LLM successfully executes CLI commands as guided
- **Error Recovery**: LLM uses provided guidance to resolve common issues

### User Experience Metrics

- **Minimal User Intervention**: Multi-turn conversation collects only essential project properties
- **Environment-Based Credentials**: Connected App configuration via environment variables (no sensitive data in LLM context)
- **Clear Progress Indicators**: User understands workflow progress at each checkpoint
- **Functional End Result**: User can interact with Contact list mobile app in simulator/emulator

---

## Future Iterations (Planned for Subsequent Releases)

**Important**: The features listed below are **planned for future iterations**, not permanently out of scope. As this living document evolves, these sections will be moved into active implementation phases and detailed accordingly.

### Comprehensive Environment Setup _(Next Priority)_

**Implementation Details**: See [Comprehensive Environment Setup and Validation](./5_mobile_native_app_generation.md#comprehensive-environment-setup-and-validation) in the main design document for detailed implementation specifications.

- **Salesforce CLI Installation Validation**: Automated detection and installation guidance for the Salesforce CLI itself, including platform-specific installation instructions and npm-based installation workflows
- **Required Plugin Management**: Automated verification and installation of all required Salesforce CLI plugins (`sfdx-mobilesdk-plugin`, `@salesforce/lwc-dev-mobile`)
- **Platform-Specific Tool Validation**: Comprehensive environment checks for required development tools (Xcode for iOS, Android Studio for Android, Java, etc.) using existing `@salesforce/lwc-dev-mobile` capabilities

**Tool Specification**: Implemented via the [`sfmobile-native-environment-validation`](./5_mobile_native_app_generation.md#sfmobile-native-environment-validation) tool with comprehensive first-party CLI validation while maintaining instruction-first principles.

### Enhanced Connected App Management _(High Priority)_

- Automatic Connected App discovery in user environment
- Connected App creation guidance for new users
- Configuration validation and troubleshooting

### Advanced Error Recovery _(Critical for Production)_

- Comprehensive build error diagnosis and resolution
- Template compatibility validation
- Platform-specific tool version and dependency management

### Extended Template Ecosystem _(Platform Expansion)_

- Extended template catalog (dashboard, forms, etc.) for both platforms
- Cross-platform project generation capabilities
- **Additional Template Sources**: Community-contributed templates, partner templates, and custom organizational template repositories
- **Template Marketplace Integration**: Discovery and integration of third-party template sources while maintaining quality and security standards

### Production Readiness Features _(Customer Deployment)_

- Code signing and provisioning profile management
- App Store preparation guidance
- Performance optimization recommendations

### Advanced Workflow Features _(Post-Steel Thread)_

**Current Implementation Status**: The steel thread includes foundational workflow state management with `.magen` directory-based persistence, JSON checkpointing, and structured logging. The following advanced features remain for future iterations:

**Workflow Integrity and Validation**:

- **Out-of-Order Execution Detection**: Detect and handle cases where downstream tools are invoked without prerequisite workflow steps
- **State Verification Mechanisms**: Enhanced validation to ensure workflow state integrity across tool invocations
- **Prerequisite Checking**: Automated verification that required workflow conditions are met before node execution

**Enhanced Error Handling and Recovery**:

- **Workflow Recovery Points**: Ability to restart workflow from specific checkpoints after failures
- **State Repair Utilities**: Tools for diagnosing and repairing corrupted or incomplete workflow state
- **Graceful Degradation Patterns**: Sophisticated fallback strategies when workflow prerequisites aren't met
- **Comprehensive Error Context**: Rich error information with actionable recovery guidance

**Advanced Debugging and Observability**:

- **Workflow State Inspection Tools**: Command-line utilities for examining workflow state and history
- **Performance Metrics**: Detailed timing and performance analysis for workflow operations
- **Visual Workflow Tracing**: Graphical representation of workflow execution paths
- **Advanced Log Analysis**: Query and analysis capabilities for workflow logs

---

## Document Evolution and Maintenance

**Living Document Philosophy**: This document represents a living implementation guide that evolves with our project progress. As we prioritize and begin work on future features, this document will be updated to include detailed implementation specifications, tool definitions, and workflow guidance for each area.

**Implementation Alignment**: All development work must maintain alignment with the instruction-first philosophy and three-phase workflow architecture outlined in the main design document ([`5_mobile_native_app_generation.md`](./5_mobile_native_app_generation.md)).

**Scope Evolution**: Features currently listed in "Future Iterations" will migrate into active implementation phases as the project progresses, with this document serving as the definitive guide for work item creation and development priorities.
