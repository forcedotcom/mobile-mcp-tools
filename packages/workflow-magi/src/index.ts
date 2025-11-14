/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { PRDGenerationOrchestrator } from './tools/prd/magi-prd-orchestrator/tool.js';
import { MagiFeatureBriefGenerationTool } from './tools/prd/magi-prd-feature-brief/tool.js';
import { MagiFeatureBriefUpdateTool } from './tools/prd/magi-prd-feature-brief-update/tool.js';
import { MagiFeatureBriefReviewTool } from './tools/prd/magi-prd-feature-brief-review/tool.js';
import { MagiFeatureBriefFinalizationTool } from './tools/prd/magi-prd-feature-brief-finalization/tool.js';
import { MagiInitialRequirementsTool } from './tools/prd/magi-prd-initial-requirements/tool.js';
import { MagiGapRequirementsTool } from './tools/prd/magi-prd-gap-requirements/tool.js';
import { MagiRequirementsReviewTool } from './tools/prd/magi-prd-requirements-review/tool.js';
import { MagiRequirementsUpdateTool } from './tools/prd/magi-prd-requirements-update/tool.js';
import { MagiRequirementsFinalizationTool } from './tools/prd/magi-prd-requirements-finalization/tool.js';
import { MagiGapAnalysisTool } from './tools/prd/magi-prd-gap-analysis/tool.js';
import { MagiPRDGenerationTool } from './tools/prd/magi-prd-generation/tool.js';
import { MagiPRDReviewTool } from './tools/prd/magi-prd-review/tool.js';
import { MagiPRDUpdateTool } from './tools/prd/magi-prd-update/tool.js';
import { MagiPRDFinalizationTool } from './tools/prd/magi-prd-finalization/tool.js';
import { PRDFailureTool } from './tools/prd/magi-prd-failure/tool.js';

/**
 * Default read-only annotations for Magi PRD workflow tools
 */
const defaultReadOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * Registers all Magi PRD workflow tools with the MCP server.
 *
 * @param server The MCP server instance to register tools with
 */
export function registerMagiMcpTools(server: McpServer) {
  // Instantiate all tools
  const featureBriefTool = new MagiFeatureBriefGenerationTool(server);
  const featureBriefUpdateTool = new MagiFeatureBriefUpdateTool(server);
  const featureBriefReviewTool = new MagiFeatureBriefReviewTool(server);
  const featureBriefFinalizationTool = new MagiFeatureBriefFinalizationTool(server);
  const initialRequirementsTool = new MagiInitialRequirementsTool(server);
  const gapRequirementsTool = new MagiGapRequirementsTool(server);
  const requirementsReviewTool = new MagiRequirementsReviewTool(server);
  const requirementsUpdateTool = new MagiRequirementsUpdateTool(server);
  const requirementsFinalizationTool = new MagiRequirementsFinalizationTool(server);
  const gapAnalysisTool = new MagiGapAnalysisTool(server);
  const prdGenerationTool = new MagiPRDGenerationTool(server);
  const prdReviewTool = new MagiPRDReviewTool(server);
  const prdUpdateTool = new MagiPRDUpdateTool(server);
  const prdFinalizationTool = new MagiPRDFinalizationTool(server);
  const prdFailureTool = new PRDFailureTool(server);
  const orchestrator = new PRDGenerationOrchestrator(server);

  // Register all tools with the provided annotations
  featureBriefTool.register(defaultReadOnlyAnnotations);
  featureBriefUpdateTool.register(defaultReadOnlyAnnotations);
  featureBriefReviewTool.register(defaultReadOnlyAnnotations);
  featureBriefFinalizationTool.register(defaultReadOnlyAnnotations);
  initialRequirementsTool.register(defaultReadOnlyAnnotations);
  gapRequirementsTool.register(defaultReadOnlyAnnotations);
  requirementsReviewTool.register(defaultReadOnlyAnnotations);
  requirementsUpdateTool.register(defaultReadOnlyAnnotations);
  requirementsFinalizationTool.register(defaultReadOnlyAnnotations);
  gapAnalysisTool.register(defaultReadOnlyAnnotations);
  prdGenerationTool.register(defaultReadOnlyAnnotations);
  prdReviewTool.register(defaultReadOnlyAnnotations);
  prdUpdateTool.register(defaultReadOnlyAnnotations);
  prdFinalizationTool.register(defaultReadOnlyAnnotations);
  prdFailureTool.register(defaultReadOnlyAnnotations);

  // Note: Orchestrator is registered separately with orchestrator annotations
  orchestrator.register({
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  });
}
