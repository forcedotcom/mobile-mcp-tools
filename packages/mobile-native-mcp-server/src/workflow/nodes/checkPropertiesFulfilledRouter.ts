/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State, WORKFLOW_USER_INPUT_PROPERTIES } from '../metadata.js';
import { PropertyMetadataCollection } from '@salesforce/magen-mcp-workflow';

/**
 * Conditional router edge to see whether all required properties have been collected.
 */
export class CheckPropertiesFulFilledRouter {
  private readonly propertiesFulfilledNodeName: string;
  private readonly propertiesUnfulfilledNodeName: string;
  private readonly requiredProperties: PropertyMetadataCollection;

  /**
   * Creates a new CheckPropertiesFulFilledRouter.
   *
   * @param propertiesFulfilledNodeName - The name of the node to route to if all properties are fulfilled
   * @param propertiesUnfulfilledNodeName - The name of the node to route to if any property is unfulfilled
   * @param requiredProperties - Collection of properties that must be collected from user
   *                             (defaults to WORKFLOW_USER_INPUT_PROPERTIES for production use)
   */
  constructor(
    propertiesFulfilledNodeName: string,
    propertiesUnfulfilledNodeName: string,
    requiredProperties?: PropertyMetadataCollection
  ) {
    this.propertiesFulfilledNodeName = propertiesFulfilledNodeName;
    this.propertiesUnfulfilledNodeName = propertiesUnfulfilledNodeName;
    this.requiredProperties = requiredProperties ?? WORKFLOW_USER_INPUT_PROPERTIES;
  }

  execute = (state: State): string => {
    return this.getPropertyFulfillmentStatus(state);
  };

  private getPropertyFulfillmentStatus(state: State) {
    for (const propertyName of Object.keys(this.requiredProperties)) {
      if (!state[propertyName as keyof State]) {
        return this.propertiesUnfulfilledNodeName;
      }
    }
    return this.propertiesFulfilledNodeName;
  }
}
