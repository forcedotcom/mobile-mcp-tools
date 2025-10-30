/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { PRD_GENERATION_TOOL } from '../../../../tools/magi/prd/magi-prd-generation/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import fs from 'fs';
import { resolveFeatureDirectory, resolveRequirementsArtifactPath, getMagiPath, MAGI_ARTIFACTS } from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

export class PRDGenerationNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('prdGeneration', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (typeof userInput.prdContent === 'string' && typeof userInput.prdFilePath === 'string') {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = PRD_GENERATION_TOOL.resultSchema.parse({
        prdContent: userInput.prdContent,
        prdFilePath: userInput.prdFilePath,
        documentStatus: userInput.documentStatus || {
          author: 'PRD Generator',
          lastModified: new Date().toISOString().split('T')[0],
          status: 'draft' as const,
        },
        requirementsCount: userInput.requirementsCount || 0,
        traceabilityTableRows: userInput.traceabilityTableRows || [],
      });

      return this.processPrdResult(validatedResult, state);
    }

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

    // Tool result not provided - need to call the tool
    const toolInvocationData: MCPToolInvocationData<typeof PRD_GENERATION_TOOL.inputSchema> = {
      llmMetadata: {
        name: PRD_GENERATION_TOOL.toolId,
        description: PRD_GENERATION_TOOL.description,
        inputSchema: PRD_GENERATION_TOOL.inputSchema,
      },
      input: {
        originalUserUtterance: state.userUtterance || '',
        featureBrief: state.featureBriefContent || this.getFeatureBriefContent(state),
        requirementsContent,
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      PRD_GENERATION_TOOL.resultSchema
    );

    return this.processPrdResult(validatedResult, state);
  };

  private processPrdResult(
    validatedResult: z.infer<typeof PRD_GENERATION_TOOL.resultSchema>,
    state: PRDState
  ): Partial<PRDState> {
    // Resolve feature directory using utility function
    const featureDirectory = resolveFeatureDirectory(state);
    if (!featureDirectory) {
      throw new Error(
        'Cannot determine feature directory: projectPath and featureId are missing'
      );
    }

    // Use the feature directory for PRD file, not the path suggested by the tool
    // The tool suggests projectPath/PRD.md, but we want it in the feature directory
    const prdFilePath = getMagiPath(state.projectPath!, state.featureId!, MAGI_ARTIFACTS.PRD);

    // Ensure the directory exists before writing the file
    if (!fs.existsSync(featureDirectory)) {
      fs.mkdirSync(featureDirectory, { recursive: true });
      this.logger?.info(`Created feature directory: ${featureDirectory}`);
    }

    // Write the PRD content to disk
    fs.writeFileSync(prdFilePath, validatedResult.prdContent);
    this.logger?.info(`PRD written to file: ${prdFilePath}`);

    // Return minimal mapped state - paths are now calculated from projectPath and featureId
    return {
      prdContent: validatedResult.prdContent,
      prdStatus: validatedResult.documentStatus,
    };
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
