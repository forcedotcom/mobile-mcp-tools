/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Annotation } from '@langchain/langgraph';
import z from 'zod';
import { CheckPropertiesFulfilledRouter } from '../../src/routers/checkPropertiesFulfilledRouter.js';
import { PropertyMetadataCollection } from '../../src/common/propertyMetadata.js';
import { MockLogger } from '../utils/MockLogger.js';

// Test state definition
// NB: We never actually make use of the AnnotationRoot object here, other than to
// get its State type, which in turn TypeScript doesn't like (that we don't use it).
// That's why it's underscored here.
const _TestState = Annotation.Root({
  platform: Annotation<'iOS' | 'Android'>,
  projectName: Annotation<string>,
  packageName: Annotation<string>,
  organization: Annotation<string>,
  loginHost: Annotation<string>,
});

type State = typeof _TestState.State;

/**
 * Creates a test State object with sensible defaults for testing.
 *
 * @param overrides Partial state to override defaults
 * @returns A State object suitable for testing
 */
function createTestState(overrides: Partial<State> = {}): State {
  return {
    platform: undefined,
    projectName: undefined,
    packageName: undefined,
    organization: undefined,
    loginHost: undefined,
    ...overrides,
  } as State;
}

// Test property collections
const TEST_PROPERTIES: PropertyMetadataCollection = {
  platform: {
    zodType: z.enum(['iOS', 'Android']),
    description: 'Target mobile platform for the mobile app (iOS or Android)',
    friendlyName: 'mobile platform',
  },
  projectName: {
    zodType: z.string(),
    description: 'The name of the mobile project',
    friendlyName: 'project name',
  },
  packageName: {
    zodType: z.string(),
    description: 'The package identifier of the mobile app, for example com.company.appname',
    friendlyName: 'package identifier',
  },
  organization: {
    zodType: z.string(),
    description: 'The organization or company name',
    friendlyName: 'organization or company name',
  },
  loginHost: {
    zodType: z.string(),
    description: 'The Salesforce login host for the mobile app.',
    friendlyName: 'Salesforce login host',
  },
};

describe('CheckPropertiesFulfilledRouter', () => {
  // Test node names
  const FULFILLED_NODE = 'templateDiscovery';
  const UNFULFILLED_NODE = 'getUserInput';

  // Test property subsets for focused testing
  const twoPropertySubset: PropertyMetadataCollection = {
    platform: TEST_PROPERTIES.platform,
    projectName: TEST_PROPERTIES.projectName,
  };

  const threePropertySubset: PropertyMetadataCollection = {
    platform: TEST_PROPERTIES.platform,
    projectName: TEST_PROPERTIES.projectName,
    packageName: TEST_PROPERTIES.packageName,
  };

  describe('Constructor', () => {
    it('should accept fulfilled and unfulfilled node names', () => {
      const router = new CheckPropertiesFulfilledRouter<State>('nodeA', 'nodeB', twoPropertySubset);
      expect(router['propertiesFulfilledNodeName']).toBe('nodeA');
      expect(router['propertiesUnfulfilledNodeName']).toBe('nodeB');
    });

    it('should accept custom required properties', () => {
      const customProperties: PropertyMetadataCollection = {
        platform: TEST_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulfilledRouter<State>('nodeA', 'nodeB', customProperties);
      expect(router['requiredProperties']).toBe(customProperties);
    });

    it('should allow different node names for fulfilled and unfulfilled', () => {
      const router1 = new CheckPropertiesFulfilledRouter<State>(
        'fulfilled',
        'unfulfilled',
        twoPropertySubset
      );
      expect(router1['propertiesFulfilledNodeName']).toBe('fulfilled');
      expect(router1['propertiesUnfulfilledNodeName']).toBe('unfulfilled');

      const router2 = new CheckPropertiesFulfilledRouter<State>(
        'nextStep',
        'promptUser',
        twoPropertySubset
      );
      expect(router2['propertiesFulfilledNodeName']).toBe('nextStep');
      expect(router2['propertiesUnfulfilledNodeName']).toBe('promptUser');
    });
  });

  describe('execute() - Routing Logic', () => {
    it('should route to fulfilled node when all properties are fulfilled', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
        platform: TEST_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        TEST_PROPERTIES
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
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        TEST_PROPERTIES
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
        organization: TEST_PROPERTIES.organization,
        loginHost: TEST_PROPERTIES.loginHost,
        packageName: TEST_PROPERTIES.packageName,
      };

      const router = new CheckPropertiesFulfilledRouter<State>(
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
        packageName: TEST_PROPERTIES.packageName,
        projectName: TEST_PROPERTIES.projectName,
        platform: TEST_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulfilledRouter<State>(
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
        projectName: TEST_PROPERTIES.projectName,
        platform: TEST_PROPERTIES.platform,
      };

      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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

      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      const router = new CheckPropertiesFulfilledRouter<State>(
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
      // This tests the actual node names used in typical workflow graphs
      const router = new CheckPropertiesFulfilledRouter<State>(
        'selectTemplateCandidates',
        'getUserInput',
        TEST_PROPERTIES
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

  describe('Logger Integration', () => {
    let mockLogger: MockLogger;

    beforeEach(() => {
      mockLogger = new MockLogger();
      mockLogger.reset(); // Reset the global logs before each test
    });

    it('should accept optional logger in constructor', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset,
        mockLogger
      );

      expect(router['logger']).toBe(mockLogger);
    });

    it('should log when properties are fulfilled', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset,
        mockLogger
      );

      const state = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });

      const result = router.execute(state);

      expect(result).toBe(FULFILLED_NODE);
      expect(mockLogger.hasLoggedMessage('All properties fulfilled', 'debug')).toBe(true);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs).toHaveLength(1);
      expect(debugLogs[0].data).toEqual({
        targetNode: FULFILLED_NODE,
        totalProperties: 2,
      });
    });

    it('should log when properties are not fulfilled', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset,
        mockLogger
      );

      const state = createTestState({
        platform: 'iOS',
        // projectName is missing
      });

      const result = router.execute(state);

      expect(result).toBe(UNFULFILLED_NODE);
      expect(mockLogger.hasLoggedMessage('Properties not fulfilled', 'debug')).toBe(true);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs).toHaveLength(1);
      expect(debugLogs[0].data).toEqual({
        unfulfilledProperties: ['projectName'],
        targetNode: UNFULFILLED_NODE,
        totalRequired: 2,
      });
    });

    it('should log all unfulfilled properties', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        threePropertySubset,
        mockLogger
      );

      const state = createTestState({
        platform: 'iOS',
        // projectName and packageName are missing
      });

      router.execute(state);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(
        (debugLogs[0].data as { unfulfilledProperties: string[] })?.unfulfilledProperties
      ).toEqual(['projectName', 'packageName']);
    });

    it('should create default logger when none provided', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset
        // No logger provided - should create default
      );

      // Logger should exist (not undefined)
      expect(router['logger']).toBeDefined();

      const state = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
      });

      // Should work correctly
      expect(() => router.execute(state)).not.toThrow();
      expect(router.execute(state)).toBe(FULFILLED_NODE);
    });

    it('should log correct context for multiple missing properties', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        TEST_PROPERTIES,
        mockLogger
      );

      const state = createTestState({
        platform: 'iOS',
        projectName: 'MyApp',
        // packageName, organization, loginHost are missing
      });

      router.execute(state);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      expect(debugLogs[0].data).toEqual({
        unfulfilledProperties: ['packageName', 'organization', 'loginHost'],
        targetNode: UNFULFILLED_NODE,
        totalRequired: 5,
      });
    });

    it('should create default logger when explicitly passed undefined', () => {
      const router = new CheckPropertiesFulfilledRouter<State>(
        FULFILLED_NODE,
        UNFULFILLED_NODE,
        twoPropertySubset,
        undefined // Explicitly passing undefined should create default logger
      );

      // Logger should exist (not undefined)
      expect(router['logger']).toBeDefined();

      const state = createTestState({
        platform: 'iOS',
      });

      // Should execute without errors
      expect(() => router.execute(state)).not.toThrow();
      expect(router.execute(state)).toBe(UNFULFILLED_NODE);
    });
  });
});
