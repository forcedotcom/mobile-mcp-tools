/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ToolExecutor } from '../nodes/toolExecutor.js';
import { AbstractService } from './abstractService.js';
import {
  createGetInputMetadata,
  GET_INPUT_WORKFLOW_INPUT_SCHEMA,
  GET_INPUT_WORKFLOW_RESULT_SCHEMA,
} from '../tools/utilities/index.js';
import { Logger } from '../logging/logger.js';
import { NodeGuidanceData } from '../common/metadata.js';

export interface GetInputProperty {
  /** Property name to be collected */
  readonly propertyName: string;

  /** Human-readable name for display */
  readonly friendlyName: string;

  /** Detailed description for LLM-based extraction */
  readonly description: string;

  /** Optional reason why the property is unfulfilled */
  readonly reason?: string;
}

/**
 * Provider interface for user input service.
 * This interface allows for dependency injection and testing.
 */
export interface GetInputServiceProvider {
  /**
   * Solicits user input with a given question.
   *
   * @param question - The question to ask the user
   * @returns The user's response (can be any type)
   */
  getInput(unfulfilledProperties: GetInputProperty[]): unknown;
}

/**
 * Service for getting user input for a given question.
 *
 * This service uses direct guidance mode (NodeGuidanceData) to have the orchestrator
 * generate user input collection prompts directly, eliminating the need for an
 * intermediate tool call.
 */
export class GetInputService extends AbstractService implements GetInputServiceProvider {
  /**
   * Creates a new GetInputService.
   *
   * @param toolExecutor - Tool executor for invoking the input tool (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(
    private readonly toolId: string,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('GetInputService', toolExecutor, logger);
  }

  getInput(unfulfilledProperties: GetInputProperty[]): unknown {
    this.logger.debug('Starting input request with properties', {
      unfulfilledProperties,
    });

    const metadata = createGetInputMetadata(this.toolId);
    const input = { propertiesRequiringInput: unfulfilledProperties };

    // Build a concrete example based on the actual properties being requested
    const exampleProperties = unfulfilledProperties.reduce(
      (acc, prop) => {
        acc[prop.propertyName] = `<user's ${prop.friendlyName} value>`;
        return acc;
      },
      {} as Record<string, string>
    );

    // Create NodeGuidanceData for direct guidance mode
    const nodeGuidanceData: NodeGuidanceData<typeof GET_INPUT_WORKFLOW_INPUT_SCHEMA> = {
      nodeId: metadata.toolId,
      inputSchema: metadata.inputSchema,
      input,
      taskGuidance: this.generateTaskGuidance(unfulfilledProperties),
      resultSchema: metadata.resultSchema,
      // Provide example to help LLM understand the expected userUtterance wrapper
      exampleOutput: JSON.stringify({ userUtterance: exampleProperties }),
    };

    // Execute tool with logging and validation
    const validatedResult = this.executeToolWithLogging(
      nodeGuidanceData,
      GET_INPUT_WORKFLOW_RESULT_SCHEMA
    );

    return validatedResult.userUtterance;
  }

  /**
   * Generates the task guidance for user input collection.
   *
   * @param properties - Array of properties requiring user input
   * @returns The guidance prompt string
   */
  private generateTaskGuidance(properties: GetInputProperty[]): string {
    const propertiesDescription = properties
      .map(
        property =>
          `- Property Name: ${property.propertyName}\n- Friendly Name: ${property.friendlyName}\n- Description: ${property.description}`
      )
      .join('\n\n');

    return `
# ROLE
You are an input gathering tool, responsible for explicitly requesting and gathering the
user's input for a set of unfulfilled properties.

# TASK
Your job is to provide a prompt to the user that outlines the details for a set of properties
that require the user's input. The prompt should be polite and conversational.

# CONTEXT
Here is the list of properties that require the user's input, along with their describing
metadata:

${propertiesDescription}

# INSTRUCTIONS
1. Based on the properties listed in "CONTEXT", generate a prompt that outlines the details
   for each property.
2. Present the prompt to the user and instruct the user to provide their input.
3. **IMPORTANT:** YOU MUST NOW WAIT for the user to provide a follow-up response to your prompt.
    1. You CANNOT PROCEED FROM THIS STEP until the user has provided THEIR OWN INPUT VALUE.
`;
  }
}
