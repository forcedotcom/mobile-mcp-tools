/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ToolExecutor } from '../nodes/toolExecutor.js';
import { AbstractService } from './abstractService.js';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import {
  createInputExtractionMetadata,
  INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA,
} from '../tools/utilities/index.js';
import { Logger } from '../logging/logger.js';
import { NodeGuidanceData } from '../common/metadata.js';

/**
 * Result from property extraction containing validated properties.
 */
export interface ExtractionResult {
  /** Record of extracted properties, keyed by property name */
  extractedProperties: Record<string, unknown>;
}

/**
 * Provider interface for property extraction service.
 * This interface allows for dependency injection and testing.
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
 * Service for extracting structured properties from user input.
 *
 * This service uses direct guidance mode (NodeGuidanceData) to have the orchestrator
 * generate property extraction prompts directly, eliminating the need for an
 * intermediate tool call.
 */
export class InputExtractionService
  extends AbstractService
  implements InputExtractionServiceProvider
{
  /**
   * Creates a new InputExtractionService.
   *
   * @param toolId - Tool ID for the input extraction tool
   * @param toolExecutor - Tool executor for invoking the extraction tool (injectable for testing)
   * @param logger - Logger instance (injectable for testing)
   */
  constructor(
    private readonly toolId: string,
    toolExecutor?: ToolExecutor,
    logger?: Logger
  ) {
    super('InputExtractionService', toolExecutor, logger);
  }

  extractProperties(userInput: unknown, properties: PropertyMetadataCollection): ExtractionResult {
    this.logger.debug('Starting property extraction', {
      userInput,
      propertyCount: Object.keys(properties).length,
    });

    const propertiesToExtract = this.preparePropertiesForExtraction(properties);
    const resultSchema = this.preparePropertyResultsSchema(properties);
    const resultSchemaString = JSON.stringify(zodToJsonSchema(resultSchema));
    const metadata = createInputExtractionMetadata(this.toolId);
    const input = {
      userUtterance: userInput,
      propertiesToExtract,
      resultSchema: resultSchemaString,
    };

    // Build a concrete example based on the actual properties being requested
    const exampleProperties = propertiesToExtract.reduce(
      (acc, prop) => {
        acc[prop.propertyName] = `<extracted ${prop.propertyName} value or null>`;
        return acc;
      },
      {} as Record<string, string>
    );

    // Create NodeGuidanceData for direct guidance mode
    const nodeGuidanceData: NodeGuidanceData<typeof INPUT_EXTRACTION_WORKFLOW_INPUT_SCHEMA> = {
      nodeId: metadata.toolId,
      inputSchema: metadata.inputSchema,
      input,
      taskGuidance: this.generateTaskGuidance(userInput, propertiesToExtract),
      resultSchema: resultSchema,
      // Provide example to help LLM understand the expected extractedProperties wrapper
      exampleOutput: JSON.stringify({ extractedProperties: exampleProperties }),
    };

    const validatedResult = this.executeToolWithLogging(
      nodeGuidanceData,
      resultSchema,
      (rawResult, schema) => this.validateAndFilterResult(rawResult, properties, schema)
    );

    this.logger.info('Property extraction completed', {
      extractedCount: Object.keys(validatedResult.extractedProperties).length,
      properties: Object.keys(validatedResult.extractedProperties),
    });

    return validatedResult;
  }

  private preparePropertiesForExtraction(
    properties: PropertyMetadataCollection
  ): Array<{ propertyName: string; description: string }> {
    const propertiesToExtract: Array<{ propertyName: string; description: string }> = [];

    for (const [propertyName, metadata] of Object.entries(properties)) {
      propertiesToExtract.push({
        propertyName,
        description: metadata.description,
      });
    }

    this.logger.debug('Prepared properties for extraction', {
      count: propertiesToExtract.length,
      properties: propertiesToExtract.map(p => p.propertyName),
    });

    return propertiesToExtract;
  }

  private preparePropertyResultsSchema(
    properties: PropertyMetadataCollection
  ): z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }> {
    const extractedPropertiesShape: Record<string, z.ZodType> = {};

    for (const [propertyName, metadata] of Object.entries(properties)) {
      extractedPropertiesShape[propertyName] = metadata.zodType
        .describe(metadata.description)
        .nullable()
        .catch((ctx: { input: unknown }) => ctx.input);
    }

    return z.object({ extractedProperties: z.object(extractedPropertiesShape).passthrough() });
  }

  private validateAndFilterResult(
    rawResult: unknown,
    properties: PropertyMetadataCollection,
    resultSchema: z.ZodObject<{ extractedProperties: z.ZodObject<z.ZodRawShape> }>
  ): ExtractionResult {
    const structureValidated = resultSchema.parse(rawResult);
    const { extractedProperties } = structureValidated;

    this.logger.debug('Validating extracted properties', {
      extractedProperties,
    });

    const validatedProperties: Record<string, unknown> = {};
    const invalidProperties: string[] = [];

    for (const [propertyName, propertyValue] of Object.entries(extractedProperties)) {
      if (propertyValue == null) {
        this.logger.debug(`Skipping property with null/undefined value`, { propertyName });
        continue;
      }

      const propertyMetadata = properties[propertyName];
      if (!propertyMetadata) {
        this.logger.warn(`Unknown property in extraction result`, { propertyName });
        continue;
      }

      try {
        const validatedValue = propertyMetadata.zodType.parse(propertyValue);
        validatedProperties[propertyName] = validatedValue;
        this.logger.debug(`Property validated successfully`, {
          propertyName,
          value: validatedValue,
        });
      } catch (error) {
        invalidProperties.push(propertyName);
        if (error instanceof z.ZodError) {
          this.logger.debug(`Property validation failed`, {
            propertyName,
            value: propertyValue,
            errors: error.errors,
          });
        } else {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Unexpected validation error for ${propertyName}: ${errorMsg}`);
          throw error;
        }
      }
    }

    if (invalidProperties.length > 0) {
      this.logger.info(`Some properties failed validation`, {
        invalidProperties,
        validCount: Object.keys(validatedProperties).length,
      });
    }

    return { extractedProperties: validatedProperties };
  }

  /**
   * Generates the task guidance for input extraction.
   *
   * @param userUtterance - The raw user input to analyze
   * @param propertiesToExtract - Array of properties to extract
   * @returns The guidance prompt string
   */
  private generateTaskGuidance(
    userUtterance: unknown,
    propertiesToExtract: Array<{ propertyName: string; description: string }>
  ): string {
    return `
# ROLE
You are a **conservative** data extraction tool. Your primary directive is to ONLY extract 
values that are EXPLICITLY and LITERALLY stated in the user's input. You never guess, 
assume, infer, or fill in missing information.

# CRITICAL CONSTRAINT

**When in doubt, output \`null\`.** It is ALWAYS better to return \`null\` for a property 
than to guess or infer a value. Guessing causes downstream errors. Missing values can be 
collected later. There is NO penalty for returning \`null\`, but there IS a penalty for 
inventing values.

---
# TASK

Analyze the user utterance below and extract ONLY values that are EXPLICITLY stated.
For each property, output either:
- The EXACT value found in the text, OR
- \`null\` if the value is not explicitly present

---
# CONTEXT

## USER UTTERANCE TO ANALYZE
${JSON.stringify(userUtterance)}

## PROPERTIES TO EXTRACT
\`\`\`json
${JSON.stringify(propertiesToExtract)}
\`\`\`

---
# INSTRUCTIONS

1. Read the "USER UTTERANCE TO ANALYZE" carefully.
2. For each property in "PROPERTIES TO EXTRACT":
   - Search for an EXPLICIT, LITERAL value in the user's text
   - If found verbatim or with trivial transformation, extract it
   - If NOT found, you MUST output \`null\`
3. Ensure output keys exactly match the \`propertyName\` values from the input list.

---
# EXAMPLES OF CORRECT BEHAVIOR

**Example 1 - Partial Information:**
User says: "I want to build an iOS app"
Properties: platform, projectName
Correct output: { "platform": "iOS", "projectName": null }
WRONG output: { "platform": "iOS", "projectName": "MyApp" }  // "MyApp" was NEVER mentioned!

**Example 2 - No Relevant Information:**
User says: "Hello, I need help"
Properties: platform, projectName
Correct output: { "platform": null, "projectName": null }
WRONG output: { "platform": "iOS", "projectName": "App" }  // Both are fabricated!

**Example 3 - Complete Information:**
User says: "Create an Android app called WeatherTracker"
Properties: platform, projectName
Correct output: { "platform": "Android", "projectName": "WeatherTracker" }

---
# FINAL REMINDER

**DO NOT GUESS. DO NOT INFER. DO NOT ASSUME.**
If a value is not EXPLICITLY stated in the user utterance, output \`null\`.
When uncertain, \`null\` is ALWAYS the correct answer.
`;
  }
}
