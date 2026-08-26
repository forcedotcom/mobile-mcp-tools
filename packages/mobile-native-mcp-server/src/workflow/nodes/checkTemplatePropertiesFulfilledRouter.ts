/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { createComponentLogger } from '@salesforce/magen-mcp-workflow';
import { State } from '../metadata.js';

/**
 * Conditional router to check whether all required template properties have been collected.
 *
 * This router checks:
 * 1. For MSDK apps (no template properties defined): routes to connected app fetch if credentials not yet retrieved
 * 2. For templates with properties: checks if all required properties have been collected from the user
 * 3. When all requirements are fulfilled: routes to project generation
 */
export class CheckTemplatePropertiesFulfilledRouter {
  private readonly propertiesFulfilledNodeName: string;
  private readonly propertiesUnfulfilledNodeName: string;
  private readonly msdkConnectedAppNodeName: string;
  private readonly logger = createComponentLogger('CheckTemplatePropertiesFulfilledRouter');

  /**
   * Creates a new CheckTemplatePropertiesFulfilledRouter.
   *
   * @param propertiesFulfilledNodeName - The name of the node to route to if all properties are fulfilled (project generation)
   * @param propertiesUnfulfilledNodeName - The name of the node to route to if any property is unfulfilled (template properties user input)
   * @param msdkConnectedAppNodeName - The name of the node to route to for MSDK apps needing connected app fetch
   */
  constructor(
    propertiesFulfilledNodeName: string,
    propertiesUnfulfilledNodeName: string,
    msdkConnectedAppNodeName: string
  ) {
    this.propertiesFulfilledNodeName = propertiesFulfilledNodeName;
    this.propertiesUnfulfilledNodeName = propertiesUnfulfilledNodeName;
    this.msdkConnectedAppNodeName = msdkConnectedAppNodeName;
  }

  execute = (state: State): string => {
    return this.getPropertyFulfillmentStatus(state);
  };

  private getPropertyFulfillmentStatus(state: State): string {
    // If no template has been selected yet, we shouldn't be checking template properties
    // This is a safety check to prevent routing to project generation before template selection
    if (!state.selectedTemplate) {
      this.logger.info(`No template selected, routing to ${this.propertiesUnfulfilledNodeName}`);
      return this.propertiesUnfulfilledNodeName;
    }

    // If no template properties metadata exists, this is an MSDK app that needs connected app credentials
    if (
      !state.templatePropertiesMetadata ||
      Object.keys(state.templatePropertiesMetadata).length === 0
    ) {
      // Check if we already have connected app credentials
      if (state.connectedAppClientId && state.connectedAppCallbackUri) {
        this.logger.info(
          `MSDK app with connected app credentials already set, routing to ${this.propertiesFulfilledNodeName}`
        );
        return this.propertiesFulfilledNodeName;
      }

      // MSDK app needs to fetch connected app credentials
      this.logger.info(
        `MSDK app detected (no template properties), routing to ${this.msdkConnectedAppNodeName} for connected app fetch`
      );
      return this.msdkConnectedAppNodeName;
    }

    // If templateProperties haven't been initialized, properties are unfulfilled
    if (!state.templateProperties) {
      this.logger.info(
        `Template properties not initialized, routing to ${this.propertiesUnfulfilledNodeName}`
      );
      return this.propertiesUnfulfilledNodeName;
    }

    // Check each required property
    for (const [propertyName, metadata] of Object.entries(state.templatePropertiesMetadata)) {
      // If property is required and not present in templateProperties, it's unfulfilled
      if (metadata.required && !state.templateProperties[propertyName]) {
        this.logger.info(
          `Property ${propertyName} is required but not present in state.templateProperties["${propertyName}"], routing to ${this.propertiesUnfulfilledNodeName}`
        );
        return this.propertiesUnfulfilledNodeName;
      }
    }

    this.logger.info(
      `All template properties fulfilled, routing to ${this.propertiesFulfilledNodeName}`
    );
    return this.propertiesFulfilledNodeName;
  }
}
