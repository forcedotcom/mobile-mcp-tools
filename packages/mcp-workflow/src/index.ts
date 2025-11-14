/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// Common - Filesystem Operations
export { type FileSystemOperations, NodeFileSystemOperations } from './common/fileSystem.js';

// Storage (Well-Known Directory)
export {
  WELL_KNOWN_DIR_NAME,
  WELL_KNOWN_FILES,
  type WellKnownDirectoryConfig,
  WellKnownDirectoryManager,
} from './storage/wellKnownDirectory.js';

// Logging
export {
  Logger,
  PinoLogger,
  createLogger,
  createComponentLogger,
  createWorkflowLogger,
} from './logging/logger.js';

// Common Metadata
export {
  WORKFLOW_STATE_DATA_SCHEMA,
  WORKFLOW_PROPERTY_NAMES,
  WORKFLOW_TOOL_BASE_INPUT_SCHEMA,
  MCP_WORKFLOW_TOOL_OUTPUT_SCHEMA,
  type WorkflowStateData,
  type MCPToolInvocationData,
  type MCPWorkflowToolOutput,
  type ToolMetadata,
  type WorkflowToolMetadata,
} from './common/metadata.js';

// Property Metadata
export {
  type PropertyMetadata,
  type PropertyMetadataCollection,
  type InferPropertyTypes,
} from './common/propertyMetadata.js';
export { type PropertyFulfilledResult, type IsPropertyFulfilled } from './common/types.js';

// Tool Execution Infrastructure
export { type ToolExecutor, LangGraphToolExecutor } from './nodes/toolExecutor.js';

// Tool Execution Utils
export { executeToolWithLogging } from './utils/toolExecutionUtils.js';

// Base Tool Classes
export { AbstractTool, AbstractWorkflowTool } from './tools/base/index.js';

// Utility Tools
export {
  // Get Input Tool
  GetInputTool,
  createGetInputTool,
  createGetInputMetadata,
  type GetInputToolOptions,
  type GetInputToolMetadata,
  type GetInputWorkflowInput,
  GET_INPUT_PROPERTY_SCHEMA,
  GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  GET_INPUT_WORKFLOW_RESULT_SCHEMA,
  // Input Extraction Tool
  InputExtractionTool,
  createInputExtractionTool,
  createInputExtractionMetadata,
  type InputExtractionToolOptions,
  type InputExtractionToolMetadata,
  type InputExtractionWorkflowInput,
  INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA,
  INPUT_EXTRACTION_WORKFLOW_RESULT_SCHEMA,
} from './tools/utilities/index.js';

// Base Node Classes
export {
  BaseNode,
  AbstractToolNode,
  createGetUserInputNode,
  createUserInputExtractionNode,
  type GetUserInputNodeOptions,
  type UserInputExtractionNodeOptions,
} from './nodes/index.js';

// Base Service Classes
export { AbstractService } from './services/index.js';

// Checkpointing Infrastructure
export {
  JsonCheckpointSaver,
  WorkflowStatePersistence,
  WorkflowStateManager,
  type WorkflowStateManagerConfig,
  type WorkflowEnvironment,
} from './checkpointing/index.js';

// Orchestrator Tool
export {
  OrchestratorTool,
  createOrchestratorToolMetadata,
  type OrchestratorConfig,
  type OrchestratorInput,
  type OrchestratorOutput,
  type OrchestratorToolMetadata,
  ORCHESTRATOR_INPUT_SCHEMA,
  ORCHESTRATOR_OUTPUT_SCHEMA,
} from './tools/orchestrator/index.js';
