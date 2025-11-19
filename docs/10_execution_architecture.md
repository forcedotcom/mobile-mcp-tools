# Execution Architecture

## Overview

This document describes the architecture of the execution module (`packages/mobile-native-mcp-server/src/execution/`), which provides an abstraction for executing long running node commands with real-time progress reporting in action nodes. The design emphasizes encapsulation of platform-specific logic, clear separation of concerns, and dependency injection for testability.

The execution module is organized into two layers:
- **Generic Execution** (`src/execution/`): Reusable components for command execution and progress reporting
- **Build-Specific Execution** (`src/execution/build/`): Build-specific command creation and execution logic

## Core Principles

1. **Platform Encapsulation**: All platform-specific knowledge (command creation and progress parsing) is encapsulated within platform-specific factory classes
2. **Separation of Concerns**: Command creation, execution, and progress reporting are cleanly separated
3. **Dependency Injection**: Components receive dependencies through constructors, enabling testability and flexibility
4. **Progress Transparency**: Progress reporting flows seamlessly from command execution through to MCP notifications

## Build Environment Considerations

### Target Platform vs Build Environment

The execution architecture distinguishes between two concepts:

- **Target Platform**: The platform we're building FOR (iOS, Android)
- **Build Environment**: The operating system we're building ON (macOS, Linux, Windows, local, remote, etc)

**Current Implementation**: The architecture currently assumes a Unix-like build environment (macOS/Linux) however the design is flexible to account for various execution options:

1. **Platform Factory Pattern**: Each platform factory encapsulates command creation, making it easy to add environment detection
2. **Isolated Adaptation**: Environment-specific logic can be added within platform factories without affecting other components
3. **No Architectural Changes Needed**: The `BuildCommandFactory` interface and `Command` structure already support environment-specific executables and arguments

## Module Structure

### Generic Execution (`src/execution/`)

Contains reusable components that can be used for any command execution:

- **`progressReporter.ts`**: Abstract progress reporting interface and MCP implementation
- **`commandRunner.ts`**: Generic command execution abstraction
- **`index.ts`**: Exports generic execution components and build-specific components

### Build-Specific Execution (`src/execution/build/`)

Contains build-specific logic organized by platform:

- **`types.ts`**: Shared types and interfaces for build command factories
- **`buildCommandFactoryRouter.ts`**: Router that delegates to platform-specific factories
- **`buildExecutor.ts`**: Build execution orchestration
- **`ios/`**: iOS-specific build implementation
  - **`buildCommandFactory.ts`**: iOS build command creation and progress parsing
  - **`index.ts`**: Exports iOS components
- **`android/`**: Android-specific build implementation
  - **`buildCommandFactory.ts`**: Android build command creation and progress parsing
  - **`index.ts`**: Exports Android components
- **`index.ts`**: Exports build-specific components

This organization provides:
- **Platform Isolation**: Each platform's logic is completely separated
- **Scalability**: Adding new platforms requires only creating a new platform directory
- **Clear Boundaries**: Platform-specific knowledge is clearly contained
- **Reusability**: Generic execution components remain reusable for non-build operations
- **Future Expansion**: Other execution types can follow the same pattern (e.g., `src/execution/deploy/ios/`, `src/execution/deploy/android/`)

## Component Details

### ProgressReporter

**Purpose**: Abstract interface for reporting progress of long-running operations.

**Key Design Decisions**:
- Simple interface (`report(progress, total?, message?)`) that can be implemented for any notification mechanism
- `MCPProgressReporter` implementation sends notifications via MCP protocol
- Fire-and-forget notification pattern to avoid blocking execution
- Progress reporter is created at the orchestrator level and passed down through the workflow

**Flow**:
1. Orchestrator extracts `sendNotification` function and `progressToken` from MCP request context
2. Creates `MCPProgressReporter` using `createMCPProgressReporter()` helper
3. Passes `ProgressReporter` to workflow graph creation
4. Workflow passes reporter to nodes that need it (e.g., `BuildValidationNode`)

### BuildCommandFactory

**Location**: Platform-specific factories in `src/execution/build/{platform}/buildCommandFactory.ts`

**Purpose**: Encapsulates platform-specific knowledge for both command creation and progress parsing.

**Key Design Decisions**:
- **Platform-Specific Directories**: Each platform has its own directory (`ios/`, `android/`) containing:
  - Platform-specific factory implementation
  - Platform-specific types and utilities (if needed)
  - Platform-specific exports
- **Encapsulation**: Each platform factory (`iOSBuildCommandFactory`, `AndroidBuildCommandFactory`) knows how to:
  - Create platform-specific build commands
  - Parse platform-specific build output for progress
- **Co-location**: Command creation and progress parsing logic live together within the platform directory
- **Shared Types**: Common interfaces and types are defined in `build/types.ts`
- **Router Pattern**: `BuildCommandFactoryRouter` routes to appropriate platform factory based on platform parameter
- **Build Environment Extensibility**: Factories can be extended to detect and adapt to different build environments (OS) when needed

**Interface** (defined in `build/types.ts`):
```typescript
interface BuildCommandFactory {
  create(params: BuildCommandParams): Command;
  parseProgress(output: string, currentProgress: number): ProgressParseResult;
}
```

**Platform Structure**:
- **iOS**: `src/execution/build/ios/buildCommandFactory.ts` - xcodebuild command creation and parsing (macOS-only)
- **Android**: `src/execution/build/android/buildCommandFactory.ts` - Gradle command creation and parsing (currently Unix-style, extensible to Windows)

**Benefits**:
- Adding a new platform requires only creating a new platform directory with factory implementation
- Platform-specific logic is completely isolated and testable independently
- Changes to command structure or progress parsing for a platform are localized to that platform's directory
- Clear separation between platforms makes it easy to understand platform-specific behavior
- Build-specific logic is clearly separated from generic execution components
- Build environment adaptation can be added within platform factories when needed

### BuildExecutor

**Location**: `src/execution/build/buildExecutor.ts`

**Purpose**: High-level orchestration of build execution, coordinating command creation, execution, and result parsing.

**Key Design Decisions**:
- Receives `BuildCommandFactory` as dependency (typically a router)
- Receives `ProgressReporter` as parameter (allows different reporters per execution)
- Platform-agnostic: delegates platform-specific concerns to factory
- Handles result parsing (errors, warnings) generically
- Lives in `build/` subdirectory as it's build-specific, not generic execution

**Responsibilities**:
1. Determine build output file path
2. Create build command via factory
3. Get platform-specific factory for progress parsing
4. Execute command with progress reporting
5. Write output to file for analysis
6. Parse results (success, errors, warnings)
7. Report completion status

### CommandRunner

**Location**: `src/execution/commandRunner.ts`

**Purpose**: Generic command execution abstraction that handles process spawning, output capture, and progress reporting.

**Key Design Decisions**:
- Accepts optional `progressParser` function for real-time progress updates
- Captures stdout/stderr separately
- Supports timeout configuration
- Reports progress through provided `ProgressReporter`
- Returns structured `CommandResult` with exit code, output, duration, and success status
- Generic: Lives in root `execution/` directory as it can execute any command, not just builds
- Uses Node.js `spawn()` which handles OS differences automatically for most cases

**Progress Parsing Flow**:
1. CommandRunner spawns child process
2. As stdout data arrives, accumulates output
3. Calls `progressParser` with accumulated output and current progress
4. If parser returns higher progress, updates and reports via `ProgressReporter`
5. Continues until process completes

**Benefits**:
- Reusable for any command execution (not just builds)
- Progress parsing is pluggable via function parameter
- Clear separation between execution mechanics and progress interpretation
- Node.js `spawn()` handles OS differences for process execution

## Dependency Injection Pattern

### Workflow Creation

The workflow graph is created via a factory function that accepts dependencies:

```typescript
function createMobileNativeWorkflow(
  buildExecutor: BuildExecutor,
  sendNotification: SendNotification
): StateGraph
```

This pattern enables:
- **Testability**: Dependencies can be mocked for testing
- **Flexibility**: Different implementations can be injected
- **Explicit Dependencies**: Clear contract of what the workflow needs

### Component Construction

Components are constructed at the orchestrator level:

```typescript
// Orchestrator creates dependencies
import { DefaultCommandRunner } from '../execution/commandRunner.js';
import { BuildCommandFactoryRouter } from '../execution/build/buildCommandFactoryRouter.js';
import { DefaultBuildExecutor } from '../execution/build/buildExecutor.js';
import { createMCPProgressReporter } from '../execution/progressReporter.js';

const commandRunner = new DefaultCommandRunner(logger);
const buildCommandFactory = new BuildCommandFactoryRouter(tempDirManager);
const buildExecutor = new DefaultBuildExecutor(
  commandRunner,
  buildCommandFactory,
  tempDirManager,
  logger
);
const progressReporter = createMCPProgressReporter(sendNotification, progressToken);

// Workflow receives dependencies
const workflow = createMobileNativeWorkflow(buildExecutor, progressReporter);
```

This ensures:
- Dependencies are created once and reused
- Lifecycle is managed at the appropriate level
- Components remain focused on their responsibilities

## Progress Reporting Flow

### Initialization

1. **MCP Request Arrives**: Contains `progressToken` in metadata
2. **Orchestrator Extracts Context**: Gets `sendNotification` function and `progressToken`
3. **ProgressReporter Created**: `createMCPProgressReporter()` validates token and creates reporter
4. **Workflow Receives Reporter**: Passed to workflow creation function

### During Execution

1. **BuildValidationNode Receives Reporter**: Node has reporter injected via constructor
2. **Node Creates Reporter Instance**: Creates new reporter from state's `progressToken` (allows token changes)
3. **BuildExecutor Receives Reporter**: Passed as parameter to `execute()` method
4. **CommandRunner Uses Reporter**: Receives reporter and progress parser function
5. **Real-time Updates**: As command output arrives, parser extracts progress and reporter sends notifications

### Progress Parsing

1. **Platform Factory Provides Parser**: `BuildExecutor` gets platform-specific factory
2. **Parser Function Created**: Wraps factory's `parseProgress()` method
3. **CommandRunner Calls Parser**: As stdout accumulates, calls parser with output and current progress
4. **Parser Returns Progress**: Factory's platform-specific logic interprets output
5. **Progress Reported**: If progress increased, reporter sends MCP notification

## Platform-Specific Encapsulation

### iOS Example

`iOSBuildCommandFactory` encapsulates:
- **Command Creation**: xcodebuild command structure, workspace/scheme configuration, build directory setup
- **Progress Parsing**: Recognizes xcodebuild output patterns (Compiling, Linking, CodeSign, BUILD SUCCEEDED/FAILED)
- **Build Environment**: macOS-only (xcodebuild requirement)

### Android Example

`AndroidBuildCommandFactory` encapsulates:
- **Command Creation**: Gradle command structure, working directory setup
- **Progress Parsing**: Recognizes Gradle output patterns (> Task, BUILD SUCCESSFUL/FAILED, task counting)
- **Build Environment**: Cross-platform (macOS, Linux, Windows) - should adapt executable name based on OS

### Adding a New Platform

To add a new platform (e.g., Windows):

1. Create platform directory: `src/execution/build/windows/`
2. Create `buildCommandFactory.ts` in the platform directory implementing `BuildCommandFactory` from `../types.js`
3. Implement `create()` with Windows-specific command structure (considering build environment if cross-platform)
4. Implement `parseProgress()` with Windows build output parsing logic
5. Create `index.ts` in the platform directory to export the factory
6. Update `BuildCommandFactoryRouter` to import and route to the new factory
7. Export the new platform from `build/index.ts`

**Example Structure**:
```
src/execution/build/
  ├── windows/
  │   ├── buildCommandFactory.ts
  │   └── index.ts
  ├── types.ts
  ├── buildCommandFactoryRouter.ts
  └── index.ts
```

All platform-specific knowledge remains encapsulated in the platform's directory, maintaining clear separation and making it easy to understand and maintain platform-specific behavior.

## Future Extensibility

The architecture supports future enhancements:

1. **Additional Platforms**: New factories can be added without changing core execution logic
2. **Alternative Progress Mechanisms**: New `ProgressReporter` implementations can be created
3. **Command Types**: `CommandRunner` can execute any command, not just builds
4. **Progress Parsing Strategies**: Different parsing strategies can be implemented per platform
5. **Result Processing**: `BuildExecutor` can be extended with additional result analysis
6. **Build Environment Support**: Platform factories can adapt to different build environments (OS) as needed
7. **Cross-Platform Build Tools**: Future platforms might support builds on multiple OSes
