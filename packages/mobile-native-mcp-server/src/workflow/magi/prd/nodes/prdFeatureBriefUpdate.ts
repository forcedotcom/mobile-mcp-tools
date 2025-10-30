/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FEATURE_BRIEF_UPDATE_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief-update/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import fs from 'fs';
import {
  resolveFeatureDirectoryFromIds,
  getPrdWorkspacePath,
  getMagiPath,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';

export class PRDFeatureBriefUpdateNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefUpdate', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Validate required state
    if (!state.projectPath) {
      throw new Error('projectPath is required but not provided in PRD state');
    }
    if (!state.featureId) {
      throw new Error('featureId is required for feature brief update (iteration scenario)');
    }
    
    // Get feature brief content - prefer state, fallback to reading from file if needed
    const featureBriefContent = state.featureBriefContent || this.getFeatureBriefContent(state);
    if (!featureBriefContent) {
      throw new Error(
        'Feature brief content is required for feature brief update (iteration scenario). ' +
          'Content not found in state or on disk.'
      );
    }

    // Resolve the feature directory from projectPath and featureId
    const prdWorkspacePath = getPrdWorkspacePath(state.projectPath);
    const existingFeatureDirectory = resolveFeatureDirectoryFromIds(state.projectPath, state.featureId);

    // Validate that the directory exists - it should have been created by Generation Node
    // Note: The file may not exist yet (first iteration), but the directory should exist
    if (!existingFeatureDirectory || !fs.existsSync(existingFeatureDirectory)) {
      throw new Error(
        `Update error: Feature directory not found for featureId ${state.featureId}. ` +
          `Directory should have been created by Generation Node. State may be corrupted.`
      );
    }

    this.logger?.info(
      `Updating feature brief: Reusing existing feature directory: ${existingFeatureDirectory}`
    );

    // Build tool input with update context
    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_UPDATE_TOOL.inputSchema> =
      {
        llmMetadata: {
          name: FEATURE_BRIEF_UPDATE_TOOL.toolId,
          description: FEATURE_BRIEF_UPDATE_TOOL.description,
          inputSchema: FEATURE_BRIEF_UPDATE_TOOL.inputSchema,
        },
        input: {
          existingFeatureId: state.featureId,
          featureBrief: featureBriefContent, // Pass content, not path
          userUtterance: state.userUtterance || '',
          userFeedback: state.featureBriefUserFeedback,
          modifications: state.featureBriefModifications,
        },
      };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_UPDATE_TOOL.resultSchema
    );

    // DON'T write file yet - store updated content in state
    // File will be written by Review Node when approved
    this.logger?.info(
      `Updated feature brief content in state (file will be written after approval)`
    );

    // Return updated state - featureId remains the same
    // Update the content in state, but don't write file yet
    // Clear review state since we've processed the update
    return {
      // Keep the same featureId
      featureId: state.featureId,
      // Update content in state
      featureBriefContent: validatedResult.featureBriefMarkdown,
      // Clear review state when generating new version
      isFeatureBriefApproved: undefined,
      featureBriefUserFeedback: undefined,
      featureBriefModifications: undefined,
    };
  };

  private getFeatureBriefContent(state: PRDState): string {
    if (state.featureBriefContent) {
      return state.featureBriefContent;
    }

    if (state.projectPath && state.featureId) {
      try {
        const featureBriefPath = getMagiPath(
          state.projectPath,
          state.featureId,
          MAGI_ARTIFACTS.FEATURE_BRIEF
        );
        if (fs.existsSync(featureBriefPath)) {
          return fs.readFileSync(featureBriefPath, 'utf8');
        }
      } catch (error) {
        this.logger?.warn(
          `Could not read feature brief: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return '';
  }
}
