/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { CheckPropertiesFulFilledRouter } from '../../../src/workflow/nodes/checkPropertiesFulfilledRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { WORKFLOW_USER_INPUT_PROPERTIES } from '../../../src/workflow/metadata.js';
import { PropertyMetadataCollection } from '../../../src/common/propertyMetadata.js';

describe('CheckPropertiesFulFilledRouter', () => {
  // Test node names
  const FULFILLED_NODE = 'templateDiscovery';
  const UNFULFILLED_NODE = 'getUserInput';

  // Test property subsets for focused testing
  const twoPropertySubset: PropertyMetadataCollection = {
    platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
    projectName: WORKFLOW_USER_INPUT_PROPERTIES.projectName,
  };

  const threePropertySubset: PropertyMetadataCollection = {
    platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
    projectName: WORKFLOW_USER_INPUT_PROPERTIES.projectName,
    packageName: WORKFLOW_USER_INPUT_PROPERTIES.packageName,
  };

  describe('Constructor', () => {
    it('should accept fulfilled and unfulfilled node names', () => {
      const router = new CheckPropertiesFulFilledRouter('nodeA', 'nodeB');
      expect(router['propertiesFulfilledNodeName']).toBe('nodeA');
      expect(router['propertiesUnfulfilledNodeName']).toBe('nodeB');
    });

    it('should accept custom required properties', () => {
      const customProperties: PropertyMetadataCollection = {
        platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulFilledRouter('nodeA', 'nodeB', customProperties);
      expect(router['requiredProperties']).toBe(customProperties);
    });

    it('should default to WORKFLOW_USER_INPUT_PROPERTIES when no properties provided', () => {
      const router = new CheckPropertiesFulFilledRouter('nodeA', 'nodeB');
      expect(router['requiredProperties']).toBe(WORKFLOW_USER_INPUT_PROPERTIES);
    });

    it('should allow different node names for fulfilled and unfulfilled', () => {
      const router1 = new CheckPropertiesFulFilledRouter('fulfilled', 'unfulfilled');
      expect(router1['propertiesFulfilledNodeName']).toBe('fulfilled');
      expect(router1['propertiesUnfulfilledNodeName']).toBe('unfulfilled');

      const router2 = new CheckPropertiesFulFilledRouter('nextStep', 'promptUser');
      expect(router2['propertiesFulfilledNodeName']).toBe('nextStep');
      expect(router2['propertiesUnfulfilledNodeName']).toBe('promptUser');
    });
  });

  describe('execute() - Routing Logic', () => {
    it('should route to fulfilled node when all properties are fulfilled', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should route to unfulfilled node when any property is missing', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        // projectName is missing
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should route to unfulfilled node when all properties are missing', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        // Both properties missing
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should route to unfulfilled node when first property is missing', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        projectName: 'MyApp',
        // platform is missing (first in the collection)
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should route to unfulfilled node when last property is missing', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      const inputState = createTestState({
        platform: 'Android',
        projectName: 'MyApp',
        // packageName is missing (last in the collection)
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should route to unfulfilled node when middle property is missing', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        // projectName is missing (middle in the collection)
        packageName: 'com.test.app',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should handle three properties all fulfilled', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      const inputState = createTestState({
        platform: 'Android',
        projectName: 'TestApp',
        packageName: 'com.test.testapp',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });
  });

  describe('execute() - Property Value Checking', () => {
    it('should treat null as unfulfilled', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: null as unknown as 'iOS' | 'Android',
        projectName: 'MyApp',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should treat undefined as unfulfilled', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: undefined,
        projectName: 'MyApp',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should treat empty string as unfulfilled (falsy check)', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: '', // Empty string
      });

      const nextNode = router.execute(inputState);

      // Empty string is falsy, so should route to unfulfilled node
      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should accept any truthy value for properties', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'AnyValidName',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });
  });

  describe('execute() - Custom Node Names', () => {
    it('should return custom fulfilled node name', () => {
      const customFulfilledNode = 'customNextStep';
      const router = new CheckPropertiesFulFilledRouter(
        customFulfilledNode,
        'someOtherNode',
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(customFulfilledNode);
    });

    it('should return custom unfulfilled node name', () => {
      const customUnfulfilledNode = 'promptForMissingData';
      const router = new CheckPropertiesFulFilledRouter(
        'someNode',
        customUnfulfilledNode,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        // projectName missing
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(customUnfulfilledNode);
    });

    it('should work with workflow-like node names', () => {
      const router = new CheckPropertiesFulFilledRouter(
        'validateEnvironment',
        'getUserInput',
        twoPropertySubset
      );

      const fulfilledState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });
      expect(router.execute(fulfilledState)).toBe('validateEnvironment');

      const unfulfilledState = createTestState({
        platform: 'iOS',
      });
      expect(router.execute(unfulfilledState)).toBe('getUserInput');
    });
  });

  describe('execute() - Custom Property Collections', () => {
    it('should work with single property collection', () => {
      const singleProperty: PropertyMetadataCollection = {
        platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        singleProperty
      );

      // Property fulfilled
      const state1 = createTestState({ platform: 'iOS' });
      expect(router.execute(state1)).toBe(FULFILLED_NODE);

      // Property missing
      const state2 = createTestState({});
      expect(router.execute(state2)).toBe(UNFULFILLED_NODE);
    });

    it('should work with all workflow user input properties', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        WORKFLOW_USER_INPUT_PROPERTIES
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.test.myapp',
        organization: 'TestOrg',
        loginHost: 'https://login.salesforce.com',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should detect missing property among many', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        WORKFLOW_USER_INPUT_PROPERTIES
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.test.myapp',
        organization: 'TestOrg',
        // loginHost is missing
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should work with different property combinations', () => {
      const customProperties: PropertyMetadataCollection = {
        organization: WORKFLOW_USER_INPUT_PROPERTIES.organization,
        loginHost: WORKFLOW_USER_INPUT_PROPERTIES.loginHost,
        packageName: WORKFLOW_USER_INPUT_PROPERTIES.packageName,
      };

      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        customProperties
      );

      const inputState = createTestState({
        organization: 'MyOrg',
        loginHost: 'https://test.salesforce.com',
        packageName: 'com.test.app',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });
  });

  describe('execute() - Order Independence', () => {
    it('should not depend on order of property definition', () => {
      // Create properties in reverse order
      const reversedProperties: PropertyMetadataCollection = {
        packageName: WORKFLOW_USER_INPUT_PROPERTIES.packageName,
        projectName: WORKFLOW_USER_INPUT_PROPERTIES.projectName,
        platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        reversedProperties
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.test',
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should check all properties regardless of order', () => {
      const reversedProperties: PropertyMetadataCollection = {
        projectName: WORKFLOW_USER_INPUT_PROPERTIES.projectName,
        platform: WORKFLOW_USER_INPUT_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        reversedProperties
      );

      // Missing first property in reversed order
      const state1 = createTestState({
        platform: 'iOS',
      });
      expect(router.execute(state1)).toBe(UNFULFILLED_NODE);

      // Missing second property in reversed order
      const state2 = createTestState({
        projectName: 'MyApp',
      });
      expect(router.execute(state2)).toBe(UNFULFILLED_NODE);
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle state with extra properties not in required collection', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.extra.property', // Extra property not in subset
        organization: 'ExtraOrg',
      });

      const nextNode = router.execute(inputState);

      // Should still route to fulfilled node since required properties are fulfilled
      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should only check properties in required collection', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        // packageName is not in twoPropertySubset, so it doesn't matter if it's missing
      });

      const nextNode = router.execute(inputState);

      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should handle empty property collection gracefully', () => {
      const emptyProperties: PropertyMetadataCollection = {};

      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        emptyProperties
      );

      const inputState = createTestState({});

      const nextNode = router.execute(inputState);

      // With no required properties, should always route to fulfilled node
      expect(nextNode).toBe(FULFILLED_NODE);
    });
  });

  describe('execute() - State Preservation', () => {
    it('should not modify input state', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const originalPlatform = 'iOS';
      const originalProjectName = 'MyApp';

      const inputState = createTestState({
        platform: originalPlatform,
        projectName: originalProjectName,
      });

      router.execute(inputState);

      // State should remain unchanged
      expect(inputState.platform).toBe(originalPlatform);
      expect(inputState.projectName).toBe(originalProjectName);
    });
  });

  describe('execute() - Return Type', () => {
    it('should return valid node name string', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const state1 = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });
      const result1 = router.execute(state1);
      expect(typeof result1).toBe('string');
      expect([FULFILLED_NODE, UNFULFILLED_NODE]).toContain(result1);

      const state2 = createTestState({
        platform: 'iOS',
      });
      const result2 = router.execute(state2);
      expect(typeof result2).toBe('string');
      expect([FULFILLED_NODE, UNFULFILLED_NODE]).toContain(result2);
    });

    it('should only return one of two possible node names', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
      );

      const state = createTestState({
        platform: 'iOS',
      });

      const result = router.execute(state);

      expect(result === FULFILLED_NODE || result === UNFULFILLED_NODE).toBe(true);
    });
  });

  describe('execute() - Real World Scenarios', () => {
    it('should handle progressive property collection', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      // Step 1: No properties
      const state1 = createTestState({});
      expect(router.execute(state1)).toBe(UNFULFILLED_NODE);

      // Step 2: One property collected
      const state2 = createTestState({
        platform: 'iOS',
      });
      expect(router.execute(state2)).toBe(UNFULFILLED_NODE);

      // Step 3: Two properties collected
      const state3 = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });
      expect(router.execute(state3)).toBe(UNFULFILLED_NODE);

      // Step 4: All properties collected
      const state4 = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.test.myapp',
      });
      expect(router.execute(state4)).toBe(FULFILLED_NODE);
    });

    it('should handle complete initial extraction scenario', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      // User provided all information upfront
      const inputState = createTestState({
        platform: 'Android',
        projectName: 'FieldService',
        packageName: 'com.salesforce.fieldservice',
      });

      const nextNode = router.execute(inputState);

      // Should skip question generation and go straight to next step
      expect(nextNode).toBe(FULFILLED_NODE);
    });

    it('should handle partial extraction scenario', () => {
      const router = new CheckPropertiesFulFilledRouter(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset
      );

      // User provided some information
      const inputState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        // packageName missing - need to prompt
      });

      const nextNode = router.execute(inputState);

      // Should route to user input gathering for missing property
      expect(nextNode).toBe(UNFULFILLED_NODE);
    });

    it('should match production graph configuration', () => {
      // This tests the actual node names used in graph.ts
      // Note: In the actual graph, this router routes to platformCheckNode, not templateCandidateSelection
      // This test uses templateCandidateSelection as a placeholder to verify routing behavior
      const router = new CheckPropertiesFulFilledRouter(
        'selectTemplateCandidates',
        'getUserInput',
        WORKFLOW_USER_INPUT_PROPERTIES
      );

      // All properties fulfilled - should route to selectTemplateCandidates (or platformCheckNode in actual graph)
      const fulfilledState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        packageName: 'com.test.myapp',
        organization: 'TestOrg',
        loginHost: 'https://login.salesforce.com',
      });
      expect(router.execute(fulfilledState)).toBe('selectTemplateCandidates');

      // Some properties missing - should route to getUserInput
      const unfulfilledState = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });
      expect(router.execute(unfulfilledState)).toBe('getUserInput');
    });
  });
});
