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

**Technical Validation**: Demonstrates instruction-first MCP tools successfully guiding an LLM through the complete Plan → Design/Iterate → Run workflow.

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

2. **LLM calls Workflow Orchestration Guide** → receives complete roadmap for Contact list app workflow

3. **Phase 1: Plan** (Template Discovery → Project Generation → Build Validation)
   - LLM guided through template discovery and selection
   - LLM guided through project creation with Connected App configuration
   - LLM guided through build verification

4. **Phase 2: Design/Iterate** (Code Analysis → Feature Modification)
   - LLM guided through exploring template structure
   - LLM guided through adapting record list for Contacts

5. **Phase 3: Run** (Deployment)
   - LLM guided through deploying to iOS simulator

---

## MCP Server Tool Specifications

### Primary Orchestration Tool

#### `sfmobile-native-workflow-guide`

**Purpose**: Provides high-level workflow roadmap and tool sequence guidance

**Input Schema**:

```typescript
{
  userRequest: string; // "I want an iOS mobile app that will show me a list of all of my Salesforce Contacts"
  platform: 'iOS' | 'Android'; // Platform specified by user request
}
```

**Output**: Instruction-first workflow guidance including:

- Complete phase breakdown (Plan → Design/Iterate → Run)
- Specific tool call sequence for Contact list use case
- Success criteria and checkpoints for each phase
- Expected file paths and CLI commands the LLM will use

**Example Output**:

```markdown
# iOS Mobile App Development Workflow

## Step 1: Analyze User Request

First, analyze the user request to identify key features:

- Look for record types mentioned (Contacts, Accounts, Leads, etc.)
- Identify UI patterns (list, form, dashboard, etc.)
- Note any specific functionality (search, offline, etc.)

## Step 2: Follow Three-Phase Workflow

### Phase 1: Plan

1. **Template Discovery**: Call `sfmobile-native-template-discovery` with specified platform
   - Use identified features to filter templates by tags
   - Match user requirements to template capabilities
2. **Project Generation**: Call `sfmobile-native-project-generation` with selected template
3. **Build Validation**: Call `sfmobile-native-build-validation` to verify base project
   → **Checkpoint**: Working skeletal app that builds successfully

### Phase 2: Design/Iterate

4. **Code Analysis**: Call `sfmobile-native-code-analysis` to understand template structure
5. **Feature Modification**: Call `sfmobile-native-feature-modification` to adapt for user's specific record type
6. **Iterative Testing**: Build and validate changes incrementally
   → **Checkpoint**: App displays user's requested data/functionality

### Phase 3: Run

7. **Deployment**: Call `sfmobile-native-deployment` to launch on simulator/emulator
   → **Final Checkpoint**: User can interact with functioning app

**Next Step**: Begin by analyzing the user request, then start with `sfmobile-native-template-discovery`
```

---

### Phase 1: Plan Tools

#### `sfmobile-native-template-discovery`

**Purpose**: Guides LLM through template discovery and selection

**Input Schema**:

```typescript
{
  platform: "iOS" | "Android";
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
}
```

**Output**: Instruction-first guidance including:

- Platform-specific CLI command: `sf mobilesdk ios|android createwithtemplate --templaterepouri=<ServerRoot>/resources/SalesforceMobileSDK-Templates/<selectedTemplate> --appname=<projectName> --packagename=<packageName> --organization=<organizationName> --outputdir=<outputDirectory>` (iOS example shown, Android follows same pattern)
- Connected App configuration steps if credentials provided
- File modification instructions for OAuth setup
- Next steps for build validation

#### `sfmobile-native-build-validation`

**Purpose**: Guides LLM through initial build verification

**Input Schema**:

```typescript
{
  projectPath: string; // Path to generated project
  platform: 'iOS' | 'Android'; // Platform for build validation
}
```

**Output**: Instruction-first guidance including:

- Platform-specific build commands: `xcodebuild` for iOS projects, `./gradlew build` for Android projects (iOS example shown, Android follows same pattern)
- Build output interpretation guidance for platform-specific tools
- Common build error troubleshooting steps
- Success criteria for proceeding to Design/Iterate phase

---

### Phase 2: Design/Iterate Tools

#### `sfmobile-native-code-analysis`

**Purpose**: Guides LLM through understanding template project structure

**Input Schema**:

```typescript
{
  projectPath: string;
  platform: 'iOS' | 'Android'; // Platform for code analysis
  targetFeature: string; // "record-list"
}
```

**Output**: Instruction-first guidance including:

- Platform-specific file exploration patterns (iOS/Android project structures)
- Key files to examine for record list implementation
- Platform-specific code reading strategies (Swift/iOS, Kotlin/Java/Android)
- Understanding existing data model and service patterns

#### `sfmobile-native-feature-modification`

**Purpose**: Guides LLM through adapting template for Contact records

**Input Schema**:

```typescript
{
  projectPath: string;
  platform: 'iOS' | 'Android'; // Platform for feature modification
  currentRecordType: string; // "Account" (from template)
  targetRecordType: string; // "Contact"
}
```

**Output**: Instruction-first guidance including:

- Specific files to modify for Contact integration
- SOQL query modifications needed
- Data model updates for Contact fields
- UI component updates for Contact-specific display
- Iterative build validation after each change

---

### Phase 3: Run Tools

#### `sfmobile-native-deployment`

**Purpose**: Guides LLM through deploying app to simulator/emulator

**Input Schema**:

```typescript
{
  projectPath: string;
  platform: "iOS" | "Android"; // Platform for deployment
  targetDevice?: string; // "iPhone 15" for iOS, "Pixel_7_API_33" for Android
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

1. **Workflow Orchestration Guide tool** with Contact list workflow template
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

- **Time to Working App**: < 10 minutes from utterance to simulator/emulator
- **Build Success Rate**: 100% for happy path workflow
- **Template Adaptation Accuracy**: Contact list displays actual Salesforce Contact records

### Workflow Metrics

- **Tool Call Sequence**: LLM follows prescribed workflow without deviation
- **Instruction Following**: LLM successfully executes CLI commands as guided
- **Error Recovery**: LLM uses provided guidance to resolve common issues

### User Experience Metrics

- **Minimal User Intervention**: Only Connected App credentials required from user
- **Clear Progress Indicators**: User understands workflow progress at each checkpoint
- **Functional End Result**: User can interact with Contact list in working mobile app

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

- **File-System Workflow Status**: Maintain quasi-ephemeral documented workflow status on the file system that each tool refers to for status validation and updates with execution results. Benefits: Avoids polluting input/output schemas, provides persistent state across tool calls, enables debugging and workflow introspection.
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
