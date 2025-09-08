/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileOfflineGuidanceMcpTool } from '../../src/provider-tools/mobile-offline-guidance-mcp-tool.js';
import { TelemetryService, ReleaseState, Toolset } from '@salesforce/mcp-provider-api';
import {
  ExpertsReviewInstructionsType,
  ExpertReviewInstructionsType,
} from '../../src/schemas/analysisSchema.js';

describe('MobileOfflineGuidanceMcpTool', () => {
  let mockTelemetryService: TelemetryService;
  let tool: MobileOfflineGuidanceMcpTool;

  beforeEach(() => {
    mockTelemetryService = {
      sendEvent: vi.fn(),
    } as unknown as TelemetryService;

    tool = new MobileOfflineGuidanceMcpTool(mockTelemetryService);
  });

  it('should have correct name', () => {
    expect(tool.getName()).toBe('sf-mobile-web-offline-guidance');
  });

  it('should return NON_GA release state', () => {
    expect(tool.getReleaseState()).toBe(ReleaseState.NON_GA);
  });

  it('should belong to OTHER toolset', () => {
    expect(tool.getToolsets()).toEqual([Toolset.OTHER]);
  });

  it('should have correct configuration', () => {
    const config = tool.getConfig();

    expect(config.title).toBe('Salesforce Mobile Offline LWC Expert Instruction Delivery');
    expect(config.description).toContain('Provides structured review instructions');
    expect(config.annotations.readOnlyHint).toBe(true);
    expect(config.annotations.destructiveHint).toBe(false);
    expect(config.annotations.idempotentHint).toBe(true);
    expect(config.annotations.openWorldHint).toBe(false);
  });

  it('should execute guidance successfully', async () => {
    const testInput = {}; // No input required

    const result = await tool.exec(testInput);

    expect(mockTelemetryService.sendEvent).toHaveBeenCalledWith('mobileWebOfflineGuidance', {
      toolId: 'sfmobile-web-offline-guidance',
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.structuredContent).toBeDefined();

    // Verify the structure contains review instructions
    const structuredContent = result.structuredContent as ExpertsReviewInstructionsType;
    expect(structuredContent.reviewInstructions).toBeDefined();
    expect(Array.isArray(structuredContent.reviewInstructions)).toBe(true);
    expect(structuredContent.orchestrationInstructions).toBeDefined();
  });

  it('should provide guidance for conditional rendering expert', async () => {
    const result = await tool.exec({});
    const structuredContent = result.structuredContent as ExpertsReviewInstructionsType;

    const conditionalRenderingExpert = structuredContent.reviewInstructions.find(
      (expert: ExpertReviewInstructionsType) =>
        expert.expertReviewerName === 'Conditional Rendering Compatibility Expert'
    );

    expect(conditionalRenderingExpert).toBeDefined();
    expect(conditionalRenderingExpert.supportedFileTypes).toContain('HTML');
    expect(conditionalRenderingExpert.grounding).toContain('Komaci offline static analysis engine');
  });

  it('should provide guidance for GraphQL wire expert', async () => {
    const result = await tool.exec({});
    const structuredContent = result.structuredContent as ExpertsReviewInstructionsType;

    const graphqlExpert = structuredContent.reviewInstructions.find(
      (expert: ExpertReviewInstructionsType) =>
        expert.expertReviewerName === 'GraphQL Wire Configuration Expert'
    );

    expect(graphqlExpert).toBeDefined();
    expect(graphqlExpert.supportedFileTypes).toContain('JS');
    expect(graphqlExpert.grounding).toContain('GraphQL queries');
  });
});
