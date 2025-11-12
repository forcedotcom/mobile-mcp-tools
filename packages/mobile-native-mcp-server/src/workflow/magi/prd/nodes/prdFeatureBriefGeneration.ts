/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '@salesforce/magen-mcp-workflow';
import { PRDState } from '../metadata.js';
import { AbstractToolNode } from '@salesforce/magen-mcp-workflow';
import { FEATURE_BRIEF_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief/metadata.js';
import { ToolExecutor } from '@salesforce/magen-mcp-workflow';
import { Logger } from '@salesforce/magen-mcp-workflow';
import {
  createFeatureDirectory,
  getExistingFeatureIds,
  getPrdWorkspacePath,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/magiDirectory.js';

export class PRDFeatureBriefGenerationNode extends AbstractToolNode<PRDState> {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    const prdWorkspacePath = getPrdWorkspacePath(state.projectPath);
    const currentFeatureIds = getExistingFeatureIds(prdWorkspacePath);

    const toolInput = {
      userUtterance: state.userUtterance,
      currentFeatureIds: currentFeatureIds,
    };

    const toolInvocationData: MCPToolInvocationData<typeof FEATURE_BRIEF_TOOL.inputSchema> = {
      llmMetadata: {
        name: FEATURE_BRIEF_TOOL.toolId,
        description: FEATURE_BRIEF_TOOL.description,
        inputSchema: FEATURE_BRIEF_TOOL.inputSchema,
      },
      input: toolInput,
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      FEATURE_BRIEF_TOOL.resultSchema
    );

    // Create new feature directory
    const featureDirectoryPath = createFeatureDirectory(
      prdWorkspacePath,
      validatedResult.recommendedFeatureId,
      true
    );
    this.logger?.info(`Created feature directory at: ${featureDirectoryPath}`);

    // Write the feature brief file
    const featureBriefFilePath = writeMagiArtifact(
      state.projectPath,
      validatedResult.recommendedFeatureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(`Feature brief written to file: ${featureBriefFilePath} (status: draft)`);

    return {
      featureId: validatedResult.recommendedFeatureId,
    };
  };
}
