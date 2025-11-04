#!/usr/bin/env node

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SFMobileNativeTemplateDiscoveryTool } from './tools/plan/sfmobile-native-template-discovery/tool.js';
import { SFMobileNativeGetInputTool } from './tools/plan/sfmobile-native-get-input/tool.js';
import { SFMobileNativeInputExtractionTool } from './tools/plan/sfmobile-native-input-extraction/tool.js';
import { UtilsXcodeAddFilesTool } from './tools/utils/utils-xcode-add-files/tool.js';
import { SFMobileNativeDeploymentTool } from './tools/run/sfmobile-native-deployment/tool.js';
import { SFMobileNativeBuildTool } from './tools/plan/sfmobile-native-build/tool.js';
import { SFMobileNativeBuildRecoveryTool } from './tools/plan/sfmobile-native-build-recovery/tool.js';
import { SFMobileNativeProjectGenerationTool } from './tools/plan/sfmobile-native-project-generation/tool.js';
import { MobileNativeOrchestrator } from './tools/workflow/sfmobile-native-project-manager/tool.js';
import { SFMobileNativeCompletionTool } from './tools/workflow/sfmobile-native-completion/tool.js';
import { SFMobileNativeFailureTool } from './tools/workflow/sfmobile-native-failure/tool.js';
import { PRDGenerationOrchestrator } from './tools/magi/prd/magi-prd-orchestrator/tool.js';
import { MagiFeatureBriefGenerationTool } from './tools/magi/prd/magi-prd-feature-brief/tool.js';
import { MagiFeatureBriefUpdateTool } from './tools/magi/prd/magi-prd-feature-brief-update/tool.js';
import { MagiFeatureBriefReviewTool } from './tools/magi/prd/magi-prd-feature-brief-review/tool.js';
import { MagiInitialRequirementsTool } from './tools/magi/prd/magi-prd-initial-requirements/tool.js';
import { MagiGapRequirementsTool } from './tools/magi/prd/magi-prd-gap-requirements/tool.js';
import { MagiRequirementsReviewTool } from './tools/magi/prd/magi-prd-requirements-review/tool.js';
import { MagiRequirementsUpdateTool } from './tools/magi/prd/magi-prd-requirements-update/tool.js';
import { MagiGapAnalysisTool } from './tools/magi/prd/magi-prd-gap-analysis/tool.js';
import { MagiPRDGenerationTool } from './tools/magi/prd/magi-prd-generation/tool.js';
import { MagiPRDReviewTool } from './tools/magi/prd/magi-prd-review/tool.js';
import { MagiPRDUpdateTool } from './tools/magi/prd/magi-prd-update/tool.js';
import { MagiPRDFinalizationTool } from './tools/magi/prd/magi-prd-finalization/tool.js';
import { PRDFailureTool } from './tools/magi/prd/magi-prd-failure/tool.js';

import packageJson from '../package.json' with { type: 'json' };
const version = packageJson.version;
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { MobileAppProjectPrompt } from './prompts/index.js';
import { MagiFeatureBriefFinalizationTool } from './tools/magi/prd/magi-prd-feature-brief-finalization/tool.js';

const server = new McpServer({
  name: 'sfdc-mobile-native-mcp-server',
  version,
});

// Define annotations for different tool types
const readOnlyAnnotations: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const orchestratorAnnotations: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

// Initialize tools
const orchestrator = new MobileNativeOrchestrator(server);
const prdOrchestrator = new PRDGenerationOrchestrator(server);
const getInputTool = new SFMobileNativeGetInputTool(server);
const inputExtractionTool = new SFMobileNativeInputExtractionTool(server);
const templateDiscoveryTool = new SFMobileNativeTemplateDiscoveryTool(server);
const projectGenerationTool = new SFMobileNativeProjectGenerationTool(server);
const buildTool = new SFMobileNativeBuildTool(server);
const buildRecoveryTool = new SFMobileNativeBuildRecoveryTool(server);
const deploymentTool = new SFMobileNativeDeploymentTool(server);
const xcodeAddFilesTool = new UtilsXcodeAddFilesTool(server);
const completionTool = new SFMobileNativeCompletionTool(server);
const failureTool = new SFMobileNativeFailureTool(server);
const featureBriefTool = new MagiFeatureBriefGenerationTool(server);
const featureBriefUpdateTool = new MagiFeatureBriefUpdateTool(server);
const featureBriefReviewTool = new MagiFeatureBriefReviewTool(server);
const featureBriefFinalizationTool = new MagiFeatureBriefFinalizationTool(server);
const initialRequirementsTool = new MagiInitialRequirementsTool(server);
const gapRequirementsTool = new MagiGapRequirementsTool(server);
const requirementsReviewTool = new MagiRequirementsReviewTool(server);
const requirementsUpdateTool = new MagiRequirementsUpdateTool(server);
const gapAnalysisTool = new MagiGapAnalysisTool(server);
const prdGenerationTool = new MagiPRDGenerationTool(server);
const prdReviewTool = new MagiPRDReviewTool(server);
const prdUpdateTool = new MagiPRDUpdateTool(server);
const prdFinalizationTool = new MagiPRDFinalizationTool(server);
const prdFailureTool = new PRDFailureTool(server);

// Initialize prompts
const mobileAppProjectPrompt = new MobileAppProjectPrompt(server);

// Register orchestrator with specific annotations
orchestrator.register(orchestratorAnnotations);
prdOrchestrator.register(orchestratorAnnotations);

// Register all other tools with read-only annotations
getInputTool.register(readOnlyAnnotations);
inputExtractionTool.register(readOnlyAnnotations);
templateDiscoveryTool.register(readOnlyAnnotations);
projectGenerationTool.register(readOnlyAnnotations);
buildTool.register(readOnlyAnnotations);
buildRecoveryTool.register(readOnlyAnnotations);
deploymentTool.register(readOnlyAnnotations);
xcodeAddFilesTool.register(readOnlyAnnotations);
completionTool.register(readOnlyAnnotations);
failureTool.register(readOnlyAnnotations);
featureBriefTool.register(readOnlyAnnotations);
featureBriefUpdateTool.register(readOnlyAnnotations);
featureBriefReviewTool.register(readOnlyAnnotations);
featureBriefFinalizationTool.register(readOnlyAnnotations);
initialRequirementsTool.register(readOnlyAnnotations);
gapRequirementsTool.register(readOnlyAnnotations);
requirementsReviewTool.register(readOnlyAnnotations);
requirementsUpdateTool.register(readOnlyAnnotations);
gapAnalysisTool.register(readOnlyAnnotations);
prdGenerationTool.register(readOnlyAnnotations);
prdReviewTool.register(readOnlyAnnotations);
prdUpdateTool.register(readOnlyAnnotations);
prdFinalizationTool.register(readOnlyAnnotations);
prdFailureTool.register(readOnlyAnnotations);

// Register prompts
mobileAppProjectPrompt.register();

export default server;

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Salesforce Mobile Native MCP Server running on stdio, from '${process.cwd()}'`);
}

main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
