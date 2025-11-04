/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PRDGenerationOrchestrator } from '../../src/tools/magi/prd/magi-prd-orchestrator/tool.js';
import { MagiFeatureBriefGenerationTool } from '../../src/tools/magi/prd/magi-prd-feature-brief/tool.js';
import { MagiInitialRequirementsTool } from '../../src/tools/magi/prd/magi-prd-initial-requirements/tool.js';
import { MagiRequirementsReviewTool } from '../../src/tools/magi/prd/magi-prd-requirements-review/tool.js';
import { MagiGapAnalysisTool } from '../../src/tools/magi/prd/magi-prd-gap-analysis/tool.js';
import { MagiPRDGenerationTool } from '../../src/tools/magi/prd/magi-prd-generation/tool.js';
import { MagiPRDReviewTool } from '../../src/tools/magi/prd/magi-prd-review/tool.js';
import { PRDOrchestratorInput } from '../../src/tools/magi/prd/magi-prd-orchestrator/metadata.js';
import { FeatureBriefWorkflowInput } from '../../src/tools/magi/prd/magi-prd-feature-brief/metadata.js';
import { InitialRequirementsInput } from '../../src/tools/magi/prd/magi-prd-initial-requirements/metadata.js';
import { RequirementsReviewInput } from '../../src/tools/magi/prd/magi-prd-requirements-review/metadata.js';
import { GapAnalysisInput } from '../../src/tools/magi/prd/magi-prd-gap-analysis/metadata.js';
import { PRDGenerationInput } from '../../src/tools/magi/prd/magi-prd-generation/metadata.js';
import { PRDReviewInput } from '../../src/tools/magi/prd/magi-prd-review/metadata.js';

describe('PRD Workflow Integration Test', () => {
  let server: McpServer;
  let prdOrchestrator: PRDGenerationOrchestrator;
  let featureBriefTool: MagiFeatureBriefGenerationTool;
  let initialRequirementsTool: MagiInitialRequirementsTool;
  let requirementsReviewTool: MagiRequirementsReviewTool;
  let gapAnalysisTool: MagiGapAnalysisTool;
  let prdGenerationTool: MagiPRDGenerationTool;
  let prdReviewTool: MagiPRDReviewTool;

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    prdOrchestrator = new PRDGenerationOrchestrator(server, undefined, true); // Use memory for testing
    featureBriefTool = new MagiFeatureBriefGenerationTool(server);
    initialRequirementsTool = new MagiInitialRequirementsTool(server);
    requirementsReviewTool = new MagiRequirementsReviewTool(server);
    gapAnalysisTool = new MagiGapAnalysisTool(server);
    prdGenerationTool = new MagiPRDGenerationTool(server);
    prdReviewTool = new MagiPRDReviewTool(server);
  });

  it('should complete the entire PRD workflow from start to finish', async () => {
    const userUtterance = 'Create a mobile app for managing customer contacts';
    const projectPath = '/tmp/test-prd-project';

    // Step 1: Start the PRD workflow
    console.log('🚀 Starting PRD workflow...');
    const initialInput: PRDOrchestratorInput = {
      userInput: {
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: '' }, // Empty thread_id for initial call
    };

    const orchestratorResponse1 = await prdOrchestrator.handleRequest(initialInput);
    console.log(
      '📋 Orchestrator Response 1:',
      orchestratorResponse1.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call magi-prd-feature-brief
    expect(orchestratorResponse1.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-feature-brief'
    );

    // Extract thread_id from the response
    const threadIdMatch =
      orchestratorResponse1.structuredContent.orchestrationInstructionsPrompt.match(
        /"thread_id":"([^"]+)"/
      );
    expect(threadIdMatch).toBeTruthy();
    const threadId = threadIdMatch![1];
    console.log('🧵 Thread ID:', threadId);

    // Step 2: Call magi-prd-feature-brief tool
    console.log('📝 Calling magi-prd-feature-brief tool...');
    const featureBriefInput: FeatureBriefWorkflowInput = {
      userUtterance: userUtterance,
      currentFeatureIds: [], // No existing features in test
      workflowStateData: { thread_id: threadId },
    };

    const featureBriefResponse = await featureBriefTool.handleRequest(featureBriefInput);
    console.log('📝 Feature Brief Response:', featureBriefResponse.structuredContent?.promptForLLM);

    // Verify the feature brief tool instructs to call the orchestrator back
    expect(featureBriefResponse.structuredContent?.promptForLLM).toContain('magi-prd-orchestrator');

    // Step 3: Call orchestrator back with feature brief result
    console.log('🔄 Calling orchestrator back with feature brief result...');
    const orchestratorInput2: PRDOrchestratorInput = {
      userInput: {
        featureBriefMarkdown:
          '# Customer Contact Management App\n\nA mobile application for managing customer contacts...',
        recommendedFeatureId: 'customer-contact-management',
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse2 = await prdOrchestrator.handleRequest(orchestratorInput2);
    console.log(
      '📋 Orchestrator Response 2:',
      orchestratorResponse2.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call the feature brief review tool (not initial requirements yet)
    expect(orchestratorResponse2.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-feature-brief-review'
    );

    // Step 4: Call orchestrator - it will route to feature brief review node
    // The workflow will execute the feature brief review node, which will call interrupt()
    // We need to call the feature brief review tool and then resume with its result
    console.log('📝 Feature Brief Review step...');
    // Determine the feature directory path (matching actual workflow structure)
    const mockPrdWorkspacePath = `${projectPath}/magi-sdd`;
    const mockFeatureDirectory = `${mockPrdWorkspacePath}/001-customer-contact-management`;
    const mockFeatureBriefPath = `${mockFeatureDirectory}/feature-brief.md`;
    // Ensure directory exists
    await fs.promises.mkdir(mockFeatureDirectory, { recursive: true });

    // Resume workflow - this will hit the feature brief review node which calls interrupt()
    // We need to provide tool results in userInput with the format the tool would return
    console.log('🔄 Resuming workflow with feature brief review result...');
    const orchestratorInput3: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the feature brief review tool returns)
        approved: true,
        userFeedback: 'Looks good, proceed with requirements',
        reviewSummary: 'Feature brief approved as-is',
        modifications: [],
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
        featureBriefPath: mockFeatureBriefPath,
        featureBriefContent:
          '# Customer Contact Management App\n\nA mobile application for managing customer contacts...',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse3 = await prdOrchestrator.handleRequest(orchestratorInput3);
    console.log(
      '📋 Orchestrator Response 3:',
      orchestratorResponse3.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call the feature brief finalization tool first
    expect(orchestratorResponse3.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-feature-brief-finalization'
    );

    // Step 5: Call feature brief finalization tool (implicitly via orchestrator resume)
    // The finalization tool updates the feature brief status to "approved"
    console.log('✅ Feature Brief Finalization step (handled by workflow)...');

    // Resume workflow with finalization result
    const orchestratorInput3Finalization: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the feature brief finalization tool returns)
        finalizedFeatureBriefContent:
          '# Customer Contact Management App\n\n## Status\n**Status**: approved\n\nA mobile application for managing customer contacts...',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
        featureBriefPath: mockFeatureBriefPath,
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse3Finalization = await prdOrchestrator.handleRequest(
      orchestratorInput3Finalization
    );
    console.log(
      '📋 Orchestrator Response 3 (after finalization):',
      orchestratorResponse3Finalization.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call the initial requirements tool
    expect(
      orchestratorResponse3Finalization.structuredContent.orchestrationInstructionsPrompt
    ).toContain('magi-prd-initial-requirements');

    // Step 6: Call magi-prd-initial-requirements tool
    console.log('⚙️ Calling magi-prd-initial-requirements tool...');
    // The feature brief file should now exist (written by review node when approved)
    // The initial requirements tool reads the file content from the path

    const initialRequirementsInput: InitialRequirementsInput = {
      featureBriefPath: mockFeatureBriefPath,
      workflowStateData: { thread_id: threadId },
    };

    const functionalRequirementsResponse =
      await initialRequirementsTool.handleRequest(initialRequirementsInput);
    console.log(
      '⚙️ Functional Requirements Response:',
      functionalRequirementsResponse.structuredContent?.promptForLLM
    );

    // Step 7: Call orchestrator back with initial requirements result
    console.log('🔄 Calling orchestrator back with initial requirements result...');
    const mockRequirementsPath = `${mockFeatureDirectory}/requirements.md`;
    const orchestratorInput4: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the initial requirements tool returns)
        requirementsMarkdown:
          '# Requirements\n\n## Status\n**Status**: draft\n\n## Pending Review Requirements\n\n### REQ-001: User Authentication\n- **Priority**: high\n- **Category**: Security\n- **Description**: Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO\n\n### REQ-002: Contact List View\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Display a scrollable list of customer contacts with search and filter capabilities\n\n### REQ-003: Add New Contact\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Allow users to create new customer contacts with required fields validation\n\n### REQ-004: Edit Contact Information\n- **Priority**: medium\n- **Category**: UI/UX\n- **Description**: Enable users to modify existing contact details with data validation\n\n### REQ-005: Delete Contact\n- **Priority**: medium\n- **Category**: UI/UX\n- **Description**: Allow users to remove contacts with confirmation dialog',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
        requirementsPath: mockRequirementsPath,
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse4 = await prdOrchestrator.handleRequest(orchestratorInput4);
    console.log(
      '📋 Orchestrator Response 4:',
      orchestratorResponse4.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call requirements review
    expect(orchestratorResponse4.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-requirements-review'
    );

    // Step 8: Call magi-prd-requirements-review tool
    console.log('📋 Calling magi-prd-requirements-review tool...');
    const requirementsReviewInput: RequirementsReviewInput = {
      requirementsPath: mockRequirementsPath,
      workflowStateData: { thread_id: threadId },
    };

    const requirementsReviewResponse =
      await requirementsReviewTool.handleRequest(requirementsReviewInput);
    console.log(
      '📋 Requirements Review Response:',
      requirementsReviewResponse.structuredContent?.promptForLLM
    );

    // Step 9: Call orchestrator back with requirements review result
    console.log('🔄 Calling orchestrator back with requirements review result...');
    const orchestratorInput5: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the requirements review tool returns)
        approvedRequirementIds: ['REQ-001', 'REQ-002', 'REQ-003'],
        rejectedRequirementIds: ['REQ-004'],
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
        requirementsPath: mockRequirementsPath,
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse5 = await prdOrchestrator.handleRequest(orchestratorInput5);
    console.log(
      '📋 Orchestrator Response 5:',
      orchestratorResponse5.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call gap analysis
    expect(orchestratorResponse5.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-gap-analysis'
    );

    // Step 10: Call magi-prd-gap-analysis tool
    console.log('🔍 Calling magi-prd-gap-analysis tool...');
    const gapAnalysisInput: GapAnalysisInput = {
      featureBriefPath: mockFeatureBriefPath,
      requirementsPath: mockRequirementsPath,
      workflowStateData: { thread_id: threadId },
    };

    const gapAnalysisResponse = await gapAnalysisTool.handleRequest(gapAnalysisInput);
    console.log('🔍 Gap Analysis Response:', gapAnalysisResponse.structuredContent?.promptForLLM);

    // Step 11: Call orchestrator back with gap analysis result
    console.log('🔄 Calling orchestrator back with gap analysis result...');
    const orchestratorInput6: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the gap analysis tool returns)
        gapAnalysisScore: 85,
        identifiedGaps: [
          {
            id: 'GAP-001',
            title: 'Missing Search Functionality',
            description:
              'The feature brief mentions search capabilities but no specific search requirements are defined',
            severity: 'high',
            category: 'UI/UX',
            impact: 'Users will not be able to efficiently find contacts in large lists',
            suggestedRequirements: [
              {
                title: 'Contact Search Implementation',
                description:
                  'Implement real-time search functionality with filters and sorting options',
                priority: 'high',
                category: 'UI/UX',
              },
            ],
          },
          {
            id: 'GAP-002',
            title: 'No Contact Categories',
            description: 'Missing requirements for organizing contacts into categories or groups',
            severity: 'medium',
            category: 'Data',
            impact: 'Users will have difficulty organizing large contact lists',
            suggestedRequirements: [
              {
                title: 'Contact Categorization',
                description: 'Allow users to create and assign categories to contacts',
                priority: 'medium',
                category: 'Data',
              },
            ],
          },
        ],
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse6 = await prdOrchestrator.handleRequest(orchestratorInput6);
    console.log(
      '📋 Orchestrator Response 6:',
      orchestratorResponse6.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call requirements finalization (since gap score >= 80)
    expect(orchestratorResponse6.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-requirements-finalization'
    );

    // Step 12: Handle requirements finalization step
    console.log('✅ Requirements Finalization step...');
    const orchestratorInput6Finalization: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the requirements finalization tool returns)
        finalizedRequirementsContent:
          '# Requirements\n\n## Status\n**Status**: approved\n\n## Approved Requirements\n\n### REQ-001: User Authentication\n- **Priority**: high\n- **Category**: Security\n- **Description**: Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO\n\n### REQ-002: Contact List View\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Display a scrollable list of customer contacts with search and filter capabilities\n\n### REQ-003: Add New Contact\n- **Priority**: high\n- **Category**: UI/UX\n- **Description**: Allow users to create new customer contacts with required fields validation',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
        requirementsPath: mockRequirementsPath,
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse6Finalization = await prdOrchestrator.handleRequest(
      orchestratorInput6Finalization
    );
    console.log(
      '📋 Orchestrator Response 6 (after finalization):',
      orchestratorResponse6Finalization.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call PRD generation
    expect(
      orchestratorResponse6Finalization.structuredContent.orchestrationInstructionsPrompt
    ).toContain('magi-prd-generation');

    // Step 12: Call magi-prd-generation tool
    console.log('📄 Calling magi-prd-generation tool...');
    const prdGenerationInput: PRDGenerationInput = {
      featureBriefPath: mockFeatureBriefPath,
      requirementsPath: mockRequirementsPath,
      workflowStateData: { thread_id: threadId },
    };

    const prdGenerationResponse = await prdGenerationTool.handleRequest(prdGenerationInput);
    console.log(
      '📄 PRD Generation Response:',
      prdGenerationResponse.structuredContent?.promptForLLM
    );

    // Step 13: Call orchestrator back with PRD generation result
    console.log('🔄 Calling orchestrator back with PRD generation result...');
    const orchestratorInput7: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the PRD generation tool returns)
        prdContent:
          '# Product Requirements Document\n\n## Customer Contact Management App\n\n### Overview\nA mobile application for managing customer contacts...',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse7 = await prdOrchestrator.handleRequest(orchestratorInput7);
    console.log(
      '📋 Orchestrator Response 7:',
      orchestratorResponse7.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call PRD review
    expect(orchestratorResponse7.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-review'
    );

    // Step 14: Call magi-prd-review tool
    console.log('✅ Calling magi-prd-review tool...');
    const mockPrdPath = `${mockFeatureDirectory}/PRD.md`;
    const prdReviewInput: PRDReviewInput = {
      prdFilePath: mockPrdPath,
      workflowStateData: { thread_id: threadId },
    };

    const prdReviewResponse = await prdReviewTool.handleRequest(prdReviewInput);
    console.log('✅ PRD Review Response:', prdReviewResponse.structuredContent?.promptForLLM);

    // Step 15: Call orchestrator back with PRD review result (final step)
    console.log('🏁 Calling orchestrator back with PRD review result (final step)...');
    const orchestratorInput8: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the PRD review tool returns)
        approved: true,
        modifications: [],
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse8 = await prdOrchestrator.handleRequest(orchestratorInput8);
    console.log(
      '🏁 Final Orchestrator Response:',
      orchestratorResponse8.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify we get instructions to call PRD finalization (since PRD is approved)
    expect(orchestratorResponse8.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-finalization'
    );

    // Step 16: Handle PRD finalization step
    console.log('✅ PRD Finalization step...');
    const orchestratorInput8Finalization: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the PRD finalization tool returns)
        finalizedPrdContent:
          '# Product Requirements Document\n\n## Document Status\n**Status**: finalized\n\n## Customer Contact Management App\n\n### Overview\nA mobile application for managing customer contacts...',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
      },
      workflowStateData: { thread_id: threadId },
    };

    const orchestratorResponse8Finalization = await prdOrchestrator.handleRequest(
      orchestratorInput8Finalization
    );
    console.log(
      '🏁 Final Orchestrator Response (after finalization):',
      orchestratorResponse8Finalization.structuredContent.orchestrationInstructionsPrompt
    );

    // Verify the workflow has concluded
    expect(
      orchestratorResponse8Finalization.structuredContent.orchestrationInstructionsPrompt
    ).toContain('workflow has concluded');
    expect(
      orchestratorResponse8Finalization.structuredContent.orchestrationInstructionsPrompt
    ).toContain('No further workflow actions');

    console.log('🎉 PRD workflow completed successfully!');
  }, 30000); // 30 second timeout for the full workflow
});
