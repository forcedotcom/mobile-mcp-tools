/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createGetUserInputNode, PropertyMetadataCollection } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';
import { SFMOBILE_NATIVE_GET_INPUT_TOOL_ID } from '../../tools/utils/sfmobile-native-get-input/metadata.js';
import z from 'zod';

/**
 * Custom node that prompts for template-specific properties
 * based on templatePropertiesMetadata in state
 */
export class TemplatePropertiesUserInputNode {
  name = 'getTemplatePropertiesInput';

  execute = (state: State): Partial<State> => {
    // If no template properties metadata exists, skip input gathering
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
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

    // Create and execute the user input node with the dynamic properties
    const userInputNode = createGetUserInputNode<State>({
      requiredProperties,
      toolId: SFMOBILE_NATIVE_GET_INPUT_TOOL_ID,
      userInputProperty: 'templatePropertiesUserInput',
    });

    // Execute the user input node
    return userInputNode.execute(state);
  };
}
