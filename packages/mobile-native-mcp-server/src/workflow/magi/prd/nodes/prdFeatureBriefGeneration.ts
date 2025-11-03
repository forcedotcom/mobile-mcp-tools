/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { FEATURE_BRIEF_TOOL } from '../../../../tools/magi/prd/magi-prd-feature-brief/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import {
  createFeatureDirectory,
  getExistingFeatureIds,
  getPrdWorkspacePath,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';

export class PRDFeatureBriefGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('featureBriefGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Get existing feature IDs to pass to the tool (for uniqueness checking)
    const prdWorkspacePath = getPrdWorkspacePath(state.projectPath);
    const currentFeatureIds = getExistingFeatureIds(prdWorkspacePath);

    // Build tool input for initial generation
    const toolInput = {
      userUtterance: state.userUtterance || '',
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

    // Write the feature brief file immediately with draft status
    // The tool should have already included the status section in the markdown
    const featureBriefFilePath = writeMagiArtifact(
      state.projectPath,
      validatedResult.recommendedFeatureId,
      MAGI_ARTIFACTS.FEATURE_BRIEF,
      validatedResult.featureBriefMarkdown
    );
    this.logger?.info(`Feature brief written to file: ${featureBriefFilePath} (status: draft)`);

    // Return featureId only - content is now always read from file
    return {
      featureId: validatedResult.recommendedFeatureId,
    };
  };
}
