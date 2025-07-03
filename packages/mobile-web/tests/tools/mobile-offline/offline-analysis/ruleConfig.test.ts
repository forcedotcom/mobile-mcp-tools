/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  ruleConfigs,
  type RuleConfig,
} from '../../../../src/tools/mobile-offline/offline-analysis/ruleConfig.js';
import { CodeAnalysisBaseIssueType } from '../../../../src/schemas/analysisSchema.js';

describe('RuleConfig', () => {
  describe('ruleConfigs array', () => {
    it('should contain rule configurations', () => {
      expect(ruleConfigs).toBeDefined();
      expect(Array.isArray(ruleConfigs)).toBe(true);
      expect(ruleConfigs.length).toBeGreaterThan(0);
    });

    it('should have valid rule configurations', () => {
      ruleConfigs.forEach((ruleConfig: RuleConfig) => {
        expect(ruleConfig).toHaveProperty('id');
        expect(ruleConfig).toHaveProperty('config');
        expect(typeof ruleConfig.id).toBe('string');
        expect(ruleConfig.id.length).toBeGreaterThan(0);
      });
    });

    it('should have unique rule IDs', () => {
      const ruleIds = ruleConfigs.map(rule => rule.id);
      const uniqueIds = new Set(ruleIds);
      expect(uniqueIds.size).toBe(ruleIds.length);
    });
  });

  describe('individual rule configurations', () => {
    it('should have valid config structure for each rule', () => {
      ruleConfigs.forEach((ruleConfig: RuleConfig) => {
        const config = ruleConfig.config as CodeAnalysisBaseIssueType;

        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('intentAnalysis');
        expect(config).toHaveProperty('suggestedAction');

        expect(typeof config.type).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.intentAnalysis).toBe('string');
        expect(typeof config.suggestedAction).toBe('string');

        expect(config.type.length).toBeGreaterThan(0);
        expect(config.description.length).toBeGreaterThan(0);
        expect(config.intentAnalysis.length).toBeGreaterThan(0);
        expect(config.suggestedAction.length).toBeGreaterThan(0);
      });
    });

    it('should contain specific expected rules', () => {
      const ruleIds = ruleConfigs.map(rule => rule.id);

      expect(ruleIds).toContain('@salesforce/lwc-graph-analyzer/no-private-wire-config-property');
      expect(ruleIds).toContain(
        '@salesforce/lwc-graph-analyzer/no-wire-config-references-non-local-property-reactive-value'
      );
    });

    it('should have meaningful descriptions for each rule', () => {
      ruleConfigs.forEach((ruleConfig: RuleConfig) => {
        const config = ruleConfig.config as CodeAnalysisBaseIssueType;

        // Check for either 'wire' or 'Wire' in descriptions
        expect(config.description.includes('wire') || config.description.includes('Wire')).toBe(
          true
        );
        expect(config.description.length).toBeGreaterThan(20);
      });
    });

    it('should have actionable suggested actions', () => {
      ruleConfigs.forEach((ruleConfig: RuleConfig) => {
        const config = ruleConfig.config as CodeAnalysisBaseIssueType;

        // Check for either @api or @wire in suggested actions
        expect(
          config.suggestedAction.includes('@api') || config.suggestedAction.includes('@wire')
        ).toBe(true);
        expect(config.suggestedAction.length).toBeGreaterThan(50);
      });
    });
  });

  describe('RuleConfig interface', () => {
    it('should match the expected interface structure', () => {
      const testRuleConfig: RuleConfig = {
        id: 'test-rule-id',
        config: {
          type: 'Test Rule Type',
          description: 'Test rule description',
          intentAnalysis: 'Test intent analysis',
          suggestedAction: 'Test suggested action',
        },
      };

      expect(testRuleConfig).toHaveProperty('id');
      expect(testRuleConfig).toHaveProperty('config');
      expect(typeof testRuleConfig.id).toBe('string');
      expect(typeof testRuleConfig.config).toBe('object');
    });
  });
});
