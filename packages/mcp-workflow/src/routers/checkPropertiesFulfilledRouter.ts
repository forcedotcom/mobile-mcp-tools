/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { StateType, StateDefinition } from '@langchain/langgraph';
import { PropertyMetadataCollection } from '../common/propertyMetadata.js';
import { Logger, createComponentLogger } from '../logging/logger.js';

/**
 * Conditional router edge to check whether all required properties have been collected.
 *
 * This router evaluates the workflow state to determine if all properties specified
 * in the required properties collection have been fulfilled (are truthy). Based on
 * this evaluation, it routes to either a "fulfilled" or "unfulfilled" node.
 *
 * @template TState - The state type for the workflow
 *
 * @example
 * ```typescript
 * const requiredProperties: PropertyMetadataCollection = {
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
 * const router = new CheckPropertiesFulfilledRouter<State>(
 *   'continueWorkflow',  // Node to route to when all properties are fulfilled
 *   'getUserInput',      // Node to route to when properties are missing
 *   requiredProperties
 * );
 *
 * // Use in LangGraph workflow
 * workflow.addConditionalEdges('checkProperties', router.execute);
 * ```
 */
export class CheckPropertiesFulfilledRouter<TState extends StateType<StateDefinition>> {
  private readonly propertiesFulfilledNodeName: string;
  private readonly propertiesUnfulfilledNodeName: string;
  private readonly requiredProperties: PropertyMetadataCollection;
  private readonly logger: Logger;

  /**
   * Creates a new CheckPropertiesFulfilledRouter.
   *
   * @param propertiesFulfilledNodeName - The name of the node to route to if all properties are fulfilled
   * @param propertiesUnfulfilledNodeName - The name of the node to route to if any property is unfulfilled
   * @param requiredProperties - Collection of properties that must be collected from user
   * @param logger - Optional logger instance for debugging and monitoring routing decisions.
   *                 If not provided, a default component logger will be created.
   */
  constructor(
    propertiesFulfilledNodeName: string,
    propertiesUnfulfilledNodeName: string,
    requiredProperties: PropertyMetadataCollection,
    logger?: Logger
  ) {
    this.propertiesFulfilledNodeName = propertiesFulfilledNodeName;
    this.propertiesUnfulfilledNodeName = propertiesUnfulfilledNodeName;
    this.requiredProperties = requiredProperties;
    this.logger = logger || createComponentLogger('CheckPropertiesFulfilledRouter');
  }

  /**
   * Evaluates the state to determine the next node based on property fulfillment.
   *
   * This method checks each property in the required properties collection.
   * If any property is missing or falsy, it routes to the unfulfilled node.
   * Only if all properties are present and truthy does it route to the fulfilled node.
   *
   * @param state - The current workflow state
   * @returns The name of the next node to route to
   */
  execute = (state: TState): string => {
    return this.getPropertyFulfillmentStatus(state);
  };

  /**
   * Internal method to check property fulfillment status.
   *
   * Iterates through all required properties and checks if they exist
   * and are truthy in the state object.
   *
   * @param state - The current workflow state
   * @returns The name of the node to route to based on fulfillment status
   */
  private getPropertyFulfillmentStatus(state: TState): string {
    const unfulfilledProperties: string[] = [];

    for (const propertyName of Object.keys(this.requiredProperties)) {
      if (!state[propertyName as keyof TState]) {
        unfulfilledProperties.push(propertyName);
      }
    }

    if (unfulfilledProperties.length > 0) {
      this.logger.debug(
        `Properties not fulfilled, routing to ${this.propertiesUnfulfilledNodeName}`,
        {
          unfulfilledProperties,
          targetNode: this.propertiesUnfulfilledNodeName,
          totalRequired: Object.keys(this.requiredProperties).length,
        }
      );
      return this.propertiesUnfulfilledNodeName;
    }

    this.logger.debug(`All properties fulfilled, routing to ${this.propertiesFulfilledNodeName}`, {
      targetNode: this.propertiesFulfilledNodeName,
      totalProperties: Object.keys(this.requiredProperties).length,
    });
    return this.propertiesFulfilledNodeName;
  }
}
