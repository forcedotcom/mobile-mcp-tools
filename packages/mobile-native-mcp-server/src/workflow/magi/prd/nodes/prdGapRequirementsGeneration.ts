/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { GAP_REQUIREMENTS_TOOL } from '../../../../tools/magi/prd/magi-prd-gap-requirements/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import fs from 'fs';
import { resolveFeatureDirectory, resolveRequirementsArtifactPath, getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';

/**
 * Workflow node for generating functional requirements based on identified gaps.
 */
export class PRDGapRequirementsGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('gapRequirementsGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Resolve feature directory and then requirements artifact path
    const featureDirectory = resolveFeatureDirectory(state);
    if (!featureDirectory) {
      throw new Error(
        'Cannot determine feature directory: projectPath and featureId are missing'
      );
    }

    const requirementsArtifactPath = resolveRequirementsArtifactPath(featureDirectory);

    // Read requirements content from markdown file
    const requirementsContent = fs.existsSync(requirementsArtifactPath)
      ? fs.readFileSync(requirementsArtifactPath, 'utf8')
      : '';

    const toolInvocationData: MCPToolInvocationData<typeof GAP_REQUIREMENTS_TOOL.inputSchema> = {
      llmMetadata: {
        name: GAP_REQUIREMENTS_TOOL.toolId,
        description: GAP_REQUIREMENTS_TOOL.description,
        inputSchema: GAP_REQUIREMENTS_TOOL.inputSchema,
      },
      input: {
        featureBrief: state.featureBriefContent || this.getFeatureBriefContent(state),
        requirementsContent,
        identifiedGaps: state.identifiedGaps || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      GAP_REQUIREMENTS_TOOL.resultSchema
    );
    return validatedResult;
  }

  private getFeatureBriefContent(state: PRDState): string {
    if (state.featureBriefContent) {
      return state.featureBriefContent;
    }
    
    if (state.projectPath && state.featureId) {
      try {
        const featureBriefPath = getMagiPath(state.projectPath, state.featureId, MAGI_ARTIFACTS.FEATURE_BRIEF);
        if (fs.existsSync(featureBriefPath)) {
          return fs.readFileSync(featureBriefPath, 'utf8');
        }
      } catch (error) {
        // Feature brief may not exist yet
      }
    }
    
    return '';
  }
}
