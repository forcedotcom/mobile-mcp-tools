# MCP Workflow Engine Extraction - Design Document

## Executive Summary

This document specifies the extraction of the LangGraph-based workflow engine from the `mobile-native-mcp-server` package into a new reusable `mcp-workflow` package. This refactoring will enable external teams to leverage our deterministic MCP workflow orchestration capabilities for their own MCP server implementations, while maintaining the `mobile-native-mcp-server` as a reference implementation and active consumer of the extracted engine.

### Document Purpose

This Design Document provides comprehensive specifications for the architecture, abstractions, and design philosophy of the workflow engine extraction. It defines _what_ we are building and _why_ we are building it this way.

For implementation details, migration steps, and technical guidelines, see the companion [Implementation Guide](./implementation.md).

### Key Deliverables

1. New `@salesforce/magen-mcp-workflow` package containing:
   - Reusable workflow engine components
   - Utility tools for common workflow operations
2. Refactored `mobile-native-mcp-server` package consuming the workflow engine as a dependency
3. Comprehensive test coverage (≥95%) for both packages
4. Updated documentation reflecting the new architecture
5. Zero breaking changes for end users of the mobile-native-mcp-server

---

## Consumer Model and Design Philosophy

### Target Audience

The `mcp-workflow` package is designed as **infrastructure for other teams building MCP servers**. Our primary consumers are:

- **Internal teams** building domain-specific MCP servers within the Salesforce ecosystem
- **External teams** (post-publishing) who want deterministic workflow orchestration for their MCP tool interactions
- **Any MCP server author** who needs to orchestrate complex, multi-step processes with LLM interaction

### The Workflow Engine as a Framework

`mcp-workflow` is a **framework, not an application**. It provides:

✅ **What We Provide** (Framework Infrastructure):

- Orchestrator tool for managing workflow execution
- Base classes for MCP tools and workflow nodes
- Utility tools for common operations (user input gathering, data extraction)
- State persistence and checkpointing (`.magen/` directory)
- Logging infrastructure
- Dependency injection patterns for testability

❌ **What Consumers Provide** (Domain Logic):

- Their own `StateGraph` definitions (workflow structure)
- Their own state annotations (`Annotation.Root`)
- Their own workflow nodes (business logic)
- Their own MCP server tools (domain-specific operations)
- Their own MCP server instance

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│ Consumer's MCP Server (e.g., mobile-native-mcp-server)      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Domain-Specific Logic                                │   │
│  │ - StateGraph definition (workflow structure)         │   │
│  │ - State annotations (domain state)                   │   │
│  │ - Workflow nodes (business operations)               │   │
│  │ - MCP tools (domain capabilities)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ depends on                       │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ @salesforce/magen-mcp-workflow                       │   │
│  │ - OrchestratorTool (workflow execution)              │   │
│  │ - Utility tools (GetInputTool, InputExtractionTool)  │   │
│  │ - Base classes (AbstractTool, BaseNode)              │   │
│  │ - Checkpointing infrastructure                       │   │
│  │ - Logging and storage conventions                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principle

**Every design decision in `mcp-workflow` must support the consumer model:**

1. **Configurability**: Consumers configure the workflow engine with their own workflows, not the other way around
2. **Genericity**: All components are generic over state types and workflow structures
3. **Encapsulation**: Implementation details (checkpointing, thread IDs) are hidden from consumers
4. **Convention over Configuration**: Sensible defaults (`.magen/` directory) with escape hatches (environment variables)
5. **Documentation**: API design assumes consumers are unfamiliar with our implementation

---

## Goals and Objectives

### Primary Goals

1. **Reusability**: Extract workflow engine components into a standalone package that can be consumed by any MCP server project
2. **Maintainability**: Establish clear separation of concerns between generic workflow orchestration and domain-specific mobile app generation logic
3. **Testability**: Achieve ≥95% code coverage through dependency injection and inversion of control patterns
4. **Integration**: Ensure mobile-native-mcp-server remains fully functional as a consumer of the extracted workflow engine
5. **Documentation**: Provide clear guidance for consumers on how to integrate and configure the workflow engine

### Non-Goals

- **Backward Compatibility**: This is pre-release software; breaking changes are acceptable in service of better design
- **Non-Standard Consumption Patterns**: External consumers will use standard npm package management exclusively. We will not support git submodules, direct repository references, or other quasi-internal consumption patterns
- **Additional Features**: This is a refactoring effort; no new workflow capabilities will be added

### Dependency Management Strategy

**Within the Monorepo**:

- `mobile-native-mcp-server` will use **Nx workspace references** to depend on `mcp-workflow`
- Both packages must remain compatible at HEAD at all times
- Breaking changes to `mcp-workflow` require coordinated updates to `mobile-native-mcp-server` in the same commit/PR
- Use `"@salesforce/magen-mcp-workflow": "*"` in `mobile-native-mcp-server/package.json` to ensure in-tree version is always used
- This ensures consistent support and compatibility across the monorepo codebase

**External Consumption** (post-publishing):

- `mcp-workflow` will be published to npmjs.com as a standalone package using the existing `@salesforce/project-maintenance-utilities` infrastructure and GitHub Actions workflows
- External projects will consume `mcp-workflow` through standard npm dependency management with semantic versioning
- External consumers are independent of `mobile-native-mcp-server` and other monorepo code
- Standard npm ecosystem practices apply: versioning, peer dependencies, semver compatibility

### Storage Convention: The `.magen` Directory

**Philosophy**: Convention over configuration for workflow artifacts.

The `mcp-workflow` package adopts an opinionated approach to storage, using a well-known directory (`.magen/`) for workflow state and logs. This provides:

- **Consistency**: All consumers use the same storage location, simplifying documentation and troubleshooting
- **Discoverability**: Developers know where to find workflow artifacts across different projects
- **Simplicity**: No configuration required for the common case
- **Flexibility**: Configurable via `PROJECT_PATH` environment variable for edge cases

**Default Behavior**:

- Workflow state: `~/.magen/workflow-state.json` (or `$PROJECT_PATH/.magen/workflow-state.json`)
- Workflow logs: `~/.magen/workflow_logs.json`
- Hidden directory (`.` prefix) keeps it out of the way during normal development

**Configuration**:

```bash
# Default: Uses home directory
# State stored in: ~/.magen/

# Custom location via environment variable
export PROJECT_PATH=/path/to/project
# State stored in: /path/to/project/.magen/
```

**Rationale**:

- The `.magen` (Magen) name is sufficiently agnostic to remove any specific
  implications of its naming, on the projects that consume it as a framework.
- Hiding the directory (`.` prefix) prevents clutter in project listings
- Environment-based override provides escape hatch without code changes
- Single storage location simplifies cleanup and troubleshooting

**For Consumers**:

- ✅ **Just works**: No configuration needed for most use cases
- ✅ **Testable**: Tests can set `PROJECT_PATH` to temporary directories
- ✅ **Portable**: Same structure works across all platforms (macOS, Linux, Windows)
- ✅ **Discoverable**: Clear documentation of where artifacts live

---

## Current State Assessment

### Architecture Overview

The current workflow engine is tightly integrated into the `mobile-native-mcp-server` package with the following key components:

```
mobile-native-mcp-server/
├── src/
│   ├── common/
│   │   ├── metadata.ts          # Workflow metadata interfaces and schemas
│   │   ├── propertyMetadata.ts  # Property extraction metadata types
│   │   └── schemas.ts            # Common schema definitions
│   ├── logging/
│   │   └── logger.ts             # Logging infrastructure
│   ├── tools/
│   │   ├── base/
│   │   │   ├── abstractTool.ts          # Base class for all MCP tools
│   │   │   └── abstractWorkflowTool.ts  # Base class for workflow tools
│   │   └── workflow/
│   │       └── sfmobile-native-project-manager/
│   │           ├── tool.ts      # Orchestrator implementation
│   │           └── metadata.ts  # Orchestrator metadata
│   └── workflow/
│       ├── graph.ts             # Mobile-specific StateGraph definition
│       ├── metadata.ts          # Mobile-specific state annotations
│       ├── jsonCheckpointer.ts  # Custom checkpoint persistence
│       ├── workflowStatePersistence.ts  # State file I/O
│       ├── nodes/
│       │   ├── abstractBaseNode.ts      # Base class for all nodes
│       │   ├── abstractToolNode.ts      # Base class for tool-invoking nodes
│       │   ├── toolExecutor.ts          # Tool execution abstraction
│       │   └── [mobile-specific nodes]  # Domain-specific implementations
│       ├── services/
│       │   ├── abstractService.ts       # Base class for services
│       │   └── [mobile-specific services]
│       └── utils/
│           └── toolExecutionUtils.ts    # Shared tool execution logic
└── tests/
    └── [corresponding test files]
```

### Dependencies

Current dependencies from `mobile-native-mcp-server/package.json`:

```json
{
  "dependencies": {
    "@langchain/langgraph": "^0.4.9",
    "@modelcontextprotocol/sdk": "^1.20.1",
    "dedent": "^1.7.0",
    "pino": "^9.9.5",
    "zod": "^3.25.67",
    "zod-to-json-schema": "^3.24.6"
  }
}
```

### Key Insights

1. **Hard-coded Orchestrator Name**: The orchestrator tool ID `'sfmobile-native-project-manager'` is hard-coded and referenced throughout the codebase
2. **Tightly Coupled State**: `MobileNativeWorkflowState` and `mobileNativeWorkflow` are specific to the mobile use case
3. **Mixed Concerns**: Generic workflow infrastructure and mobile-specific business logic are intermingled
4. **Shared Utilities**: Several utility modules are genuinely reusable across workflow implementations
5. **Test Patterns**: Existing tests use dependency injection well, providing a good foundation for refactoring

---

## Proposed Architecture

### Package Structure

```
packages/
├── mcp-workflow/                    # NEW: Reusable workflow engine
│   ├── src/
│   │   ├── common/
│   │   │   ├── metadata.ts          # Workflow metadata interfaces and schemas
│   │   │   ├── propertyMetadata.ts  # Property extraction metadata types
│   │   │   └── types.ts             # Common type definitions
│   │   ├── storage/
│   │   │   ├── wellKnownDirectory.ts    # Well-known directory management (.magen/)
│   │   │   └── index.ts
│   │   ├── logging/
│   │   │   ├── logger.ts            # Logger interface and base impl
│   │   │   └── index.ts
│   │   ├── checkpointing/
│   │   │   ├── jsonCheckpointer.ts      # JSON-based checkpoint persistence
│   │   │   ├── statePersistence.ts      # State file I/O abstraction
│   │   │   ├── interfaces.ts            # Checkpointing interfaces
│   │   │   └── index.ts
│   │   ├── tools/
│   │   │   ├── base/
│   │   │   │   ├── abstractTool.ts          # Base class for all MCP tools
│   │   │   │   ├── abstractWorkflowTool.ts  # Base class for workflow tools
│   │   │   │   └── index.ts
│   │   │   ├── orchestrator/
│   │   │   │   ├── orchestratorTool.ts  # Generic orchestrator implementation
│   │   │   │   ├── metadata.ts          # Orchestrator metadata factory
│   │   │   │   ├── config.ts            # Orchestrator configuration interface
│   │   │   │   └── index.ts
│   │   │   ├── utilities/
│   │   │   │   ├── getInput/
│   │   │   │   │   ├── tool.ts              # Get user input tool
│   │   │   │   │   ├── metadata.ts          # Get input metadata
│   │   │   │   │   ├── factory.ts           # Factory function for tool creation
│   │   │   │   │   └── index.ts
│   │   │   │   ├── inputExtraction/
│   │   │   │   │   ├── tool.ts              # Input extraction tool
│   │   │   │   │   ├── metadata.ts          # Input extraction metadata
│   │   │   │   │   ├── factory.ts           # Factory function for tool creation
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── nodes/
│   │   │   ├── abstractBaseNode.ts      # Base class for all nodes
│   │   │   ├── abstractToolNode.ts      # Base class for tool-invoking nodes
│   │   │   ├── toolExecutor.ts          # Tool execution abstraction
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── abstractService.ts       # Base class for services
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── toolExecutionUtils.ts    # Shared tool execution logic
│   │   │   ├── threadIdGenerator.ts     # Thread ID generation
│   │   │   └── index.ts
│   │   └── index.ts                     # Main package exports
│   ├── tests/
│   │   └── [test files mirroring src structure]
│   ├── package.json
│   ├── tsconfig.json
│   ├── project.json
│   └── README.md
│
└── mobile-native-mcp-server/        # REFACTORED: Consumes mcp-workflow
    ├── src/
    │   ├── common/
    │   │   └── schemas.ts           # Mobile-specific schemas only
    │   ├── tools/
    │   │   ├── plan/               # Mobile-specific plan tools
    │   │   ├── run/                # Mobile-specific run tools
    │   │   └── utils/              # Mobile-specific utilities
    │   ├── workflow/
    │   │   ├── graph.ts            # Mobile-specific StateGraph
    │   │   ├── metadata.ts         # Mobile-specific state annotations
    │   │   ├── orchestrator.ts     # Mobile orchestrator configuration
    │   │   ├── nodes/              # Mobile-specific node implementations
    │   │   └── services/           # Mobile-specific services
    │   ├── utils/
    │   │   └── FileSystemProvider.ts  # Mobile-specific utilities only
    │   └── index.ts
    └── package.json               # Now depends on @salesforce/magen-mcp-workflow
```

### Core Abstractions

#### 1. Generic Orchestrator Tool

The orchestrator will be generalized to accept configuration:

````typescript
// mcp-workflow/src/tools/orchestrator/config.ts
import { AnnotationRoot, StateDefinition } from '@langchain/langgraph';

/**
 * Workflow execution environment
 */
export type WorkflowEnvironment = 'production' | 'test';

/**
 * Context object for workflow execution configuration
 * Provides high-level environment information without exposing implementation details
 */
export interface WorkflowContext {
  /**
   * Execution environment - determines checkpointing strategy
   * - 'production': Uses JsonCheckpointSaver with .magen/ directory persistence
   * - 'test': Uses MemorySaver for isolated, in-memory state (no file I/O)
   */
  environment: WorkflowEnvironment;
}

/**
 * Orchestrator configuration interface
 *
 * @template TState - An AnnotationRoot type (e.g., typeof MyWorkflowState where MyWorkflowState = Annotation.Root({...}))
 *
 * Example usage:
 * ```
 * const MyWorkflowState = Annotation.Root({ messages: Annotation<string[]>() });
 * const myConfig: OrchestratorConfig<typeof MyWorkflowState> = {
 *   toolId: 'my-orchestrator',
 *   workflow: new StateGraph(MyWorkflowState)...,
 *   context: { environment: 'production' } // Optional, defaults to production
 * };
 * ```
 */
export interface OrchestratorConfig<TState extends AnnotationRoot<StateDefinition>> {
  /** Unique tool identifier for MCP registration */
  toolId: string;

  /** Extended tool title for display */
  title: string;

  /** Tool description for documentation */
  description: string;

  /**
   * The LangGraph StateGraph workflow definition (uncompiled)
   *
   * Note: StateGraph has 8 generic type parameters. The first is the AnnotationRoot itself (TState),
   * and the remaining 7 are set to 'any' because they're inferred during construction and
   * impractical to specify as input parameters.
   *
   * The state type (TState['State']) is automatically derived by StateGraph from the AnnotationRoot.
   */
  workflow: StateGraph<TState, any, any, any, any, any, any, any>;

  /**
   * Workflow execution context
   * Optional - defaults to { environment: 'production' }
   *
   * The environment determines the checkpointing strategy:
   * - 'production': JsonCheckpointSaver with .magen/ directory persistence
   * - 'test': MemorySaver for isolated, in-memory state (no file I/O)
   *
   * All checkpointing implementation details are encapsulated within the orchestrator.
   */
  context?: WorkflowContext;

  /**
   * Logger instance for workflow operations
   * Optional - defaults to logger using wellKnownDirectory for log files
   */
  logger?: Logger;
}

/**
 * Orchestrator input schema
 *
 * Note: The workflow state data is optional/defaulted because the orchestrator
 * can start new workflows (where it doesn't exist yet) or continue existing ones.
 */
export const ORCHESTRATOR_INPUT_SCHEMA = z.object({
  userInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'User input - can be any data structure from initial request or previously executed MCP tool'
    ),
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.default({
    thread_id: '',
  }).describe('Opaque workflow state data. Do not populate unless explicitly instructed to do so.'),
});

export type OrchestratorInput = z.infer<typeof ORCHESTRATOR_INPUT_SCHEMA>;

/**
 * Orchestrator output schema - natural language orchestration prompt
 */
export const ORCHESTRATOR_OUTPUT_SCHEMA = z.object({
  orchestrationInstructionsPrompt: z
    .string()
    .describe('The prompt describing the next workflow action for the LLM to execute.'),
});

export type OrchestratorOutput = z.infer<typeof ORCHESTRATOR_OUTPUT_SCHEMA>;

/**
 * Orchestrator tool metadata type
 * The metadata for the orchestrator tool (inputs/outputs)
 */
export type OrchestratorToolMetadata = ToolMetadata<
  typeof ORCHESTRATOR_INPUT_SCHEMA,
  typeof ORCHESTRATOR_OUTPUT_SCHEMA
>;

/**
 * Factory function to create orchestrator tool metadata from configuration
 * Takes the consumer-provided config and creates the tool metadata with
 * standardized input/output schemas.
 */
export function createOrchestratorToolMetadata<TState extends AnnotationRoot<StateDefinition>>(
  config: OrchestratorConfig<TState>
): OrchestratorToolMetadata {
  return {
    toolId: config.toolId,
    title: config.title,
    description: config.description,
    inputSchema: ORCHESTRATOR_INPUT_SCHEMA, // Standard orchestrator input schema
    outputSchema: ORCHESTRATOR_OUTPUT_SCHEMA, // Standard orchestrator output schema
  };
}

// mcp-workflow/src/tools/orchestrator/orchestratorTool.ts
export class OrchestratorTool<
  TState extends AnnotationRoot<StateDefinition>,
> extends AbstractTool<OrchestratorToolMetadata> {
  private readonly compiledWorkflow: CompiledStateGraph<
    TState['State'], // S - The actual state type extracted from the AnnotationRoot
    any, // U - Update type (derived from state)
    any, // N - Node names (string union)
    any, // I - Input schema
    any, // O - Output schema
    any, // C - Context schema
    any // NodeReturnType
  >;
  private readonly checkpointer: BaseCheckpointSaver;
  private readonly logger: Logger;

  constructor(
    server: McpServer,
    private readonly config: OrchestratorConfig<TState>
  ) {
    super(server, createOrchestratorToolMetadata(config), config.logger);
    this.logger = config.logger || createWorkflowLogger('OrchestratorTool');

    // Initialize checkpointer based on context (encapsulated from consumer)
    const environment = config.context?.environment || 'production';
    if (environment === 'test') {
      // Test environment: Use in-memory checkpointer (no file I/O)
      this.checkpointer = new MemorySaver();
    } else {
      // Production environment: Use JsonCheckpointSaver with .magen/ directory persistence
      const workflowStateStorePath = getWorkflowStateStorePath();
      const statePersistence = new WorkflowStatePersistence(workflowStateStorePath);
      this.checkpointer = new JsonCheckpointSaver(statePersistence);
    }

    // Compile workflow with our checkpointer
    // This is why we accept StateGraph (uncompiled) - compilation requires the checkpointer,
    // which is an implementation detail consumers shouldn't need to manage
    this.compiledWorkflow = config.workflow.compile({
      checkpointer: this.checkpointer,
    });
  }

  /**
   * Create the thread configuration for LangGraph workflow invocation.
   *
   * Subclasses can override this method to add additional properties to
   * `configurable`, such as progressReporter for long-running operations.
   *
   * @param threadId - The thread ID for checkpointing
   * @returns Configuration object for workflow invocation
   */
  protected createThreadConfig(threadId: string): { configurable: { thread_id: string } } {
    return { configurable: { thread_id: threadId } };
  }

  // ... handleRequest method uses this.compiledWorkflow ...
  // ... createOrchestrationPrompt for delegate mode ...
  // ... createDirectGuidancePrompt for direct guidance mode ...
}
````

**Design Rationale: Why Accept Uncompiled `StateGraph` and Use Context-Based Configuration?**

The `OrchestratorConfig` accepts an uncompiled `StateGraph` and a simple `context` object for several reasons:

1. **Circular Dependency Prevention**: Compiling a StateGraph requires a checkpointer instance:

   ```typescript
   const compiled = workflow.compile({ checkpointer: someCheckpointer });
   ```

   If consumers had to provide a `CompiledStateGraph`, they would need to create a checkpointer first, which would expose implementation details. By accepting an uncompiled `StateGraph`, the orchestrator can create the checkpointer and compile the workflow internally.

2. **Complete Encapsulation**: Consumers don't need to know about:
   - `MemorySaver` vs `JsonCheckpointSaver` classes
   - `WorkflowStatePersistence` implementation
   - `.magen/` directory structure
   - Checkpointer creation APIs

   They simply specify `context: { environment: 'test' }` or `context: { environment: 'production' }`, and the orchestrator handles all implementation details.

3. **Simple, Intent-Driven API**: The `context.environment` property expresses the _intent_ ('test' or 'production') rather than the _mechanism_ (specific checkpointer classes). This aligns with high-level configuration principles.

4. **Separation of Concerns**: Consumers define _what_ the workflow does (`StateGraph` structure) and _what environment_ it runs in (`context.environment`), while the orchestrator determines _how_ to implement checkpointing, persistence, and thread management.

#### 2. Configurable Base Node

The base node class will be generic over the AnnotationRoot type, with the actual state type derived from `TState["State"]`:

````typescript
// mcp-workflow/src/nodes/abstractBaseNode.ts
import { StateType, StateDefinition } from '@langchain/langgraph';

/**
 * Base class for all workflow nodes
 *
 * @template TState - The state type for the workflow (defaults to StateType<StateDefinition>)
 *
 * Design Note: BaseNode works directly with state types (StateType<SD>) rather than AnnotationRoot types.
 * This simplifies the API for node authors, as nodes operate on state objects and don't need
 * to understand LangGraph's AnnotationRoot metadata. The AnnotationRoot constraint is kept
 * at the OrchestratorConfig level where it's needed for LangGraph compilation.
 *
 * The default type (StateType<StateDefinition>) is LangGraph's own type for workflow state.
 *
 * Example:
 * ```
 * const MyWorkflowState = Annotation.Root({ count: Annotation<number>() });
 * type State = typeof MyWorkflowState.State; // This is StateType<typeof MyWorkflowState.spec>
 *
 * class IncrementNode extends BaseNode<State> {
 *   constructor() {
 *     super('increment');
 *   }
 *
 *   execute = (state: State) => {
 *     return { count: state.count + 1 };
 *   };
 * }
 * ```
 */
export abstract class BaseNode<TState extends StateType<StateDefinition>> {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract execute: (state: TState) => Partial<TState>;
}
````

#### 3. Workflow-Aware Tool Base Class

The `AbstractWorkflowTool` class provides a base for tools that participate in workflow orchestration:

```typescript
// mcp-workflow/src/tools/abstractWorkflowTool.ts
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AbstractTool } from './abstractTool.js';
import {
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  MCPWorkflowToolOutput,
  WORKFLOW_PROPERTY_NAMES,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  WorkflowStateData,
  WorkflowToolMetadata,
} from '../common/metadata.js';
import { Logger } from '../logging/logger.js';

/**
 * Abstract base class for all workflow-participating tools.
 *
 * Workflow tools return guidance prompts that instruct the LLM to invoke the
 * orchestrator tool next, along with the necessary workflow state data.
 *
 * The orchestrator tool itself extends AbstractTool directly, as it controls
 * the workflow rather than participating in it.
 */
export abstract class AbstractWorkflowTool<
  TMetadata extends WorkflowToolMetadata<
    typeof WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
    z.ZodObject<z.ZodRawShape>,
    typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA
  >,
> extends AbstractTool<TMetadata> {
  protected readonly orchestratorToolId: string;

  constructor(
    server: McpServer,
    toolMetadata: TMetadata,
    orchestratorToolId: string, // ID of the orchestrator managing this workflow
    loggerComponentName?: string,
    logger?: Logger
  ) {
    super(server, toolMetadata, loggerComponentName, logger);
    this.orchestratorToolId = orchestratorToolId;
  }

  /**
   * Utility method for tools to add post-invocation instructions
   * that guide the LLM back to the orchestrator for workflow continuation.
   *
   * This does NOT invoke the orchestrator - it creates guidance prompts that
   * instruct the LLM to invoke the orchestrator tool next.
   *
   * @param prompt The main tool response prompt
   * @param workflowStateData Workflow state data to round-trip back to orchestrator
   * @param resultSchema The optional result schema to format the LLM's output.
   *                     If not provided, uses the tool's default result schema.
   * @returns Complete prompt with post-invocation instructions
   */
  protected finalizeWorkflowToolOutput(
    prompt: string,
    workflowStateData: WorkflowStateData,
    resultSchema?: TMetadata['resultSchema'] | string
  ): CallToolResult {
    let resultSchemaToUse = resultSchema ?? this.toolMetadata.resultSchema;
    if (!(typeof resultSchemaToUse === 'string')) {
      resultSchemaToUse = JSON.stringify(zodToJsonSchema(resultSchemaToUse));
    }

    // Create guidance instructions that tell the LLM to invoke the orchestrator next
    const postInstructions = `

# Post-Tool-Invocation Instructions

## 1. Format the results from the execution of your task

The output of your task should conform to the following JSON schema:

\`\`\`json
${resultSchemaToUse}
\`\`\`

## 2. Invoke the next tool to continue the workflow

You MUST initiate the following actions to proceed with the in-progress workflow.

### 2.1. Invoke the \`${this.orchestratorToolId}\` tool

Invoke the \`${this.orchestratorToolId}\` tool to continue the workflow.

### 2.2 Provide input values to the tool

Provide the following input values to the \`${this.orchestratorToolId}\` tool:

- \`${WORKFLOW_PROPERTY_NAMES.userInput}\`: The structured results from step 1.
- \`${WORKFLOW_PROPERTY_NAMES.workflowStateData}\`: ${JSON.stringify(workflowStateData)}

This will continue the workflow orchestration process.
`;

    const promptForLLM = prompt + postInstructions;
    const result: MCPWorkflowToolOutput = {
      promptForLLM,
      resultSchema: resultSchemaToUse,
    };
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: result,
    };
  }
}
```

**Key Design Points:**

- **Orchestrator Tool ID**: Passed as constructor parameter (not hard-coded from mobile-specific metadata)
- **Already generic**: The current implementation is workflow-agnostic; only the orchestrator tool ID needs to be configurable

#### 4. Metadata Interfaces

Core workflow metadata interfaces remain largely unchanged but are exported from the new package:

```typescript
// mcp-workflow/src/common/metadata.ts
import z from 'zod';

/**
 * Workflow state data schema for round-tripping session identity
 * This lightweight object maintains workflow session continuity across stateless MCP tool invocations
 */
export const WORKFLOW_STATE_DATA_SCHEMA = z.object({
  thread_id: z.string().describe('Unique identifier for the workflow session'),
});

export type WorkflowStateData = z.infer<typeof WORKFLOW_STATE_DATA_SCHEMA>;

/**
 * Workflow property names - single source of truth for property naming
 */
export const WORKFLOW_PROPERTY_NAMES = {
  workflowStateData: 'workflowStateData',
  userInput: 'userInput',
} as const;

/**
 * Base input schema for workflow-aware tools
 * All tools participating in workflow orchestration should extend this schema
 */
export const WORKFLOW_TOOL_BASE_INPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.describe(
    'Workflow session state for continuation. Required for all workflow-aware tools.'
  ),
});

/**
 * Base output schema for workflow-aware tools
 * Contains the workflow state data for session continuity
 */
export const MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA = z.object({
  [WORKFLOW_PROPERTY_NAMES.workflowStateData]: WORKFLOW_STATE_DATA_SCHEMA.describe(
    'Workflow session state for continuation'
  ),
});

/** Base tool metadata interface */
export interface ToolMetadata<
  TInputSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends z.ZodObject<z.ZodRawShape>,
> {
  readonly toolId: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
}

/** Workflow tool metadata interface */
export interface WorkflowToolMetadata<
  TInputSchema extends typeof WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  TResultSchema extends z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends
    typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA = typeof MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
> extends ToolMetadata<TInputSchema, TOutputSchema> {
  readonly resultSchema: TResultSchema;
}

/** MCP tool invocation data for LangGraph interrupts (Delegate Mode) */
export interface MCPToolInvocationData<TWorkflowInputSchema extends z.ZodObject<z.ZodRawShape>> {
  llmMetadata: {
    name: string;
    description: string;
    inputSchema: TWorkflowInputSchema;
  };
  input: Omit<z.infer<TWorkflowInputSchema>, 'workflowStateData'>;
}

/**
 * Node guidance data for direct guidance mode.
 * The orchestrator generates guidance directly instead of delegating to a separate tool.
 */
export interface NodeGuidanceData<TInputSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Unique identifier for this node - used for logging and debugging */
  nodeId: string;
  /** The task guidance/prompt that instructs the LLM what to do */
  taskGuidance: string;
  /** Zod schema for input validation and LLM context */
  inputSchema: TInputSchema;
  /** Input parameters - typed to business logic schema only (excludes workflowStateData) */
  input: Omit<z.infer<TInputSchema>, 'workflowStateData'>;
  /** Zod schema defining expected output structure for result validation */
  resultSchema: z.ZodObject<z.ZodRawShape>;
  /**
   * Optional example output to help the LLM understand the expected response format.
   * When provided, this concrete example is shown alongside the schema to improve
   * LLM compliance with the expected structure.
   */
  exampleOutput?: string;
}
```

#### 5. Utility Tools

The `mcp-workflow` package provides reusable utility tools that are commonly needed in workflow-based MCP servers. These tools handle general-purpose operations that are domain-agnostic.

**Why Include Utility Tools?**

While the orchestrator and base classes provide the workflow infrastructure, many workflows need similar operational capabilities:

- Gathering user input for multiple properties
- Extracting structured data from unstructured user utterances

Rather than force every consumer to implement these common patterns, we provide them as part of the framework.

##### 5.0 Direct Guidance Mode (Orchestrator-Handled)

**Purpose**: Allows the orchestrator to handle certain tasks directly by generating guidance prompts inline, eliminating the need for an intermediate tool call.

**Background**: The standard workflow (delegate mode) involves two tool calls:
1. The workflow interrupts and instructs the LLM to invoke a separate MCP tool
2. The tool returns a prompt, and the LLM executes the task
3. The LLM returns the result to the orchestrator

This adds latency and complexity. The **direct guidance mode** streamlines this by having the orchestrator generate the task prompt directly using `NodeGuidanceData`.

**How It Works**:

When a workflow node needs to provide direct guidance, it creates an interrupt with `NodeGuidanceData`:

```typescript
const nodeGuidanceData: NodeGuidanceData<typeof GET_INPUT_WORKFLOW_INPUT_SCHEMA> = {
  nodeId: 'get-user-input',
  taskGuidance: 'Ask the user for the following properties...',
  inputSchema: GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  input: {
    propertiesRequiringInput: [
      { propertyName: 'platform', friendlyName: 'Platform', description: 'Target platform' },
    ],
  },
  resultSchema: GET_INPUT_WORKFLOW_RESULT_SCHEMA,
  // Optional: provide example to improve LLM compliance
  exampleOutput: JSON.stringify({
    userUtterance: { platform: "<user's Platform value>" }
  }, null, 2),
};
return interrupt(nodeGuidanceData);
```

The orchestrator detects `NodeGuidanceData` (via the `isNodeGuidanceData` type guard) and generates a direct guidance prompt that includes:
1. Task guidance instructions
2. Input schema and data
3. Post-task instructions for returning to the orchestrator
4. Output format schema (placed at the end for better LLM attention)
5. Optional example output to improve LLM compliance

**Flow Comparison**:

```
Delegate Mode (MCPToolInvocationData):
  Node → interrupt → Orchestrator → LLM calls separate tool → Tool returns prompt → LLM executes → Returns to Orchestrator

Direct Guidance Mode (NodeGuidanceData):
  Node → interrupt → Orchestrator generates prompt directly → LLM executes → Returns to Orchestrator
```

**Benefits**:
- Reduced latency (eliminates one tool call round-trip)
- Simpler flow for common operations
- Example output support improves LLM compliance with expected schemas
- Same result validation preserved for compatibility

**Implementation**: Services like `GetInputService` automatically create `NodeGuidanceData` with appropriate example output, so existing node usage benefits without code changes.

##### 5.1 Get Input Tool

**Purpose**: Prompts the user to provide input for a set of required properties.

**Use Case**: When a workflow needs to collect multiple pieces of information from the user (e.g., app name, description, platform), this tool generates a conversational prompt asking for those values.

**Factory Function Pattern** (to avoid tool name collisions):

```typescript
// mcp-workflow/src/tools/utilities/getInput/factory.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../../../logging/logger.js';
import { GetInputTool } from './tool.js';

export interface GetInputToolOptions {
  /**
   * Optional prefix for the tool ID to avoid collisions in multi-server environments
   * @example 'mobile' → 'mobile-magen-get-input'
   * @example 'salesops' → 'salesops-magen-get-input'
   * @default undefined → 'magen-get-input'
   */
  toolIdPrefix?: string;

  /**
   * Optional orchestrator tool ID that this tool reports back to
   * @default Required - must be provided
   */
  orchestratorToolId: string;

  /** Optional logger instance */
  logger?: Logger;
}

/**
 * Factory function to create a GetInputTool with configurable tool ID
 */
export function createGetInputTool(server: McpServer, options: GetInputToolOptions): GetInputTool {
  const toolId = options.toolIdPrefix
    ? `${options.toolIdPrefix}-magen-get-input`
    : 'magen-get-input';

  return new GetInputTool(server, toolId, options.orchestratorToolId, options.logger);
}
```

**Tool Implementation**:

```typescript
// mcp-workflow/src/tools/utilities/getInput/tool.ts
export class GetInputTool extends AbstractWorkflowTool<GetInputToolMetadata> {
  constructor(server: McpServer, toolId: string, orchestratorToolId: string, logger?: Logger) {
    super(server, createGetInputMetadata(toolId), orchestratorToolId, 'GetInputTool', logger);
  }

  public handleRequest = async (input: GetInputWorkflowInput) => {
    const guidance = this.generatePromptForInputGuidance(input);
    return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
  };

  private generatePromptForInputGuidance(input: GetInputWorkflowInput): string {
    // Generate conversational prompt asking user for property values
    // (Implementation extracted from mobile-native-mcp-server)
  }
}
```

**Consumer Usage**:

```typescript
// Simple case - single MCP server
const getInputTool = createGetInputTool(server, {
  orchestratorToolId: 'my-orchestrator',
});
// Registers as: 'magen-get-input'

// Multi-server environment - avoid collisions
const getInputTool = createGetInputTool(server, {
  toolIdPrefix: 'mobile',
  orchestratorToolId: 'mobile-orchestrator',
});
// Registers as: 'mobile-magen-get-input'
```

##### 5.2 Input Extraction Tool

**Purpose**: Extracts structured property values from unstructured user input using LLM analysis.

**Use Case**: After the user provides free-form input, this tool parses their response and extracts specific property values according to a defined schema.

**Factory Function Pattern**:

```typescript
// mcp-workflow/src/tools/utilities/inputExtraction/factory.ts
export interface InputExtractionToolOptions {
  /** Optional prefix for the tool ID */
  toolIdPrefix?: string;

  /** Orchestrator tool ID that this tool reports back to */
  orchestratorToolId: string;

  /** Optional logger instance */
  logger?: Logger;
}

export function createInputExtractionTool(
  server: McpServer,
  options: InputExtractionToolOptions
): InputExtractionTool {
  const toolId = options.toolIdPrefix
    ? `${options.toolIdPrefix}-magen-input-extraction`
    : 'magen-input-extraction';

  return new InputExtractionTool(server, toolId, options.orchestratorToolId, options.logger);
}
```

**Tool Implementation**:

```typescript
// mcp-workflow/src/tools/utilities/inputExtraction/tool.ts
export class InputExtractionTool extends AbstractWorkflowTool<InputExtractionToolMetadata> {
  constructor(server: McpServer, toolId: string, orchestratorToolId: string, logger?: Logger) {
    super(
      server,
      createInputExtractionMetadata(toolId),
      orchestratorToolId,
      'InputExtractionTool',
      logger
    );
  }

  public handleRequest = async (input: InputExtractionWorkflowInput) => {
    const guidance = generateInputExtractionTaskGuidance(input);
    return this.finalizeWorkflowToolOutput(guidance, input.workflowStateData, input.resultSchema);
  };
}
```

**Design Rationale: Why Factory Functions?**

1. **Collision Avoidance**: MCP environments often have multiple servers running simultaneously. Fixed tool IDs would cause collisions.
2. **Flexibility with Defaults**: Simple case (single server) requires no configuration. Multi-server environments can easily add prefixes.
3. **Consistent Pattern**: Mirrors the orchestrator's configurable tool ID pattern.
4. **Convention**: We establish a convention (use project prefix) without enforcing it.

**Naming Convention for Multi-Server Environments**:

When deploying multiple MCP servers that use `mcp-workflow` in the same environment:

```typescript
// Mobile server
const getInputTool = createGetInputTool(server, {
  toolIdPrefix: 'mobile',
  orchestratorToolId: 'mobile-orchestrator',
});

// Sales ops server
const getInputTool = createGetInputTool(server, {
  toolIdPrefix: 'salesops',
  orchestratorToolId: 'salesops-orchestrator',
});

// Customer success server
const getInputTool = createGetInputTool(server, {
  toolIdPrefix: 'cs',
  orchestratorToolId: 'cs-orchestrator',
});
```

This ensures unique tool names across all servers while maintaining a consistent naming pattern.

---

## Outstanding Questions and Considerations

### Resolved During Design

1. **Q**: Should we publish mcp-workflow to npm initially?
   **A**: No. Start with monorepo-only consumption. External publishing is a future consideration.

2. **Q**: How do we handle the hard-coded orchestrator tool ID in AbstractWorkflowTool?
   **A**: Pass orchestrator tool ID as a configuration parameter to AbstractWorkflowTool constructor. Subclasses provide their orchestrator's tool ID.

3. **Q**: Should the logging infrastructure be extracted or remain mobile-specific?
   **A**: Extract the Logger interface and basic implementations. File path configuration allows consumers to specify their logging location.

4. **Q**: How do we maintain the close coupling between mcp-workflow and mobile-native-mcp-server during development?
   **A**: Use Nx workspace references (`"@salesforce/magen-mcp-workflow": "*"`) to ensure packages always use in-tree versions.

### Open Questions for Implementation

1. **Q**: Should we provide a default implementation of StateGraph, or require all consumers to define their own?
   **A**: **RESOLVED**: Require consumers to define their own, as state structure is inherently domain-specific. We can revisit if this adds too much complexity in practice.

2. **Q**: Do we need versioning strategy for the mcp-workflow package, even for internal use?
   **A**: **RESOLVED**: Two-tier versioning strategy:
   - **Internal monorepo consumers**: Depend on the monorepo-local version of the package. All monorepo-hosted projects will be kept in sync with `mcp-workflow` changes (HEAD compatibility).
   - **External consumers**: Strict adherence to semantic versioning. `mcp-workflow` is a first-class, productionized Node.js package hosted at npmjs.com. As a framework consumed by other code, breaking changes must follow semver conventions.

3. **Q**: Should we extract the prompts infrastructure (AbstractPrompt) as well?
   **A**: **RESOLVED**: No, prompts are not part of the core workflow engine. Keep in mobile-native-mcp-server for now. This can be reconsidered in future iterations.

4. **Q**: How should we handle platform-specific utilities like FileSystemProvider?
   **A**: **RESOLVED**: Apply this philosophy: If a utility is generic enough to be meaningfully consumed by `mcp-workflow` and is intertwined with its core functions, extract it into `mcp-workflow`. If the utility is domain-specific or not particularly intertwined with workflow engine functionality, keep it in `mobile-native-mcp-server`.

### Future Publishing Considerations

When the `mcp-workflow` package is ready for external publishing (post-initial extraction), the monorepo already provides comprehensive infrastructure for this purpose:

**Existing Publishing Infrastructure**:

- **`@salesforce/project-maintenance-utilities`**: Provides release orchestration, npm publishing utilities, and GitHub API operations
- **GitHub Actions Workflows**: Automated release and publishing workflows that integrate with project-maintenance-utilities
- **Release Orchestrator**: High-level workflow orchestration (`ReleaseOrchestrator` class) used by GitHub Actions

**Publishing Preparation Checklist** (for future work):

1. Update `mcp-workflow/package.json` to set `"private": false`
2. Ensure comprehensive README.md is complete with usage examples
3. Verify all public APIs are documented with JSDoc
4. Tag a release version following semantic versioning
5. Leverage existing GitHub Actions workflows with project-maintenance-utilities
6. Publish to npm using the established release orchestrator

**Package Configuration Considerations**:

- Package scope: `@salesforce/magen-mcp-workflow`
- Versioning: Follow semantic versioning (major.minor.patch)
- License: MIT (consistent with monorepo)
- Entry point: `dist/index.js` with full TypeScript declarations
- Peer dependencies: Document required versions of `@langchain/langgraph`, `@modelcontextprotocol/sdk`, etc.

This future work is **not part of the current scope** but is noted here to ensure the package structure and configuration are compatible with eventual publishing via the established infrastructure.

---

## References

### Related Documentation

- [Mobile Native App Generation](../5_mobile_native_app_generation.md) - Mobile-specific workflow implementation
- [Project Overview](../1_project_overview.md) - Overall project context
- [Implementation Guide](./implementation.md) - Migration steps and technical implementation details

### External Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - LangGraph state graph concepts
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/) - MCP protocol details
- [Nx Monorepo Documentation](https://nx.dev/) - Nx workspace configuration

---

## Appendix A: Package Export Structure

### mcp-workflow Package Exports

```typescript
// packages/mcp-workflow/src/index.ts

// Common types and metadata
export * from './common/metadata.js';
export * from './common/propertyMetadata.js';
export * from './common/types.js';

// Storage (well-known directory)
export * from './storage/index.js';

// Logging
export * from './logging/index.js';

// Checkpointing
export * from './checkpointing/index.js';

// Tools (base classes, orchestrator, and utilities)
export * from './tools/index.js';

// Base node classes
export * from './nodes/index.js';

// Services
export * from './services/index.js';

// Utilities
export * from './utils/index.js';
```

### Consumer Import Examples

```typescript
// In mobile-native-mcp-server

// Import base classes
import {
  AbstractTool,
  AbstractWorkflowTool,
  BaseNode,
  AbstractToolNode,
} from '@salesforce/magen-mcp-workflow';

// Import orchestrator
import { OrchestratorTool, OrchestratorConfig } from '@salesforce/magen-mcp-workflow';

// Import utility tools
import { createGetInputTool, createInputExtractionTool } from '@salesforce/magen-mcp-workflow';

// Import storage utilities
import {
  getWellKnownDirectoryPath,
  getWorkflowStateStorePath,
  getWorkflowLogsPath,
  WELL_KNOWN_DIR_NAME,
} from '@salesforce/magen-mcp-workflow';

// Import types
import {
  WorkflowToolMetadata,
  MCPToolInvocationData,
  Logger,
} from '@salesforce/magen-mcp-workflow';
```

---

## Appendix B: Example Consumer Implementation

### Simple Workflow Example

```typescript
// example-consumer-server/src/workflow/simpleWorkflow.ts

import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { OrchestratorTool, OrchestratorConfig, BaseNode } from '@salesforce/magen-mcp-workflow';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// 1. Define your state
const SimpleState = Annotation.Root({
  userMessage: Annotation<string>,
  response: Annotation<string>,
});

type State = typeof SimpleState.State;

// 2. Create workflow nodes
class ProcessMessageNode extends BaseNode<State> {
  constructor() {
    super('ProcessMessage');
  }

  execute = (state: State): Partial<State> => {
    return {
      response: `You said: ${state.userMessage}`,
    };
  };
}

// 3. Build the workflow (uncompiled StateGraph)
const processNode = new ProcessMessageNode();

const workflow = new StateGraph(SimpleState)
  .addNode(processNode.name, processNode.execute)
  .addEdge(START, processNode.name)
  .addEdge(processNode.name, END);
// Note: Do NOT call .compile() - OrchestratorTool handles compilation internally

// 4. Configure the orchestrator
const orchestratorConfig: OrchestratorConfig<typeof SimpleState> = {
  toolId: 'simple-orchestrator',
  title: 'Simple Orchestrator',
  description: 'A simple workflow orchestrator',
  workflow, // Pass the uncompiled StateGraph
  // context defaults to { environment: 'production' }
  // Production uses JsonCheckpointSaver with .magen/ directory
  // For tests, pass: context: { environment: 'test' } to use MemorySaver
};

// 5. Create and register the orchestrator
const server = new McpServer({ name: 'simple-server', version: '1.0.0' });
const orchestrator = new OrchestratorTool(server, orchestratorConfig);
orchestrator.register({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
});
```

---

## Document History

| Version | Date       | Author       | Changes              |
| ------- | ---------- | ------------ | -------------------- |
| 1.0     | 2025-10-22 | AI Assistant | Initial TDD creation |
| 1.1     | 2026-01-13 | AI Assistant | Added NodeGuidanceData interface with exampleOutput support, documented direct guidance mode, added createThreadConfig method for OrchestratorTool extensibility |

---

## Approval

This document is ready for review and implementation upon approval.

**Reviewer Sign-off**: _[To be completed]_

**Implementation Start Date**: _[To be determined]_
