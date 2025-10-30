# MCP Workflow Engine Extraction - Implementation Guide

## Overview

This Implementation Guide provides the step-by-step migration plan, technical guidelines, and acceptance criteria for extracting the LangGraph-based workflow engine from `mobile-native-mcp-server` into the reusable `mcp-workflow` package.

**For architecture, design philosophy, and core abstractions, see the companion [Design Document](./design.md).**

This document details _how_ to implement the extraction through a phased approach, ensuring both packages remain functional throughout the migration.

---

## Migration Plan

### Phase 1: Package Scaffolding

**Objective**: Create the new `mcp-workflow` package structure with proper Nx configuration

**Tasks**:

1. Create `packages/mcp-workflow/` directory structure
2. Create `package.json` with appropriate dependencies
3. Create `tsconfig.json` extending workspace base config
4. Create `project.json` for Nx configuration
5. Create initial `README.md` with package purpose and usage overview
6. Configure Nx to recognize the package
7. Add `mcp-workflow` as a dependency in `mobile-native-mcp-server/package.json`

**Acceptance Criteria**:

- `nx build @salesforce/magen-mcp-workflow` succeeds
- `nx test @salesforce/magen-mcp-workflow` runs (even with no tests yet)
- Nx dependency graph shows mobile-native-mcp-server depends on mcp-workflow

### Phase 2: Extract Core Infrastructure

**Objective**: Move foundational components that have no dependencies on mobile-specific logic

**Components to Extract** (in dependency order):

1. **Well-Known Directory Management**
   - Source: `mobile-native-mcp-server/src/utils/wellKnownDirectory.ts`
   - Target: `mcp-workflow/src/storage/wellKnownDirectory.ts`
   - Changes: None - this is already generic and provides convention-over-configuration for workflow artifacts
   - Rationale: Provides consistent storage location (`.magen/`) for workflow state and logs across all consumers. Configurable via `PROJECT_PATH` environment variable for edge cases.
   - Tests: Move `tests/utils/wellKnownDirectory.test.ts` to `tests/storage/wellKnownDirectory.test.ts`

2. **Logging Infrastructure**
   - Source: `mobile-native-mcp-server/src/logging/logger.ts`
   - Target: `mcp-workflow/src/logging/logger.ts`
   - Changes: None - already uses `wellKnownDirectory.ts` which is now part of mcp-workflow
   - Tests: Move and update `tests/logging/logger.test.ts`

3. **Common Metadata**
   - Source: `mobile-native-mcp-server/src/common/metadata.ts`
   - Target: `mcp-workflow/src/common/metadata.ts`
   - Changes: Remove mobile-specific references
   - Tests: Move and update `tests/common/metadata.test.ts`

4. **Property Metadata**
   - Source: `mobile-native-mcp-server/src/common/propertyMetadata.ts`
   - Target: `mcp-workflow/src/common/propertyMetadata.ts`
   - Changes: None (already generic)
   - Tests: Move and update `tests/common/propertyMetadata.test.ts`

5. **Tool Execution Infrastructure**
   - Source: `mobile-native-mcp-server/src/workflow/nodes/toolExecutor.ts`
   - Target: `mcp-workflow/src/nodes/toolExecutor.ts`
   - Changes: None (already generic)
   - Tests: Move `tests/workflow/nodes/toolExecutor.test.ts` to `tests/nodes/toolExecutor.test.ts`

6. **Tool Execution Utils**
   - Source: `mobile-native-mcp-server/src/workflow/utils/toolExecutionUtils.ts`
   - Target: `mcp-workflow/src/utils/toolExecutionUtils.ts`
   - Changes: Update imports
   - Tests: Move `tests/workflow/utils/toolExecutionUtils.test.ts` to `tests/utils/toolExecutionUtils.test.ts`

**Acceptance Criteria**:

- All extracted modules build without errors
- All extracted tests pass with ≥95% coverage
- No circular dependencies exist

### Phase 3: Extract Base Classes

**Objective**: Move abstract base classes used by tools and nodes

**Components to Extract**:

1. **AbstractTool**
   - Source: `mobile-native-mcp-server/src/tools/base/abstractTool.ts`
   - Target: `mcp-workflow/src/tools/base/abstractTool.ts`
   - Changes: Update imports; remove mobile-specific references
   - Tests: Move `tests/tools/base/abstractTool.test.ts` to `tests/tools/base/abstractTool.test.ts`

2. **AbstractWorkflowTool**
   - Source: `mobile-native-mcp-server/src/tools/base/abstractWorkflowTool.ts`
   - Target: `mcp-workflow/src/tools/base/abstractWorkflowTool.ts`
   - Changes: Accept orchestrator tool ID as config parameter instead of hard-coded reference
   - Tests: Move `tests/tools/base/abstractWorkflowTool.test.ts` to `tests/tools/base/abstractWorkflowTool.test.ts`

3. **AbstractBaseNode**
   - Source: `mobile-native-mcp-server/src/workflow/nodes/abstractBaseNode.ts`
   - Target: `mcp-workflow/src/nodes/abstractBaseNode.ts`
   - Changes: Simplify to work directly with state types (not AnnotationRoot); use `StateType<StateDefinition>` as default generic parameter; update imports to use `StateType` and `StateDefinition` from LangGraph
   - Tests: Create `tests/nodes/abstractBaseNode.test.ts` with comprehensive type safety tests

4. **AbstractToolNode**
   - Source: `mobile-native-mcp-server/src/workflow/nodes/abstractToolNode.ts`
   - Target: `mcp-workflow/src/nodes/abstractToolNode.ts`
   - Changes: Extends BaseNode (inherits default state type generic); update imports
   - Tests: Move `tests/workflow/nodes/abstractToolNode.test.ts` to `tests/nodes/abstractToolNode.test.ts`

5. **AbstractService**
   - Source: `mobile-native-mcp-server/src/workflow/services/abstractService.ts`
   - Target: `mcp-workflow/src/services/abstractService.ts`
   - Changes: Update imports
   - Tests: Move `tests/workflow/services/abstractService.test.ts` to `tests/services/abstractService.test.ts`

**Acceptance Criteria**:

- All base classes build without errors
- All base class tests pass with ≥95% coverage
- Type safety is verified for generic implementations

### Phase 3.5: Extract Utility Tools

**Objective**: Move general-purpose utility tools that provide common workflow operations

**Rationale**: These tools implement common patterns needed by most workflow-based MCP servers:

- Gathering user input for multiple properties
- Extracting structured data from unstructured user responses

Rather than force every consumer to reimplement these patterns, we provide them as part of the framework.

**Components to Extract**:

1. **Get Input Tool**
   - Source: `mobile-native-mcp-server/src/tools/plan/sfmobile-native-get-input/`
   - Target: `mcp-workflow/src/tools/utilities/getInput/`
   - Changes:
     - Rename class: `SFMobileNativeGetInputTool` → `GetInputTool`
     - Remove hard-coded tool ID: Accept `toolId` as constructor parameter
     - Accept `orchestratorToolId` as constructor parameter (not from hard-coded constant)
     - Create factory function `createGetInputTool()` with `GetInputToolOptions` interface
     - Update metadata factory to accept dynamic `toolId` parameter
     - Remove "sfmobile-native" references from prompts and internal naming
   - Files:
     - `tool.ts`: Tool implementation
     - `metadata.ts`: Schemas and metadata factory function
     - `factory.ts`: NEW - Factory function for tool creation with configurable tool ID
     - `index.ts`: Public exports
   - Tests: Move `tests/tools/plan/sfmobile-native-get-input/` to `tests/tools/utilities/getInput/`
     - Add tests for tool ID configurability
     - Add tests for factory function with various prefixes
     - Verify collision avoidance scenarios

2. **Input Extraction Tool**
   - Source: `mobile-native-mcp-server/src/tools/plan/sfmobile-native-input-extraction/`
   - Target: `mcp-workflow/src/tools/utilities/inputExtraction/`
   - Changes:
     - Rename class: `SFMobileNativeInputExtractionTool` → `InputExtractionTool`
     - Remove hard-coded tool ID: Accept `toolId` as constructor parameter
     - Accept `orchestratorToolId` as constructor parameter
     - Create factory function `createInputExtractionTool()` with `InputExtractionToolOptions` interface
     - Update metadata factory to accept dynamic `toolId` parameter
     - Remove "sfmobile-native" references from prompts and internal naming
   - Files:
     - `tool.ts`: Tool implementation
     - `metadata.ts`: Schemas and metadata factory function
     - `factory.ts`: NEW - Factory function for tool creation with configurable tool ID
     - `index.ts`: Public exports
   - Tests: Move `tests/tools/plan/sfmobile-native-input-extraction/` to `tests/tools/utilities/inputExtraction/`
     - Add tests for tool ID configurability
     - Add tests for factory function with various prefixes
     - Verify orchestrator tool ID passing

**Factory Function Pattern**:

Each utility tool provides a factory function that:

- Accepts optional `toolIdPrefix` for collision avoidance
- Accepts required `orchestratorToolId` for workflow continuation
- Returns fully configured tool instance ready for registration

**Example**:

```typescript
// Consumer code (mobile-native-mcp-server)
import { createGetInputTool, createInputExtractionTool } from '@salesforce/magen-mcp-workflow';

const getInputTool = createGetInputTool(server, {
  toolIdPrefix: 'mobile', // Avoids collisions in multi-server environments
  orchestratorToolId: MOBILE_ORCHESTRATOR_TOOL_ID,
  logger,
});

const inputExtractionTool = createInputExtractionTool(server, {
  toolIdPrefix: 'mobile',
  orchestratorToolId: MOBILE_ORCHESTRATOR_TOOL_ID,
  logger,
});

getInputTool.register(annotations);
inputExtractionTool.register(annotations);
```

**Acceptance Criteria**:

- Both utility tools build without errors
- Factory functions properly generate tool IDs with and without prefixes
- Tool ID defaults work correctly (`magen-get-input`, `magen-input-extraction`)
- Prefixed tool IDs work correctly (e.g., `mobile-magen-get-input`)
- All utility tool tests pass with ≥95% coverage
- Tools correctly pass orchestrator tool ID for workflow continuation
- No mobile-specific references remain in tool prompts or logic
- Tools can be instantiated multiple times with different prefixes

### Phase 4: Extract Checkpointing Infrastructure

**Objective**: Move state persistence and checkpointing logic

**Components to Extract**:

1. **JsonCheckpointSaver**
   - Source: `mobile-native-mcp-server/src/workflow/jsonCheckpointer.ts`
   - Target: `mcp-workflow/src/checkpointing/jsonCheckpointer.ts`
   - Changes: None (already generic)
   - Tests: Move `tests/workflow/jsonCheckpointer.test.ts` to `tests/checkpointing/jsonCheckpointer.test.ts`

2. **WorkflowStatePersistence**
   - Source: `mobile-native-mcp-server/src/workflow/workflowStatePersistence.ts`
   - Target: `mcp-workflow/src/checkpointing/statePersistence.ts`
   - Changes: None - already uses `wellKnownDirectory.ts` which is now part of mcp-workflow
   - Note: Uses `.magen/workflow-state.json` by default via well-known directory convention
   - Tests: Move `tests/workflow/workflowStatePersistence.test.ts` to `tests/checkpointing/statePersistence.test.ts`

**Acceptance Criteria**:

- Checkpointing infrastructure builds without errors
- All checkpointing tests pass with ≥95% coverage
- State persistence uses `.magen/` directory by default
- `PROJECT_PATH` environment variable allows override for custom storage location

### Phase 5: Extract and Generalize Orchestrator

**Objective**: Create a configurable generic orchestrator that consumers can instantiate

**Components to Extract**:

1. **Orchestrator Configuration Interface**
   - Target: `mcp-workflow/src/tools/orchestrator/config.ts`
   - Changes: New file defining `OrchestratorConfig<TState>` interface

2. **Orchestrator Metadata Factory**
   - Source: Extracted from `mobile-native-mcp-server/src/tools/workflow/sfmobile-native-project-manager/metadata.ts`
   - Target: `mcp-workflow/src/tools/orchestrator/metadata.ts`
   - Changes: Create factory functions that accept toolId, title, description parameters

3. **Generic Orchestrator Tool**
   - Source: `mobile-native-mcp-server/src/tools/workflow/sfmobile-native-project-manager/tool.ts`
   - Target: `mcp-workflow/src/tools/orchestrator/orchestratorTool.ts`
   - Changes:
     - Accept `OrchestratorConfig<TState>` in constructor where `TState extends AnnotationRoot<StateDefinition>`
     - Make generic over AnnotationRoot type (state type is extracted via `TState["State"]`)
     - Remove hard-coded references to mobile-specific elements
     - Accept workflow as configuration instead of importing it
     - **Implement context-based checkpointer creation**:
       - Check `config.context?.environment` (default: 'production')
       - If 'test': Create `MemorySaver` for in-memory checkpointing
       - If 'production': Create `JsonCheckpointSaver` with `WorkflowStatePersistence` using `.magen/` directory
       - Compile workflow with the created checkpointer: `config.workflow.compile({ checkpointer })`
     - **Make thread ID generation generic**: Remove "mobile" prefix from thread ID template, use generic format (e.g., `workflow-${timestamp}` or similar)
   - Tests: Move and generalize `tests/tools/workflow/sfmobile-native-project-manager/tool.test.ts` to `tests/tools/orchestrator/orchestratorTool.test.ts`
     - Update tests to provide `context: { environment: 'test' }`

**Refactoring Orchestrator Prompts**:

The orchestrator creates LLM prompts that reference the orchestrator tool ID. These will need to be dynamic:

```typescript
// Before (hard-coded)
`Invoke the \`${ORCHESTRATOR_TOOL.toolId}\` tool...`
// After (from config)
`Invoke the \`${this.config.toolId}\` tool...`;
```

**Acceptance Criteria**:

- `OrchestratorTool` accepts configuration and works with any StateGraph
- Orchestrator tests pass with ≥95% coverage
- No hard-coded references to mobile-specific concepts remain
- Multiple test scenarios verify orchestrator works with different configurations

### Phase 6: Refactor Mobile Native MCP Server

**Objective**: Update mobile-native-mcp-server to consume the extracted workflow engine

**Changes Required**:

1. **Update Imports**
   - Replace all imports from local `common/`, `tools/base/`, `workflow/nodes/`, etc. with imports from `@salesforce/magen-mcp-workflow`
   - Update relative imports throughout mobile-specific code

2. **Create Mobile Orchestrator Configuration**
   - File: `mobile-native-mcp-server/src/workflow/orchestrator.ts`
   - Content: Factory function that creates `OrchestratorConfig` for mobile workflow

3. **Update Mobile Orchestrator Instantiation**
   - File: `mobile-native-mcp-server/src/index.ts`
   - Change: Use `OrchestratorTool` with mobile configuration instead of `MobileNativeOrchestrator`

4. **Update Node Implementations**
   - Change all mobile-specific nodes to extend generic base classes from mcp-workflow
   - Update state type references to use mobile-specific `State` type

5. **Update Tool Implementations**
   - Change all mobile-specific workflow tools to extend generic base classes from mcp-workflow
   - Pass orchestrator tool ID through configuration

6. **Refactor Utility Tools Usage**
   - Remove `src/tools/plan/sfmobile-native-get-input/` (now in mcp-workflow)
   - Remove `src/tools/plan/sfmobile-native-input-extraction/` (now in mcp-workflow)
   - Update `src/index.ts` to use factory functions:

     ```typescript
     import { createGetInputTool, createInputExtractionTool } from '@salesforce/magen-mcp-workflow';

     const getInputTool = createGetInputTool(server, {
       toolIdPrefix: 'mobile',
       orchestratorToolId: MOBILE_ORCHESTRATOR_TOOL_ID,
       logger,
     });

     const inputExtractionTool = createInputExtractionTool(server, {
       toolIdPrefix: 'mobile',
       orchestratorToolId: MOBILE_ORCHESTRATOR_TOOL_ID,
       logger,
     });

     getInputTool.register(toolAnnotations);
     inputExtractionTool.register(toolAnnotations);
     ```

   - Remove corresponding test directories for these tools (now tested in mcp-workflow)

7. **Update Tests**
   - Update all test imports
   - Verify all tests still pass
   - Maintain ≥95% coverage

**Example: Mobile Orchestrator Configuration**

```typescript
// mobile-native-mcp-server/src/workflow/orchestrator.ts
import { OrchestratorConfig, OrchestratorTool } from '@salesforce/magen-mcp-workflow';
import { mobileNativeWorkflow } from './graph.js';
import { State } from './metadata.js';

export const MOBILE_ORCHESTRATOR_TOOL_ID = 'sfmobile-native-project-manager';

export function createMobileOrchestratorConfig(): OrchestratorConfig<typeof State> {
  return {
    toolId: MOBILE_ORCHESTRATOR_TOOL_ID,
    title: 'Salesforce Mobile Native Project Manager',
    description:
      'Orchestrates the end-to-end workflow for generating Salesforce native mobile apps.',
    workflow: mobileNativeWorkflow, // Pass uncompiled StateGraph - orchestrator compiles with checkpointer
    // context defaults to { environment: 'production' } - uses JsonCheckpointSaver with .magen/
  };
}

// mobile-native-mcp-server/src/index.ts
import { OrchestratorTool } from '@salesforce/magen-mcp-workflow';
import { createMobileOrchestratorConfig } from './workflow/orchestrator.js';

const orchestratorConfig = createMobileOrchestratorConfig();
const orchestrator = new OrchestratorTool(server, orchestratorConfig);
orchestrator.register(orchestratorAnnotations);
```

**Acceptance Criteria**:

- mobile-native-mcp-server builds successfully with mcp-workflow as dependency
- All mobile-native-mcp-server tests pass
- Test coverage remains ≥95%
- End-to-end workflow execution works identically to pre-refactoring
- No functionality regressions in mobile app generation

### Phase 7: Documentation and Polish

**Objective**: Provide comprehensive documentation for both packages

**Documentation Tasks**:

1. **mcp-workflow Package Documentation**
   - Create comprehensive `README.md`:
     - Package overview and purpose
     - Installation instructions
     - Quick start guide
     - Architecture overview
     - API reference
     - Configuration guide
     - Extension guide for creating custom workflows
     - Examples section
   - Create TypeDoc comments for all exported APIs
   - Create example workflow implementations (simple and complex)

2. **mobile-native-mcp-server Documentation**
   - Update existing docs to reference mcp-workflow extraction
   - Document the relationship between packages

3. **Monorepo Documentation**
   - Update `docs/README.md` to include mcp-workflow package
   - Update project overview documentation
   - Add new documentation file for the workflow engine (this file!)

4. **Code Comments and JSDoc**
   - Ensure all exported functions have comprehensive JSDoc
   - Add inline comments explaining complex logic
   - Document design decisions in code comments

**Acceptance Criteria**:

- Both packages have comprehensive README.md files
- All exported APIs have JSDoc comments
- Architecture diagrams are updated
- Example workflows are provided and tested
- Documentation builds without errors

---

## Implementation Guidelines

### Dependency Injection and Inversion of Control

**Requirement**: All mocking functionality must be enabled through Dependency Injection (DI) and Inversion of Control (IoC) design patterns in the code under test. Test framework utility classes for swapping runtime implementations represent a code smell and are forbidden.

**Best Practices**:

1. **Constructor Injection**

   ```typescript
   // Good: Dependencies injected through constructor
   export class MyService {
     constructor(
       private readonly toolExecutor: ToolExecutor,
       private readonly logger: Logger
     ) {}
   }

   // Bad: Hard-coded dependencies
   export class MyService {
     private readonly toolExecutor = new LangGraphToolExecutor();
     private readonly logger = createLogger();
   }
   ```

2. **Interface-Based Design**

   ```typescript
   // Define interface
   export interface ToolExecutor {
     execute(data: MCPToolInvocationData): unknown;
   }

   // Production implementation
   export class LangGraphToolExecutor implements ToolExecutor {
     execute(data: MCPToolInvocationData): unknown {
       return interrupt(data);
     }
   }

   // Test implementation
   export class MockToolExecutor implements ToolExecutor {
     execute(data: MCPToolInvocationData): unknown {
       return { mockResult: true };
     }
   }
   ```

3. **Default Parameters with Override Support**

   ```typescript
   export class AbstractToolNode extends BaseNode {
     constructor(
       name: string,
       toolExecutor?: ToolExecutor, // Optional with default
       logger?: Logger // Optional with default
     ) {
       super(name);
       this.toolExecutor = toolExecutor ?? new LangGraphToolExecutor();
       this.logger = logger ?? createComponentLogger(name);
     }
   }
   ```

4. **Context-Based Configuration**

```typescript
export class OrchestratorTool {
  constructor(server: McpServer, config: OrchestratorConfig) {
    // Checkpointer creation handled internally based on config.context.environment
    // Consumers specify intent (production vs test), not implementation details
    // This encapsulates checkpointing complexity away from the consumer API
  }
}
```

### Code Coverage Requirements

**Target**: Minimum 95% code coverage for both packages

**Strategy**:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test complete workflow execution paths
4. **Edge Case Tests**: Test error handling, boundary conditions, and failure scenarios

**Coverage Enforcement**:

- Configure vitest to fail builds below 95% coverage
- Generate coverage reports for both packages
- Track coverage in CI/CD pipeline

### Breaking Change Philosophy

**Principle**: Since this is pre-release software, we prioritize optimal design over backward compatibility.

**Guidelines**:

1. Make breaking changes that improve the design
2. Document all breaking changes in migration guide (for internal reference)
3. Update all consumers (mobile-native-mcp-server) in same PR
4. Do not maintain deprecated code paths

### Type Safety

**Requirements**:

1. Use TypeScript strict mode
2. Avoid `any` types except where absolutely necessary
3. Use generics for reusable components
4. Ensure proper type inference for consumer code
5. Export all public types from package index

### Code Quality

**Standards**:

1. Follow existing ESLint configuration
2. Use Prettier for consistent formatting
3. Maintain comprehensive JSDoc comments
4. Keep functions focused and single-purpose
5. Prefer composition over inheritance where appropriate

---

## Testing Strategy

### Test Organization

```
mcp-workflow/
└── tests/
    ├── common/
    │   ├── metadata.test.ts
    │   └── propertyMetadata.test.ts
    ├── logging/
    │   └── logger.test.ts
    ├── tools/
    │   ├── base/
    │   │   ├── abstractTool.test.ts
    │   │   └── abstractWorkflowTool.test.ts
    │   ├── orchestrator/
    │   │   ├── orchestratorTool.test.ts
    │   │   └── metadata.test.ts
    │   └── utilities/
    │       ├── getInput/
    │       │   └── [getInput tests]
    │       └── inputExtraction/
    │           └── [inputExtraction tests]
    ├── checkpointing/
    │   ├── jsonCheckpointer.test.ts
    │   └── statePersistence.test.ts
    ├── nodes/
    │   ├── abstractBaseNode.test.ts
    │   ├── abstractToolNode.test.ts
    │   └── toolExecutor.test.ts
    ├── services/
    │   └── abstractService.test.ts
    ├── utils/
    │   ├── toolExecutionUtils.test.ts
    │   └── threadIdGenerator.test.ts
    └── integration/
        ├── simpleWorkflow.test.ts
        └── complexWorkflow.test.ts
```

### Test Categories

#### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Requirements**:

- Test all public methods
- Test error handling
- Test edge cases
- Use dependency injection for all external dependencies
- Mock all I/O operations

**Example**:

```typescript
// tests/tools/orchestrator/orchestratorTool.test.ts
describe('OrchestratorTool', () => {
  let mockServer: McpServer;
  let mockCheckpointer: BaseCheckpointSaver;
  let mockLogger: Logger;

  beforeEach(() => {
    mockServer = createMockMcpServer();
    mockCheckpointer = new MemorySaver();
    mockLogger = createMockLogger();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const config: OrchestratorConfig<typeof SimpleState> = {
        toolId: 'test-orchestrator',
        title: 'Test Orchestrator',
        description: 'Test Description',
        workflow: createTestWorkflow(),
        context: { environment: 'test' }, // Test uses MemorySaver internally
      };

      const orchestrator = new OrchestratorTool(mockServer, config, mockLogger);

      expect(orchestrator.toolMetadata.toolId).toBe('test-orchestrator');
    });
  });

  describe('handleRequest', () => {
    it('should start new workflow when no thread_id provided', async () => {
      // Test implementation
    });

    it('should resume workflow when thread_id provided', async () => {
      // Test implementation
    });

    it('should handle workflow completion', async () => {
      // Test implementation
    });

    it('should handle workflow errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

#### 2. Integration Tests

**Purpose**: Test component interactions

**Requirements**:

- Test realistic component combinations
- Use production implementations where possible
- Test state transitions
- Verify data flow between components

**Example**:

```typescript
// tests/integration/simpleWorkflow.test.ts
describe('Simple Workflow Integration', () => {
  it('should execute a simple two-node workflow end-to-end', async () => {
    // Create a simple workflow with two nodes
    const workflow = createSimpleWorkflow();

    // Create orchestrator (defaults to production environment with JsonCheckpointSaver)
    const orchestrator = new OrchestratorTool(mockServer, {
      toolId: 'test-orchestrator',
      title: 'Test',
      description: 'Test',
      workflow,
      context: { environment: 'test' }, // Use test environment for in-memory checkpointing
    });

    // Execute workflow
    const result = await orchestrator.handleRequest({ userInput: { value: 'test' } });

    // Verify complete execution
    expect(result).toBeDefined();
    expect(workflow.isComplete).toBe(true);
  });
});
```

#### 3. E2E Tests

**Purpose**: Test complete workflow scenarios

**Requirements**:

- Test real-world workflow patterns
- Include both synchronous and agentic nodes
- Test state persistence and recovery
- Verify MCP tool invocations

**Example**:

```typescript
// tests/integration/complexWorkflow.test.ts
describe('Complex Agentic Workflow E2E', () => {
  it('should execute workflow with interrupts and resumptions', async () => {
    // Test full workflow lifecycle including interrupts
  });

  it('should recover from checkpoint after process restart', async () => {
    // Test state persistence and recovery
  });
});
```

### Test Utilities

Create shared test utilities using **Dependency Injection and Inversion of Control** patterns. All mock implementations are concrete classes that implement interfaces—**no test framework mocking utilities** (vi.fn(), vi.mock(), jest.mock(), etc.) are used.

**Key Principle: Use Real Implementations When Practical**

Not every dependency needs a mock implementation. When the real implementation is:

- Lightweight and has no external dependencies
- Easy to instantiate in tests
- Deterministic and controllable

**Use the real implementation instead of creating a mock.** This reduces test maintenance burden and ensures tests exercise actual production code paths.

```typescript
// tests/utils/testUtilities.ts

/**
 * Factory function to create a real MCP Server for testing
 *
 * McpServer is complex enough that mocking it is counterproductive.
 * Instead, instantiate a real server instance in tests.
 */
export function createTestMcpServer(): McpServer {
  return new McpServer({
    name: 'test-server',
    version: '1.0.0-test',
  });
}

/**
 * Example: To verify tool registration in tests, you can query the server
 * or use the tool directly through test invocations rather than trying
 * to spy on registration calls.
 */

/**
 * Mock Logger implementation for testing
 * Captures log calls in arrays for verification
 */
export class MockLogger implements Logger {
  public infoLogs: Array<{ message: string; data?: unknown }> = [];
  public debugLogs: Array<{ message: string; data?: unknown }> = [];
  public errorLogs: Array<{ message: string; error?: Error }> = [];
  public warnLogs: Array<{ message: string; data?: unknown }> = [];
  private childLoggers: MockLogger[] = [];

  info(message: string, data?: unknown): void {
    this.infoLogs.push({ message, data });
  }

  debug(message: string, data?: unknown): void {
    this.debugLogs.push({ message, data });
  }

  error(message: string, error?: Error): void {
    this.errorLogs.push({ message, error });
  }

  warn(message: string, data?: unknown): void {
    this.warnLogs.push({ message, data });
  }

  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new MockLogger();
    this.childLoggers.push(childLogger);
    return childLogger;
  }

  /** Test helper: Get all logs of all types */
  getAllLogs(): Array<{ level: string; message: string; data?: unknown }> {
    return [
      ...this.infoLogs.map(l => ({ level: 'info', ...l })),
      ...this.debugLogs.map(l => ({ level: 'debug', ...l })),
      ...this.errorLogs.map(l => ({ level: 'error', ...l })),
      ...this.warnLogs.map(l => ({ level: 'warn', ...l })),
    ];
  }
}

/**
 * Mock Tool Executor for testing agentic nodes
 * Records execution history and returns configurable responses
 */
export class MockToolExecutor implements ToolExecutor {
  public executionHistory: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>[] = [];
  private responseQueue: unknown[] = [];
  private currentResponseIndex = 0;

  constructor(responses?: unknown | unknown[]) {
    // Support single response or array of responses for multiple calls
    if (responses !== undefined) {
      this.responseQueue = Array.isArray(responses) ? responses : [responses];
    }
  }

  execute(data: MCPToolInvocationData<z.ZodObject<z.ZodRawShape>>): unknown {
    this.executionHistory.push(data);

    if (this.responseQueue.length === 0) {
      return undefined;
    }

    const response = this.responseQueue[this.currentResponseIndex];
    // Loop through responses for multiple calls
    this.currentResponseIndex = (this.currentResponseIndex + 1) % this.responseQueue.length;
    return response;
  }

  /** Test helper: Check if tool was executed with specific data */
  wasExecutedWith(toolName: string): boolean {
    return this.executionHistory.some(call => call.llmMetadata.name === toolName);
  }

  /** Test helper: Get execution count for a specific tool */
  getExecutionCount(toolName?: string): number {
    if (toolName === undefined) {
      return this.executionHistory.length;
    }
    return this.executionHistory.filter(call => call.llmMetadata.name === toolName).length;
  }

  /** Test helper: Reset execution history */
  reset(): void {
    this.executionHistory = [];
    this.currentResponseIndex = 0;
  }
}

/**
 * Factory function to create a simple test workflow
 */
export function createSimpleTestWorkflow(): CompiledStateGraph<SimpleState> {
  const StateAnnotation = Annotation.Root({
    value: Annotation<string>,
  });

  const workflow = new StateGraph(StateAnnotation)
    .addNode('start', state => ({ value: `processed-${state.value}` }))
    .addEdge(START, 'start')
    .addEdge('start', END);

  return workflow.compile();
}

/**
 * Factory function to create a test workflow with interrupt (for testing agentic nodes)
 */
export function createInterruptingTestWorkflow(): CompiledStateGraph<SimpleState> {
  const StateAnnotation = Annotation.Root({
    value: Annotation<string>,
    interruptData: Annotation<unknown>,
  });

  const workflow = new StateGraph(StateAnnotation)
    .addNode('interruptNode', state => {
      const data = interrupt({ test: 'interrupt data' });
      return { interruptData: data };
    })
    .addNode('processNode', state => ({
      value: `processed-${state.value}`,
    }))
    .addEdge(START, 'interruptNode')
    .addEdge('interruptNode', 'processNode')
    .addEdge('processNode', END);

  return workflow.compile();
}
```

**Usage Example in Tests:**

```typescript
// Example test using DI/IoC patterns
describe('OrchestratorTool', () => {
  let server: McpServer; // Real server instance
  let mockLogger: MockLogger;
  let mockToolExecutor: MockToolExecutor;

  beforeEach(() => {
    // Create instances - use real McpServer, mock only what needs mocking
    server = createTestMcpServer();
    mockLogger = new MockLogger();
    mockToolExecutor = new MockToolExecutor({ result: 'test' });
  });

  it('should register orchestrator tool', () => {
    const config: OrchestratorConfig<typeof SimpleState> = {
      toolId: 'test-orchestrator',
      title: 'Test',
      description: 'Test orchestrator',
      workflow: createSimpleTestWorkflow(),
      context: { environment: 'test' }, // Use in-memory checkpointing
    };

    const orchestrator = new OrchestratorTool(server, config, mockLogger);
    orchestrator.register({ readOnlyHint: false });

    // Verify using mock logger's captured logs
    expect(mockLogger.infoLogs.length).toBeGreaterThan(0);
    const registrationLog = mockLogger.infoLogs.find(log =>
      log.message.includes('Registering MCP tool')
    );
    expect(registrationLog).toBeDefined();
  });

  it('should execute workflow with real server', async () => {
    const config: OrchestratorConfig<typeof SimpleState> = {
      toolId: 'test-orchestrator',
      title: 'Test',
      description: 'Test',
      workflow: createSimpleTestWorkflow(),
      context: { environment: 'test' }, // Use in-memory checkpointing
    };

    const orchestrator = new OrchestratorTool(server, config, mockLogger);
    orchestrator.register({ readOnlyHint: false });

    // Test tool invocation through the real server
    const result = await orchestrator.handleRequest({
      userInput: { value: 'test' },
    });

    expect(result).toBeDefined();
  });
});
```

**Key Principles:**

- ✅ **Prefer real implementations** when practical (lightweight, no external dependencies, deterministic)
- ✅ All mocks are concrete classes implementing interfaces
- ✅ Mock behavior is controlled through constructor parameters and public methods
- ✅ Test verification uses public properties (arrays, counters) not framework spies
- ✅ Mock implementations are reusable across tests
- ✅ No runtime patching or monkey-patching
- ✅ Production code remains testable through dependency injection

**When to Mock vs. Use Real Implementations:**

| Dependency Type                     | Strategy                        | Rationale                                                                |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `McpServer`                         | ✅ Use real instance            | Complex interface; real implementation is lightweight for tests          |
| `Logger`                            | ✅ Mock with `MockLogger`       | Need to verify logging behavior; real logger has file I/O side effects   |
| `ToolExecutor` (for workflow nodes) | ✅ Mock with `MockToolExecutor` | Production version uses LangGraph interrupt; need controllable responses |
| `MemorySaver` (checkpointer)        | ✅ Use real instance            | Perfect for tests; in-memory, no persistence side effects                |
| `JsonCheckpointSaver`               | ⚠️ Mock or use MemorySaver      | Has file I/O side effects; use MemorySaver in tests instead              |
| Simple workflow `StateGraph`        | ✅ Use real instance            | Deterministic; tests exercise real LangGraph behavior                    |

---

## Nx Monorepo Configuration

### Package Dependencies

Configure Nx to ensure proper build ordering:

```json
// packages/mcp-workflow/project.json
{
  "name": "@salesforce/magen-mcp-workflow",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "main": "{projectRoot}/src/index.ts",
        "outputPath": "packages/mcp-workflow/dist",
        "tsConfig": "{projectRoot}/tsconfig.json"
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "config": "{projectRoot}/vitest.config.mts"
      }
    },
    "test:coverage": {
      "executor": "@nx/vite:test",
      "options": {
        "config": "{projectRoot}/vitest.config.mts",
        "coverage": true
      }
    }
  }
}
```

```json
// packages/mobile-native-mcp-server/project.json
{
  "name": "@salesforce/mobile-native-mcp-server",
  "implicitDependencies": ["@salesforce/magen-mcp-workflow"],
  "targets": {
    "build": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Workspace Configuration

Update workspace package references:

```json
// packages/mobile-native-mcp-server/package.json
{
  "dependencies": {
    "@salesforce/magen-mcp-workflow": "*",
    "@langchain/langgraph": "^0.4.9",
    "@modelcontextprotocol/sdk": "^1.20.1",
    "dedent": "^1.7.0",
    "pino": "^9.9.5",
    "zod": "^3.25.67",
    "zod-to-json-schema": "^3.24.6"
  }
}
```

```json
// packages/mcp-workflow/package.json
{
  "name": "@salesforce/magen-mcp-workflow",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@langchain/langgraph": "^0.4.9",
    "@langchain/langgraph-checkpoint": "^0.0.11",
    "@langchain/core": "^0.3.28",
    "@modelcontextprotocol/sdk": "^1.20.1",
    "pino": "^9.9.5",
    "zod": "^3.25.67",
    "zod-to-json-schema": "^3.24.6"
  },
  "devDependencies": {
    "@types/node": "^24.8.1",
    "@vitest/coverage-v8": "^3.2.4",
    "typescript": "^5.9.3",
    "vitest": "^3.2.3"
  }
}
```

### Verifying Nx Configuration

Throughout implementation, use these commands to verify Nx correctly recognizes the dependencies:

**1. View Interactive Dependency Graph**

```bash
nx graph
```

This opens a browser window with an interactive visualization of all project dependencies. You should see:

- Both `mcp-workflow` and `mobile-native-mcp-server` as nodes
- A directed edge from `mobile-native-mcp-server` → `mcp-workflow`
- The edge is labeled with the dependency type (usually "implicit" or "npm")

**2. List Project Dependencies**

```bash
nx show project mobile-native-mcp-server --web
```

Opens a browser showing detailed project information including:

- Dependencies array should list `mcp-workflow`
- Build target should show `dependsOn: ["^build"]` ensuring dependencies build first

**3. Check Dependency Resolution**

```bash
# Verify workspace reference resolves to local package
npm ls @salesforce/magen-mcp-workflow

# Expected output should show:
# mobile-mcp-tools@ /path/to/mobile-mcp-tools
# └─┬ @salesforce/mobile-native-mcp-server@0.0.1-alpha.2
#   └── @salesforce/magen-mcp-workflow@0.1.0 -> ./packages/mcp-workflow
```

**4. Test Dependency Build Order**

```bash
# Clean builds to test from scratch
rm -rf packages/*/dist

# Build mobile-native-mcp-server - should trigger mcp-workflow build first
nx build @salesforce/mobile-native-mcp-server --verbose
```

The verbose output should show:

```
NX   Running target build for project @salesforce/mobile-native-mcp-server and 1 task it depends on:

> nx run @salesforce/magen-mcp-workflow:build
  [mcp-workflow builds]

> nx run @salesforce/mobile-native-mcp-server:build
  [mobile-native-mcp-server builds]
```

This confirms that Nx recognizes the dependency and builds `mcp-workflow` before `mobile-native-mcp-server`.

**5. Verify No Circular Dependencies**

```bash
nx graph --focus=mcp-workflow
nx graph --focus=mobile-native-mcp-server
```

These focused views help identify any circular dependencies. Neither package should depend on the other (only mobile-native → mcp-workflow).

**Common Issues and Solutions**:

| Issue                             | Symptoms                                                | Solution                                                                                 |
| --------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Nx doesn't recognize new package  | `nx show project mcp-workflow` fails                    | Run `nx reset` to clear cache, then `npm install`                                        |
| Workspace reference not resolving | Import errors in IDE                                    | Ensure `"@salesforce/magen-mcp-workflow": "*"` in package.json, then run `npm install`   |
| Build order incorrect             | `mobile-native-mcp-server` builds before `mcp-workflow` | Add `"dependsOn": ["^build"]` to mobile-native-mcp-server's build target in project.json |
| Dependency not showing in graph   | Graph shows no connection                               | Check both package.json dependency AND project.json implicitDependencies                 |

---

## Acceptance Criteria

### Functional Requirements

- [ ] New `@salesforce/magen-mcp-workflow` package builds successfully
- [ ] `mobile-native-mcp-server` builds successfully with mcp-workflow as dependency
- [ ] All workflow functionality works identically to pre-refactoring state
- [ ] `OrchestratorTool` accepts custom StateGraph configurations
- [ ] `OrchestratorTool` accepts custom tool IDs
- [ ] Checkpointing works with configurable storage locations
- [ ] All base classes are generic over state types
- [ ] No hard-coded references to mobile-specific concepts in mcp-workflow package

### Code Quality Requirements

- [ ] Both packages achieve ≥95% test coverage
- [ ] All tests pass in both packages
- [ ] No circular dependencies exist
- [ ] All exported APIs have comprehensive JSDoc comments
- [ ] TypeScript strict mode enabled with no `any` types (except where necessary)
- [ ] ESLint passes with zero warnings
- [ ] Prettier formatting applied consistently

### Dependency Injection Requirements

- [ ] No test framework mocking utilities used (e.g., no vi.mock, jest.mock)
- [ ] All dependencies injected through constructors
- [ ] All external dependencies have interface abstractions
- [ ] Mock implementations provided for testing
- [ ] Production and test implementations coexist without runtime switching

### Documentation Requirements

- [ ] `mcp-workflow/README.md` provides comprehensive usage guide
- [ ] `mobile-native-mcp-server/README.md` updated to reference extraction
- [ ] All public APIs have JSDoc comments
- [ ] Architecture diagrams updated in docs/
- [ ] Example workflows provided and tested
- [ ] This TDD added to docs/ directory

### Integration Requirements

- [ ] Nx dependency graph correctly shows mobile-native-mcp-server depends on mcp-workflow
  - **Verification**: Run `nx graph` to open the interactive dependency graph viewer
  - **Expected**: Visual graph shows an arrow from `mobile-native-mcp-server` → `mcp-workflow`
  - **CLI Alternative**: Run `nx show project mobile-native-mcp-server --web` and verify `mcp-workflow` appears in the dependencies list
  - **Package.json Check**: Verify `mobile-native-mcp-server/package.json` contains `"@salesforce/magen-mcp-workflow": "*"` in dependencies
  - **project.json Check**: Verify `mobile-native-mcp-server/project.json` includes `"implicitDependencies": ["@salesforce/magen-mcp-workflow"]` (optional but recommended)

- [ ] `nx build --all` succeeds
  - **Verification**: Run `nx run-many --target=build --all` and confirm both packages build without errors
  - **Expected Output**: Build logs show `mcp-workflow` builds before `mobile-native-mcp-server`

- [ ] `nx test --all` succeeds with ≥95% coverage
  - **Verification**: Run `nx run-many --target=test:coverage --all`
  - **Expected**: Both packages show ≥95% coverage in their respective coverage reports

- [ ] `nx build @salesforce/mobile-native-mcp-server` automatically builds mcp-workflow first
  - **Verification**: Run `nx build @salesforce/mobile-native-mcp-server --verbose`
  - **Expected Output**: Build logs show `mcp-workflow` is built as a dependency before `mobile-native-mcp-server` starts building
  - **Dependency Cache**: If `mcp-workflow` is already built and cached, Nx will skip rebuilding it (this is correct behavior)

- [ ] No version conflicts in dependency tree
  - **Verification**: Run `npm ls` from workspace root and check for any warnings about conflicting versions
  - **Shared Dependencies**: Verify both packages use the same versions of shared dependencies like `@langchain/langgraph`, `zod`, etc.
  - **Package Resolution**: Confirm workspace reference resolves correctly: `npm ls @salesforce/magen-mcp-workflow` should show the local workspace package

### Verification Requirements

- [ ] End-to-end mobile app generation workflow executes successfully
- [ ] State persistence and recovery works correctly
- [ ] Agentic node interrupts and resumptions work correctly
- [ ] No functionality regressions in mobile-native-mcp-server
- [ ] Example workflows in mcp-workflow package execute successfully

---

## Timeline Considerations

### Estimated Effort

**Phase-by-Phase Estimates** (in ideal development time):

- Phase 1: Package Scaffolding - 0.5 days
- Phase 2: Extract Core Infrastructure - 1 day
- Phase 3: Extract Base Classes - 1.5 days
- Phase 4: Extract Checkpointing Infrastructure - 1 day
- Phase 5: Extract and Generalize Orchestrator - 2 days
- Phase 6: Refactor Mobile Native MCP Server - 2 days
- Phase 7: Documentation and Polish - 1 day

**Total Estimated Effort**: 9-10 days

**Actual Timeline**: Depends on team availability, review cycles, and unforeseen issues. Plan for 2-3 weeks to account for reviews and iteration.

### Milestones

1. **Week 1**: Complete Phases 1-3 (scaffolding and infrastructure)
2. **Week 2**: Complete Phases 4-5 (checkpointing and orchestrator)
3. **Week 3**: Complete Phases 6-7 (refactoring and documentation)

### Risk Mitigation

**Risk**: Type system complexity with generic state types

- **Mitigation**: Start with simpler type constraints, iterate based on actual usage

**Risk**: Circular dependencies during extraction

- **Mitigation**: Extract in dependency order (Phase 2 before Phase 3, etc.)

**Risk**: Test coverage drops during refactoring

- **Mitigation**: Move and update tests immediately after moving each component

**Risk**: Mobile native server breaks during refactoring

- **Mitigation**: Keep both packages building at each phase; comprehensive integration tests

---

## Document History

| Version | Date       | Author       | Changes              |
| ------- | ---------- | ------------ | -------------------- |
| 1.0     | 2025-10-22 | AI Assistant | Initial TDD creation |

---

## Approval

This document is ready for review and implementation upon approval.

**Reviewer Sign-off**: _[To be completed]_

**Implementation Start Date**: _[To be determined]_
