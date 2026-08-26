/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { RunnableConfig } from '@langchain/core/runnables';
import type { ProgressReporter } from '../execution/progressReporter.js';

/**
 * Base configurable properties for workflow graphs.
 * Contains thread_id for checkpointing and optional runtime dependencies.
 *
 * This interface defines the workflow-specific properties that extend
 * LangGraph's base configurable type.
 */
export interface BaseGraphConfig {
  /** Thread ID for checkpointing */
  thread_id: string;
  /** Progress reporter for long-running operations */
  progressReporter?: ProgressReporter;
}

/**
 * Extended RunnableConfig with workflow-specific configurable properties.
 * Nodes access runtime context via config.configurable.
 *
 * The configurable property extends RunnableConfig's configurable with
 * our workflow-specific BaseGraphConfig properties. This allows nodes
 * to safely access thread_id and progressReporter when available.
 */
export interface WorkflowRunnableConfig extends RunnableConfig {
  configurable?: RunnableConfig['configurable'] & Partial<BaseGraphConfig>;
}
