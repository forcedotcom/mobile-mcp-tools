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
import { SFMobileNativeInitialRequirementsTool } from '../../src/tools/magi/prd/magi-prd-initial-requirements/tool.js';
import { SFMobileNativeRequirementsReviewTool } from '../../src/tools/magi/prd/magi-prd-requirements-review/tool.js';
import { SFMobileNativeGapAnalysisTool } from '../../src/tools/magi/prd/magi-prd-gap-analysis/tool.js';
import { SFMobileNativePRDGenerationTool } from '../../src/tools/magi/prd/magi-prd-generation/tool.js';
import { SFMobileNativePRDReviewTool } from '../../src/tools/magi/prd/magi-prd-review/tool.js';
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
  let initialRequirementsTool: SFMobileNativeInitialRequirementsTool;
  let requirementsReviewTool: SFMobileNativeRequirementsReviewTool;
  let gapAnalysisTool: SFMobileNativeGapAnalysisTool;
  let prdGenerationTool: SFMobileNativePRDGenerationTool;
  let prdReviewTool: SFMobileNativePRDReviewTool;

  beforeEach(() => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    prdOrchestrator = new PRDGenerationOrchestrator(server, undefined, true); // Use memory for testing
    featureBriefTool = new MagiFeatureBriefGenerationTool(server);
    initialRequirementsTool = new SFMobileNativeInitialRequirementsTool(server);
    requirementsReviewTool = new SFMobileNativeRequirementsReviewTool(server);
    gapAnalysisTool = new SFMobileNativeGapAnalysisTool(server);
    prdGenerationTool = new SFMobileNativePRDGenerationTool(server);
    prdReviewTool = new SFMobileNativePRDReviewTool(server);
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

    // Verify we get instructions to call the next tool (initial requirements)
    expect(orchestratorResponse3.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-initial-requirements'
    );

    // Step 6: Call magi-prd-initial-requirements tool
    console.log('⚙️ Calling magi-prd-initial-requirements tool...');
    // The feature brief file should now exist (written by review node when approved)
    // The initial requirements tool reads the file content from the path

    const initialRequirementsInput: InitialRequirementsInput = {
      projectPath,
      featureBrief: mockFeatureBriefPath,
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
    const orchestratorInput4: PRDOrchestratorInput = {
      userInput: {
        functionalRequirements: [
          {
            id: 'REQ-001',
            title: 'User Authentication',
            description:
              'Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO',
            priority: 'high',
            category: 'Security',
          },
          {
            id: 'REQ-002',
            title: 'Contact List View',
            description:
              'Display a scrollable list of customer contacts with search and filter capabilities',
            priority: 'high',
            category: 'UI/UX',
          },
          {
            id: 'REQ-003',
            title: 'Add New Contact',
            description:
              'Allow users to create new customer contacts with required fields validation',
            priority: 'high',
            category: 'UI/UX',
          },
          {
            id: 'REQ-004',
            title: 'Edit Contact Information',
            description: 'Enable users to modify existing contact details with data validation',
            priority: 'medium',
            category: 'UI/UX',
          },
          {
            id: 'REQ-005',
            title: 'Delete Contact',
            description: 'Allow users to remove contacts with confirmation dialog',
            priority: 'medium',
            category: 'UI/UX',
          },
        ],
        summary:
          'Generated 5 functional requirements covering authentication, contact management, and user interface components for the customer contact management mobile app.',
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
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
      projectPath,
      functionalRequirements: [
        {
          id: 'REQ-001',
          title: 'User Authentication',
          description:
            'Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO',
          priority: 'high',
          category: 'Security',
        },
        {
          id: 'REQ-002',
          title: 'Contact List View',
          description:
            'Display a scrollable list of customer contacts with search and filter capabilities',
          priority: 'high',
          category: 'UI/UX',
        },
        {
          id: 'REQ-003',
          title: 'Add New Contact',
          description:
            'Allow users to create new customer contacts with required fields validation',
          priority: 'high',
          category: 'UI/UX',
        },
        {
          id: 'REQ-004',
          title: 'Edit Contact Information',
          description: 'Enable users to modify existing contact details with data validation',
          priority: 'medium',
          category: 'UI/UX',
        },
      ],
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
        approvedRequirements: [
          {
            id: 'REQ-001',
            title: 'User Authentication',
            description:
              'Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO',
            priority: 'high',
            category: 'Security',
          },
          {
            id: 'REQ-002',
            title: 'Contact List View',
            description:
              'Display a scrollable list of customer contacts with search and filter capabilities',
            priority: 'high',
            category: 'UI/UX',
          },
          {
            id: 'REQ-003',
            title: 'Add New Contact',
            description:
              'Allow users to create new customer contacts with required fields validation',
            priority: 'high',
            category: 'UI/UX',
          },
        ],
        rejectedRequirements: [
          {
            id: 'REQ-004',
            title: 'Edit Contact Information',
            description: 'Enable users to modify existing contact details with data validation',
            priority: 'medium',
            category: 'UI/UX',
          },
        ],
        modifiedRequirements: [],
        reviewSummary:
          'User approved 3 high-priority requirements for core contact management functionality. Rejected the edit contact feature as it was deemed unnecessary for the initial version.',
        userFeedback:
          'Focus on core functionality first, can add editing features in future iterations.',
        // State fields needed for workflow continuation
        userUtterance,
        projectPath,
        featureId: 'customer-contact-management',
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
      projectPath,
      featureBrief: mockFeatureBriefPath,
      functionalRequirements: [
        {
          id: 'REQ-001',
          title: 'User Authentication',
          description:
            'Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO',
          priority: 'high',
          category: 'Security',
        },
        {
          id: 'REQ-002',
          title: 'Contact List View',
          description:
            'Display a scrollable list of customer contacts with search and filter capabilities',
          priority: 'high',
          category: 'UI/UX',
        },
        {
          id: 'REQ-003',
          title: 'Add New Contact',
          description:
            'Allow users to create new customer contacts with required fields validation',
          priority: 'high',
          category: 'UI/UX',
        },
      ],
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
        requirementStrengths: [
          {
            requirementId: 'REQ-001',
            strengthScore: 9,
            strengths: [
              'Clear security requirements',
              'Proper authentication method specified',
              'Well-defined priority',
            ],
            weaknesses: ['Missing error handling details'],
          },
        ],
        recommendations: [
          'Add search functionality requirements',
          'Implement contact categorization features',
        ],
        summary:
          'Good foundation with clear core functionality. Main gaps identified in search capabilities and contact organization features.',
        userWantsToContinueDespiteGaps: false, // User wants to proceed despite gaps
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

    // Verify we get instructions to call PRD generation
    expect(orchestratorResponse6.structuredContent.orchestrationInstructionsPrompt).toContain(
      'magi-prd-generation'
    );

    // Step 12: Call magi-prd-generation tool
    console.log('📄 Calling magi-prd-generation tool...');
    const prdGenerationInput: PRDGenerationInput = {
      projectPath,
      originalUserUtterance: userUtterance,
      featureBrief: mockFeatureBriefPath,
      approvedRequirements: [
        {
          id: 'REQ-001',
          title: 'User Authentication',
          description:
            'Implement secure user login using Salesforce OAuth 2.0 with support for both username/password and SSO',
          priority: 'high',
          category: 'Security',
        },
        {
          id: 'REQ-002',
          title: 'Contact List View',
          description:
            'Display a scrollable list of customer contacts with search and filter capabilities',
          priority: 'high',
          category: 'UI/UX',
        },
        {
          id: 'REQ-003',
          title: 'Add New Contact',
          description:
            'Allow users to create new customer contacts with required fields validation',
          priority: 'high',
          category: 'UI/UX',
        },
      ],
      modifiedRequirements: [],
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
        prdFilePath: `${mockFeatureDirectory}/PRD.md`,
        documentStatus: {
          author: 'AI Assistant (Mobile MCP Tools)',
          lastModified: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          status: 'draft' as const,
        },
        requirementsCount: 3,
        traceabilityTableRows: [
          {
            requirementId: 'REQ-001',
            technicalRequirementIds: 'TBD (populated later)',
            userStoryIds: 'TBD (populated later)',
          },
          {
            requirementId: 'REQ-002',
            technicalRequirementIds: 'TBD (populated later)',
            userStoryIds: 'TBD (populated later)',
          },
          {
            requirementId: 'REQ-003',
            technicalRequirementIds: 'TBD (populated later)',
            userStoryIds: 'TBD (populated later)',
          },
        ],
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
    const prdReviewInput: PRDReviewInput = {
      projectPath,
      prdContent:
        '# Product Requirements Document\n\n## Customer Contact Management App\n\n### Overview\nA mobile application for managing customer contacts...',
      prdFilePath: `${mockFeatureDirectory}/PRD.md`,
      documentStatus: {
        author: 'AI Assistant (Mobile MCP Tools)',
        lastModified: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        status: 'draft' as const,
      },
      workflowStateData: { thread_id: threadId },
    };

    const prdReviewResponse = await prdReviewTool.handleRequest(prdReviewInput);
    console.log('✅ PRD Review Response:', prdReviewResponse.structuredContent?.promptForLLM);

    // Step 15: Call orchestrator back with PRD review result (final step)
    console.log('🏁 Calling orchestrator back with PRD review result (final step)...');
    const orchestratorInput8: PRDOrchestratorInput = {
      userInput: {
        // Tool result format (what the PRD review tool returns)
        prdApproved: true,
        prdModifications: [],
        userFeedback:
          'The PRD looks comprehensive and well-structured. Ready to proceed with development.',
        reviewSummary:
          'PRD approved without modifications. All requirements are clear and comprehensive.',
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

    // Verify the workflow has concluded
    expect(orchestratorResponse8.structuredContent.orchestrationInstructionsPrompt).toContain(
      'workflow has concluded'
    );
    expect(orchestratorResponse8.structuredContent.orchestrationInstructionsPrompt).toContain(
      'No further workflow actions'
    );

    console.log('🎉 PRD workflow completed successfully!');
  }, 30000); // 30 second timeout for the full workflow
});
