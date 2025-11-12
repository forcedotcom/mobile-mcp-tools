/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseNode } from './abstractBaseNode.js';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import { INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA } from '../tools/utilities/inputExtraction/metadata.js';
import { ToolExecutor, LangGraphToolExecutor } from './toolExecutor.js';
import { Logger, createComponentLogger } from '../logging/logger.js';
import { MCPToolInvocationData } from '../common/metadata.js';
import { executeToolWithLogging } from '../utils/toolExecutionUtils.js';

/**
 * Result from property extraction containing validated properties.
 */
export interface ExtractionResult {
  /** Record of extracted properties, keyed by property name */
  extractedProperties: Record<string, unknown>;
}

/**
 * Interface for property extraction service.
 * Allows for dependency injection and testing with mock implementations.
 */
export interface InputExtractionServiceProvider {
  /**
   * Extracts structured properties from user input.
   *
   * @param userInput - Raw user input (string, object, or any format)
   * @param properties - Collection of properties to extract with their metadata
   * @returns ExtractionResult containing validated extracted properties
   */
  extractProperties(userInput: unknown, properties: PropertyMetadataCollection): ExtractionResult;
}

/**
 * Configuration options for creating a User Input Extraction Node
 */
export interface UserInputExtractionNodeOptions<TState = StateType<StateDefinition>> {
  /**
   * Collection of properties that must be collected from user
   */
  requiredProperties: PropertyMetadataCollection;

  /**
   * Tool ID for the input extraction tool (e.g., 'magen-input-extraction', 'sfmobile-native-input-extraction')
   * Required if extractionService is not provided
   */
  toolId?: string;

  /**
   * Service provider for property extraction (injectable for testing)
   * If not provided, a default implementation will be created using toolId
   */
  extractionService?: InputExtractionServiceProvider;

  /**
   * Tool executor for services (optional, defaults to LangGraphToolExecutor)
   */
  toolExecutor?: ToolExecutor;

  /**
   * Logger instance (optional, defaults to component logger)
   */
  logger?: Logger;

  /**
   * Function to get the userInput field from state
   * Default: expects state.userInput
   */
  getUserInput?: (state: TState) => unknown;
}

/**
 * Factory function to create a User Input Extraction Node
 *
 * This node extracts structured properties from user input using LLM-based
 * natural language understanding. It takes raw user input and attempts to extract
 * as many workflow properties as possible.
 *
 * @template TState - The state type for the workflow
 * @param options - Configuration options for the node
 * @returns A configured User Input Extraction Node instance
 *
 * @example
 * ```typescript
 * const MyState = Annotation.Root({
 *   userInput: Annotation<unknown>(),
 *   platform: Annotation<string>(),
 *   projectName: Annotation<string>(),
 * });
 *
 * const properties = {
 *   platform: {
 *     zodType: z.enum(['iOS', 'Android']),
 *     description: 'Target platform',
 *     friendlyName: 'platform',
 *   },
 *   projectName: {
 *     zodType: z.string(),
 *     description: 'Project name',
 *     friendlyName: 'project name',
 *   },
 * };
 *
 * const node = createUserInputExtractionNode({
 *   requiredProperties: properties,
 *   extractionService: myExtractionService,
 * });
 * ```
 */
export function createUserInputExtractionNode<TState = StateType<StateDefinition>>(
  options: UserInputExtractionNodeOptions<TState>
): BaseNode<TState> {
  const {
    requiredProperties,
    toolId,
    extractionService,
    toolExecutor = new LangGraphToolExecutor(),
    logger = createComponentLogger('UserInputExtractionNode'),
    getUserInput = (state: TState) => {
      return (state as Record<string, unknown>).userInput;
    },
  } = options;

  // Helper functions for default service implementation
  const preparePropertiesForExtraction = (
    properties: PropertyMetadataCollection
  ): Array<{ propertyName: string; description: string }> => {
    const propertiesToExtract: Array<{ propertyName: string; description: string }> = [];

    for (const [propertyName, metadata] of Object.entries(properties)) {
      propertiesToExtract.push({
        propertyName,
        description: metadata.description,
      });
    }

    logger.debug('Prepared properties for extraction', {
      count: propertiesToExtract.length,
      properties: propertiesToExtract.map(p => p.propertyName),
    });

    return propertiesToExtract;
  };

  const preparePropertyResultsSchema = (
    properties: PropertyMetadataCollection
  ): z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }> => {
    const extractedPropertiesShape: Record<string, z.ZodType> = {};

    for (const [propertyName, metadata] of Object.entries(properties)) {
      extractedPropertiesShape[propertyName] = metadata.zodType
        .describe(metadata.description)
        .nullable()
        .catch((ctx: { input: unknown }) => ctx.input);
    }

    return z.object({ extractedProperties: z.object(extractedPropertiesShape).passthrough() });
  };

  const validateAndFilterResult = (
    rawResult: unknown,
    properties: PropertyMetadataCollection,
    resultSchema: z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }>
  ): ExtractionResult => {
    const structureValidated = resultSchema.parse(rawResult);
    const { extractedProperties } = structureValidated;

    logger.debug('Validating extracted properties', {
      extractedProperties,
    });

    const validatedProperties: Record<string, unknown> = {};
    const invalidProperties: string[] = [];

    for (const [propertyName, propertyValue] of Object.entries(extractedProperties)) {
      if (propertyValue == null) {
        logger.debug(`Skipping property with null/undefined value`, { propertyName });
        continue;
      }

      const propertyMetadata = properties[propertyName];
      if (!propertyMetadata) {
        logger.warn(`Unknown property in extraction result`, { propertyName });
        continue;
      }

      try {
        const validatedValue = propertyMetadata.zodType.parse(propertyValue);
        validatedProperties[propertyName] = validatedValue;
        logger.debug(`Property validated successfully`, {
          propertyName,
          value: validatedValue,
        });
      } catch (error) {
        invalidProperties.push(propertyName);
        if (error instanceof z.ZodError) {
          logger.debug(`Property validation failed`, {
            propertyName,
            value: propertyValue,
            errors: error.errors,
          });
        } else {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Unexpected validation error for ${propertyName}: ${errorMsg}`);
          throw error;
        }
      }
    }

    if (invalidProperties.length > 0) {
      logger.info(`Some properties failed validation`, {
        invalidProperties,
        validCount: Object.keys(validatedProperties).length,
      });
    }

    return { extractedProperties: validatedProperties };
  };

  // Create default service implementation if not provided
  const service: InputExtractionServiceProvider =
    extractionService ??
    (() => {
      if (!toolId) {
        throw new Error(
          'Either toolId or extractionService must be provided to createUserInputExtractionNode'
        );
      }

      return {
        extractProperties: (
          userInput: unknown,
          properties: PropertyMetadataCollection
        ): ExtractionResult => {
          logger.debug('Starting property extraction', {
            userInput,
            propertyCount: Object.keys(properties).length,
          });

          const propertiesToExtract = preparePropertiesForExtraction(properties);
          const resultSchema = preparePropertyResultsSchema(properties);
          const resultSchemaString = JSON.stringify(zodToJsonSchema(resultSchema));

          const toolInvocationData: MCPToolInvocationData<
            typeof INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA
          > = {
            llmMetadata: {
              name: toolId,
              description: 'Parses user input and extracts structured project properties',
              inputSchema: INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA,
            },
            input: {
              userUtterance: userInput,
              propertiesToExtract,
              resultSchema: resultSchemaString,
            },
          };

          const validatedResult = executeToolWithLogging(
            toolExecutor,
            logger,
            toolInvocationData,
            resultSchema,
            (rawResult, schema) => validateAndFilterResult(rawResult, properties, schema)
          );

          logger.info('Property extraction completed', {
            extractedCount: Object.keys(validatedResult.extractedProperties).length,
            properties: Object.keys(validatedResult.extractedProperties),
          });

          return validatedResult;
        },
      };
    })();

  class UserInputExtractionNode extends BaseNode<TState> {
    private readonly extractionService: InputExtractionServiceProvider;

    constructor() {
      super('userInputExtraction');
      this.extractionService = service;
    }

    execute = (state: TState): Partial<TState> => {
      const userInput = getUserInput(state);
      const result = this.extractionService.extractProperties(userInput, requiredProperties);
      return result.extractedProperties as unknown as Partial<TState>;
    };
  }

  return new UserInputExtractionNode();
}
