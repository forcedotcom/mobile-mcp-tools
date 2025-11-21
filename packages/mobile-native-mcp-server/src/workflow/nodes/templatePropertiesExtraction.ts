/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
  createUserInputExtractionNode,
  PropertyMetadataCollection,
} from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';
import { SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID } from '../../tools/utils/sfmobile-native-input-extraction/metadata.js';
import z from 'zod';

/**
 * Factory function to create a template properties extraction node
 *
 * This node dynamically extracts template-specific properties from user input
 * based on the templatePropertiesMetadata stored in state.
 */
export function createTemplatePropertiesExtractionNode() {
  return createUserInputExtractionNode<State>({
    requiredProperties: {} as PropertyMetadataCollection, // Will be determined dynamically
    toolId: SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
    getUserInput: (state: State) => {
      return state.templatePropertiesUserInput;
    },
  });
}

/**
 * Custom node that converts template properties metadata to PropertyMetadataCollection
 * and then extracts properties from user input
 */
export class TemplatePropertiesExtractionNode {
  name = 'extractTemplateProperties';

  execute = (state: State): Partial<State> => {
    // If no template properties metadata exists, skip extraction
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      return { templateProperties: {} };
    }

    // If templatePropertiesUserInput doesn't exist yet, don't initialize templateProperties
    // This allows the router to route to templatePropertiesUserInputNode to prompt for input
    if (!state.templatePropertiesUserInput) {
      return {};
    }

    // Convert template properties metadata to PropertyMetadataCollection format
    const requiredProperties: PropertyMetadataCollection = {};

    for (const [propertyName, metadata] of Object.entries(state.templatePropertiesMetadata)) {
      requiredProperties[propertyName] = {
        zodType: z.string(),
        description: metadata.description,
        friendlyName: propertyName,
      };
    }

    // Create and execute the extraction node with the dynamic properties
    const extractionNode = createUserInputExtractionNode<State>({
      requiredProperties,
      toolId: SFMOBILE_NATIVE_INPUT_EXTRACTION_TOOL_ID,
      getUserInput: (state: State) => {
        return state.templatePropertiesUserInput;
      },
    });

    // Execute the extraction and map results to templateProperties
    const result = extractionNode.execute(state);

    // Convert extracted properties to Record<string, string> format
    const templateProperties: Record<string, string> = {};
    for (const key of Object.keys(requiredProperties)) {
      if (result[key as keyof State]) {
        templateProperties[key] = result[key as keyof State] as string;
      }
    }

    return { templateProperties };
  };
}
