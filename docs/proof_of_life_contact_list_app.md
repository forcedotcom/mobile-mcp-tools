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
- User has a pre-configured Salesforce Connected App with known Client ID and Callback URI

### Resource Paths

- `<ServerRoot>`: Filesystem path to `@salesforce/mobile-native-mcp-server` package contents
- Templates located at: `<ServerRoot>/resources/SalesforceMobileSDK-Templates/` (Git submodule pointing to [SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates))

---

## High-Level Agentic Workflow

### Instruction-First Approach

1. **User utterance**: _"I want an iOS mobile app that will show me a list of all of my Salesforce Contacts."_

2. **LLM calls Orchestrator** → `sfmobile-native-project-manager` manages workflow execution

3. **Workflow Execution**: Orchestrator manages state transitions and tool invocations
   - **Plan Phase** → Template Discovery → Project Generation → Build Validation
   - **Run Phase** → Deployment to simulator/emulator
   - **Note**: Steel thread scope focuses on Contact list app generation and deployment

4. **Human-in-the-Loop Pattern**: Each workflow node uses `interrupt()` to invoke instruction-first MCP tools
   - Workflow pauses to initiate tool invocation, providing tool inputs via interrupt
   - MCP tool provides comprehensive LLM guidance
   - LLM executes tasks and returns results to orchestrator
   - Workflow resumes with next node based on results

---

## MCP Server Tool Specifications

### Orchestration Tool

#### `sfmobile-native-project-manager`

**Purpose**: LangGraph-based workflow orchestrator that manages the complete mobile app generation process through human-in-the-loop pattern and instruction-first MCP tools

**Input Schema**:

```typescript
{
  userInput: string; // "I want an iOS mobile app..." (initial) or tool output (resumption)
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation (auto-generated if not provided)
  };
}
```

**Workflow Architecture**: Implements StateGraph with the following nodes (matching actual steel thread tool scope):

1. **analyzeUserRequest** → Extracts platform and feature requirements from user input
2. **discoverTemplates** → `interrupt()` → `sfmobile-native-template-discovery` tool
3. **generateProject** → `interrupt()` → `sfmobile-native-project-generation` tool
4. **validateBuild** → `interrupt()` → `sfmobile-native-build` tool
5. **deployApp** → `interrupt()` → `sfmobile-native-deployment` tool

**Output**: Natural language orchestration instructions embedding tool invocation data and workflow state:

```typescript
{
  orchestrationInstructionsPrompt: string; // Natural language prompt with embedded tool invocation instructions and workflow state
  isComplete: boolean; // Whether workflow has finished
}
```

**Execution Pattern**:

- Each `interrupt()` surfaces tool invocation metadata to orchestrator
- Orchestrator creates natural language prompt embedding tool invocation instructions
- Orchestrator returns orchestration prompt to MCP client
- LLM receives orchestration prompt with specific tool name, input schema, and input values
- LLM invokes specified instruction-first tool and executes guidance
- LLM re-invokes orchestrator with tool results
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

**Steel Thread Workflow State**: Uses subset of main `WorkflowState` interface from design document, including `userInput`, `platform`, `selectedTemplate`, `projectPath`, `connectedAppConfig`, `lastBuildStatus`, and `deploymentStatus` properties as needed for one-shot demonstration workflow.

---

### Phase 1: Plan Tools

#### `sfmobile-native-template-discovery`

**Purpose**: Guides LLM through template discovery and selection

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation
  };
}
```

**Output**: Instruction-first guidance including:

- Plugin verification: `sf plugins inspect sfdx-mobilesdk-plugin --json` (install with `sf plugins install sfdx-mobilesdk-plugin` if needed)
- Platform-specific CLI command: `sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/resources/SalesforceMobileSDK-Templates --doc --json` (iOS example shown, Android follows same pattern)
- Template metadata interpretation guidance
- Selection criteria for Contact list requirements
- Next steps for project generation

#### `sfmobile-native-project-generation`

**Purpose**: Guides LLM through project creation and Connected App configuration

**Input Schema**:

```typescript
{
  selectedTemplate: string;     // "salesforce-record-list-ios"
  projectName: string;         // "ContactListApp"
  packageName: string;         // "com.mycompany.contactlistapp"
  organizationName: string;    // "My Company"
  outputDirectory?: string;    // Optional, defaults to current directory
  platform: "iOS" | "Android"; // Platform for project generation
  connectedAppClientId?: string;
  connectedAppCallbackUri?: string;
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific CLI command: `sf mobilesdk ios|android createwithtemplate --templaterepouri=<ServerRoot>/resources/SalesforceMobileSDK-Templates/<selectedTemplate> --appname=<projectName> --packagename=<packageName> --organization=<organizationName> --outputdir=<outputDirectory>` (iOS example shown, Android follows same pattern)
- Connected App configuration steps if credentials provided
- File modification instructions for OAuth setup
- Next steps for build validation

#### `sfmobile-native-build`

**Purpose**: Guides LLM through initial build verification

**Input Schema**:

```typescript
{
  projectPath: string; // Path to generated project
  platform: 'iOS' | 'Android'; // Platform for build validation
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific build commands: `xcodebuild` for iOS projects, `./gradlew build` for Android projects (iOS example shown, Android follows same pattern)
- Build output interpretation guidance for platform-specific tools
- Common build error troubleshooting steps
- Success criteria for proceeding to deployment

---

### Run Phase Tools

#### `sfmobile-native-deployment`

**Purpose**: Guides LLM through deploying app to simulator/emulator

**Input Schema**:

```typescript
{
  projectPath: string;
  platform: "iOS" | "Android"; // Platform for deployment
  targetDevice?: string; // "iPhone 15" for iOS, "Pixel_7_API_33" for Android
  workflowStateData?: {
    thread_id: string; // Workflow session identifier for continuation
  };
}
```

**Output**: Instruction-first guidance including:

- Platform-specific CLI commands: `@salesforce/lwc-dev-mobile` plugin usage for deployment
- Device selection and management (iOS simulator, Android emulator)
- App launch verification steps
- User interaction validation guidance

---

## Template Repository Integration

### Git Submodule Design

**Architecture Decision**: The `@salesforce/mobile-native-mcp-server` package includes the official [SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates) repository as a Git submodule located at `<ServerRoot>/resources/SalesforceMobileSDK-Templates/`, serving as the primary template source with architecture designed to support additional template repositories in future iterations.

**Template Discovery Process**:

1. `sfmobile-native-template-discovery` tool uses `sfdx-mobilesdk-plugin` CLI commands
2. Executes platform-specific commands: `sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/resources/SalesforceMobileSDK-Templates --doc --json` for comprehensive template information
3. Parses structured JSON output including descriptions, use cases, features arrays, complexity ratings, and list of customization points
4. Optionally uses platform-specific commands: `sf mobilesdk ios|android describetemplate --template=<TemplateName> --doc --json` for detailed template investigation
5. Returns template selection guidance to LLM with rich metadata and extensible architecture for future template repositories

**Integration with CLI Tools**:

- `sfdx-mobilesdk-plugin` CLI commands reference the local submodule path as template source
- Templates are immediately available for project generation without additional downloads
- Consistent with standard Mobile SDK development workflows

---

## Template Metadata Access

### CLI-Delivered Metadata

The `sfdx-mobilesdk-plugin` CLI provides comprehensive template metadata through its `--doc --json` flags, enabling LLMs to make informed template selection and customization decisions:

#### Template Discovery Workflow

**Comprehensive Template Listing**:

```bash
sf mobilesdk ios|android listtemplates --templatesource=<ServerRoot>/resources/SalesforceMobileSDK-Templates --doc --json
```

- **Structured Output**: JSON format optimized for LLM parsing and decision-making
- **Rich Descriptions**: Detailed use case guidance and feature explanations
- **Feature Tagging**: Structured arrays for precise capability matching
- **Complexity Assessment**: Ratings to guide appropriate template selection
- **Platform Filtering**: Automatic filtering for target development platform

**Detailed Template Investigation**:

```bash
sf mobilesdk ios|android describetemplate --template=<TemplateName> --templatesource=<ServerRoot>/resources/SalesforceMobileSDK-Templates --doc --json
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

## Connected App Configuration (Happy Path)

### User Input Collection

For this proof-of-life iteration, tools will guide the LLM to prompt the user for:

1. **Connected App Consumer Key (Client ID)**
   - User provides from their Salesforce org's Connected App configuration
   - Format validation: 3MVG9... (standard Salesforce format)

2. **Connected App Callback URI**
   - User provides from their Connected App configuration
   - Format validation: URL format starting with custom scheme

### Configuration Integration

Tools guide the LLM through:

1. Locating OAuth configuration files in generated template
2. Replacing placeholder values with user-provided credentials
3. Validating configuration format and consistency

**Future Iterations**: Discovery tools, configuration validation, and automated setup assistance.

---

## Implementation Deliverables

### Phase 1: MCP Server Foundation

1. **Orchestrator**: `sfmobile-native-project-manager` with LangGraph StateGraph and SQLite checkpointing (workflow state persisted in `./.magen/workflow-state.db` and comprehensive logging to `./.magen/workflow_logs.json` within the well-known project artifacts directory)
2. **Template Discovery tool** with CLI-based metadata access and analysis
3. **Project Generation tool** with Connected App configuration guidance
4. **Build Validation tool** with platform-specific build orchestration

### Phase 2: Template Infrastructure

1. **Git Submodule Integration**: Configure SalesforceMobileSDK-Templates as submodule in `<ServerRoot>/resources/SalesforceMobileSDK-Templates/`
2. **CLI Integration**: Implement MCP tools that leverage `sfdx-mobilesdk-plugin` CLI commands for template metadata delivery
3. **Platform-Specific Discovery**: Guide LLMs through platform-aware template discovery using CLI `--doc --json` output
4. **Template Validation**: Verify template availability and CLI plugin functionality for comprehensive template access

### Phase 3: Feature Adaptation Tools

1. **Code Analysis tool** with iOS/Swift exploration guidance
2. **Feature Modification tool** with Contact-specific adaptation instructions
3. **Deployment tool** with iOS simulator integration

### Phase 4: Integration Testing

1. **End-to-end workflow validation** from utterance to running app
2. **Error handling verification** for common failure points
3. **Documentation updates** based on implementation learnings

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

- **Minimal User Intervention**: Only Connected App credentials required from user
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

### Workflow State Management and Orchestration _(Advanced Workflow Features)_

**Priority**: Post-steel thread implementation - advanced workflow integrity features

**Core Challenge**: How do we ensure workflow integrity, validate tool execution order, and maintain state across the three-phase workflow while preserving instruction-first principles?

**Key Requirements to Address**:

1. **Workflow State Verification**: Mechanisms to verify the veracity of workflow state as tools execute and ensure tools are called in correct sequence with prerequisites met
2. **Out-of-Order Tool Execution**: Detection and graceful handling when downstream tools are called without prerequisite workflow steps
3. **State Persistence Strategy**: Robust workflow state maintenance across tool calls

**Potential Implementation Approaches**:

- **File-System Workflow Status**: Maintain quasi-ephemeral documented workflow status in the `./.magen/` well-known project artifacts directory that each tool refers to for status validation and updates with execution results. Benefits: Avoids polluting input/output schemas, provides persistent state across tool calls, enables debugging and workflow introspection, and leverages the established project artifact management structure.
- **Comprehensive Workflow Logging**: All workflow orchestration and MCP tool interactions logged to `./.magen/workflow_logs.json` with structured JSON entries for debugging, audit trails, and workflow analysis. Benefits: Persistent debugging across sessions, detailed error tracking, workflow performance analysis, and comprehensive audit capabilities for production troubleshooting.
- **Data Structure State Passing**: Represent orchestration status as a data structure passed from tool input to output. Benefits: Explicit state management, no file system dependencies. Concerns: Schema pollution, complexity in tool interfaces.
- **Hybrid Approach**: Combination of file-system state with selective data structure passing for critical workflow checkpoints.

**Error Handling and Recovery**:

- **Workflow Recovery**: Comprehensive error handling approach for adverse cases, including ability to redirect users to appropriate workflow restart points
- **Graceful Degradation**: Clear guidance when workflow prerequisites aren't met, up to and including restarting from workflow beginning
- **State Repair**: Mechanisms for recovering from corrupted or incomplete workflow state

**Implementation Considerations**:

- **Tool Interface Design**: Integration of workflow state checking with instruction-first tool design without compromising LLM guidance principles
- **Performance Impact**: Minimizing overhead of state management on tool execution speed
- **User Experience**: Transparent workflow progress indication and error recovery without exposing internal state management complexity
- **Debugging Support**: Workflow state visibility for development and troubleshooting scenarios

---

## Document Evolution and Maintenance

**Living Document Philosophy**: This document represents a living implementation guide that evolves with our project progress. As we prioritize and begin work on future features, this document will be updated to include detailed implementation specifications, tool definitions, and workflow guidance for each area.

**Implementation Alignment**: All development work must maintain alignment with the instruction-first philosophy and three-phase workflow architecture outlined in the main design document ([`5_mobile_native_app_generation.md`](./5_mobile_native_app_generation.md)).

**Scope Evolution**: Features currently listed in "Future Iterations" will migrate into active implementation phases as the project progresses, with this document serving as the definitive guide for work item creation and development priorities.
