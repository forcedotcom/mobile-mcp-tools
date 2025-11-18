/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';

/**
 * Conditional router to check whether all required template properties have been collected.
 *
 * This router checks if:
 * 1. There are no template properties required (template has no custom properties)
 * 2. All required template properties have been collected from the user
 */
export class CheckTemplatePropertiesFulfilledRouter {
  private readonly propertiesFulfilledNodeName: string;
  private readonly propertiesUnfulfilledNodeName: string;

  /**
   * Creates a new CheckTemplatePropertiesFulfilledRouter.
   *
   * @param propertiesFulfilledNodeName - The name of the node to route to if all properties are fulfilled
   * @param propertiesUnfulfilledNodeName - The name of the node to route to if any property is unfulfilled
   */
  constructor(propertiesFulfilledNodeName: string, propertiesUnfulfilledNodeName: string) {
    this.propertiesFulfilledNodeName = propertiesFulfilledNodeName;
    this.propertiesUnfulfilledNodeName = propertiesUnfulfilledNodeName;
  }

  execute = (state: State): string => {
    return this.getPropertyFulfillmentStatus(state);
  };

  private getPropertyFulfillmentStatus(state: State): string {
    // If no template properties metadata exists, all properties are fulfilled (none required)
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      return this.propertiesFulfilledNodeName;
    }

    // If templateProperties haven't been initialized, properties are unfulfilled
    if (!state.templateProperties) {
      return this.propertiesUnfulfilledNodeName;
    }

    // Check each required property
    for (const [propertyName, metadata] of Object.entries(state.templatePropertiesMetadata)) {
      // If property is required and not present in templateProperties, it's unfulfilled
      if (metadata.required && !state.templateProperties[propertyName]) {
        return this.propertiesUnfulfilledNodeName;
      }
    }

    return this.propertiesFulfilledNodeName;
  }
}
