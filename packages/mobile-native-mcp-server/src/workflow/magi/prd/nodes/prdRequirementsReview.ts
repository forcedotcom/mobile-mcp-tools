/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { MCPToolInvocationData } from '../../../../common/metadata.js';
import { PRDState } from '../metadata.js';
import { PRDAbstractToolNode } from './prdAbstractToolNode.js';
import { REQUIREMENTS_REVIEW_TOOL } from '../../../../tools/magi/prd/magi-prd-requirements-review/metadata.js';
import { ToolExecutor } from '../../../nodes/toolExecutor.js';
import { Logger } from '../../../../logging/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  resolveFeatureDirectory,
  readMagiArtifact,
  writeMagiArtifact,
  MAGI_ARTIFACTS,
} from '../../../../utils/wellKnownDirectory.js';
import z from 'zod';

// Local type definitions to align with PRDState
interface Requirement {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface ModifiedRequirement extends Requirement {
  originalId: string;
  modificationNotes: string;
}

interface RequirementsArtifact {
  featureId: string;
  approvedRequirements: Requirement[];
  rejectedRequirements: Requirement[];
  modifiedRequirements: ModifiedRequirement[];
  reviewHistory: {
    timestamp: string;
    summary: string;
    approvedIds: string[];
    rejectedIds: string[];
    modifiedIds: string[];
  }[];
}

export class PRDRequirementsReviewNode extends PRDAbstractToolNode {
  constructor(toolExecutor?: ToolExecutor, logger?: Logger) {
    super('requirementsReview', toolExecutor, logger);
  }

  execute = (state: PRDState): Partial<PRDState> => {
    // Check if tool result is already provided in userInput (resume scenario)
    const userInput = state.userInput || {};
    if (
      Array.isArray(userInput.approvedRequirements) &&
      typeof userInput.reviewSummary === 'string'
    ) {
      // Tool result already provided - use it directly (resume scenario)
      const validatedResult = REQUIREMENTS_REVIEW_TOOL.resultSchema.parse({
        approvedRequirements: userInput.approvedRequirements || [],
        rejectedRequirements: userInput.rejectedRequirements || [],
        modifiedRequirements: userInput.modifiedRequirements || [],
        reviewSummary: userInput.reviewSummary,
        userFeedback: userInput.userFeedback,
      });

      return this.processReviewResult(validatedResult, state);
    }

    // Tool result not provided - need to call the tool
    const toolInvocationData: MCPToolInvocationData<typeof REQUIREMENTS_REVIEW_TOOL.inputSchema> = {
      llmMetadata: {
        name: REQUIREMENTS_REVIEW_TOOL.toolId,
        description: REQUIREMENTS_REVIEW_TOOL.description,
        inputSchema: REQUIREMENTS_REVIEW_TOOL.inputSchema,
      },
      input: {
        functionalRequirements: state.functionalRequirements || [],
      },
    };

    const validatedResult = this.executeToolWithLogging(
      toolInvocationData,
      REQUIREMENTS_REVIEW_TOOL.resultSchema
    );

    return this.processReviewResult(validatedResult, state);
  };

  private processReviewResult(
    validatedResult: z.infer<typeof REQUIREMENTS_REVIEW_TOOL.resultSchema>,
    state: PRDState
  ): Partial<PRDState> {
    // Validate required state
    if (!state.projectPath || !state.featureId) {
      throw new Error('Cannot determine feature directory: projectPath and featureId are missing');
    }

    // Resolve feature directory for legacy JSON migration support
    const featureDirectory = resolveFeatureDirectory(state);
    if (!featureDirectory) {
      throw new Error('Cannot determine feature directory: projectPath and featureId are missing');
    }

    let artifact: RequirementsArtifact;
    // Try to read existing markdown, fall back to JSON for backward compatibility
    const jsonPath = path.join(featureDirectory, 'requirements.json');
    const requirementsContent = readMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS
    );

    if (requirementsContent) {
      artifact = this.parseMarkdownArtifact(requirementsContent, state.featureId);
    } else if (fs.existsSync(jsonPath)) {
      // Migrate from JSON to markdown
      artifact = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as RequirementsArtifact;
      this.logger?.info(`Migrating requirements.json to requirements.md`);
    } else {
      artifact = {
        featureId: state.featureId,
        approvedRequirements: [],
        rejectedRequirements: [],
        modifiedRequirements: [],
        reviewHistory: [],
      };
    }

    // Merge results intelligently (update existing, avoid duplicates)
    this.mergeRequirements(artifact, validatedResult);

    // Update history
    artifact.reviewHistory.push({
      timestamp: new Date().toISOString(),
      summary: validatedResult.reviewSummary || 'No summary provided for this review.',
      approvedIds: (validatedResult.approvedRequirements || []).map(r => r.id),
      rejectedIds: (validatedResult.rejectedRequirements || []).map(r => r.id),
      modifiedIds: (validatedResult.modifiedRequirements || []).map(r => r.id),
    });

    // Write markdown file
    const markdownContent = this.generateMarkdownArtifact(artifact);
    writeMagiArtifact(
      state.projectPath,
      state.featureId,
      MAGI_ARTIFACTS.REQUIREMENTS,
      markdownContent
    );

    // If JSON exists, remove it after migration
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
      this.logger?.info(`Removed legacy requirements.json after migration`);
    }

    // Return empty state update (path is calculated when needed)
    return {};
  }

  private mergeRequirements(
    artifact: RequirementsArtifact,
    validatedResult: z.infer<typeof REQUIREMENTS_REVIEW_TOOL.resultSchema>
  ): void {
    // Merge approved requirements (update existing, add new)
    const approvedMap = new Map(artifact.approvedRequirements.map(r => [r.id, r]));
    (validatedResult.approvedRequirements || []).forEach(req => {
      approvedMap.set(req.id, req);
    });
    artifact.approvedRequirements = Array.from(approvedMap.values());

    // Merge rejected requirements
    const rejectedMap = new Map(artifact.rejectedRequirements.map(r => [r.id, r]));
    (validatedResult.rejectedRequirements || []).forEach(req => {
      rejectedMap.set(req.id, req);
    });
    artifact.rejectedRequirements = Array.from(rejectedMap.values());

    // Merge modified requirements
    const modifiedMap = new Map(artifact.modifiedRequirements.map(r => [r.id, r]));
    (validatedResult.modifiedRequirements || []).forEach(req => {
      modifiedMap.set(req.id, req);
    });
    artifact.modifiedRequirements = Array.from(modifiedMap.values());
  }

  private generateMarkdownArtifact(artifact: RequirementsArtifact): string {
    const lines: string[] = ['# Requirements', '', `**Feature ID:** ${artifact.featureId}`, ''];

    // Approved Requirements
    if (artifact.approvedRequirements.length > 0) {
      lines.push('## Approved Requirements', '');
      artifact.approvedRequirements.forEach(req => {
        lines.push(`### ${req.id}: ${req.title}`);
        lines.push(`- **Priority**: ${req.priority}`);
        lines.push(`- **Category**: ${req.category}`);
        lines.push(`- **Description**: ${req.description}`);
        lines.push(`- **Status**: Approved`);
        lines.push('');
      });
    }

    // Modified Requirements
    if (artifact.modifiedRequirements.length > 0) {
      lines.push('## Modified Requirements', '');
      artifact.modifiedRequirements.forEach(req => {
        lines.push(`### ${req.id}: ${req.title}`);
        if (req.originalId) {
          lines.push(`- **Original ID**: ${req.originalId}`);
        }
        lines.push(`- **Priority**: ${req.priority}`);
        lines.push(`- **Category**: ${req.category}`);
        lines.push(`- **Description**: ${req.description}`);
        if (req.modificationNotes) {
          lines.push(`- **Modification Notes**: ${req.modificationNotes}`);
        }
        lines.push(`- **Status**: Approved (Modified)`);
        lines.push('');
      });
    }

    // Rejected Requirements
    if (artifact.rejectedRequirements.length > 0) {
      lines.push('## Rejected Requirements', '');
      artifact.rejectedRequirements.forEach(req => {
        lines.push(`### ${req.id}: ${req.title}`);
        lines.push(`- **Priority**: ${req.priority}`);
        lines.push(`- **Category**: ${req.category}`);
        lines.push(`- **Description**: ${req.description}`);
        lines.push(`- **Status**: Rejected`);
        lines.push('');
      });
    }

    // Review History
    if (artifact.reviewHistory.length > 0) {
      lines.push('## Review History', '');
      artifact.reviewHistory.forEach(entry => {
        lines.push(`### ${new Date(entry.timestamp).toLocaleString()}`);
        lines.push(`- **Summary**: ${entry.summary}`);
        if (entry.approvedIds.length > 0) {
          lines.push(`- **Approved IDs**: ${entry.approvedIds.join(', ')}`);
        }
        if (entry.rejectedIds.length > 0) {
          lines.push(`- **Rejected IDs**: ${entry.rejectedIds.join(', ')}`);
        }
        if (entry.modifiedIds.length > 0) {
          lines.push(`- **Modified IDs**: ${entry.modifiedIds.join(', ')}`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  private parseMarkdownArtifact(markdownContent: string, featureId: string): RequirementsArtifact {
    // Simple markdown parser - extract requirements from structured sections
    // This is a basic implementation; can be enhanced later
    const artifact: RequirementsArtifact = {
      featureId,
      approvedRequirements: [],
      rejectedRequirements: [],
      modifiedRequirements: [],
      reviewHistory: [],
    };

    // Split into sections
    const sections = markdownContent.split(/^## /gm);

    for (const section of sections) {
      if (section.startsWith('Approved Requirements')) {
        artifact.approvedRequirements = this.parseRequirementSection(section);
      } else if (section.startsWith('Modified Requirements')) {
        artifact.modifiedRequirements = this.parseModifiedRequirementSection(section);
      } else if (section.startsWith('Rejected Requirements')) {
        artifact.rejectedRequirements = this.parseRequirementSection(section);
      } else if (section.startsWith('Review History')) {
        artifact.reviewHistory = this.parseReviewHistorySection(section);
      }
    }

    return artifact;
  }

  private parseRequirementSection(section: string): Requirement[] {
    const requirements: Requirement[] = [];
    const requirementBlocks = section.split(/^### /gm).slice(1); // Skip header

    for (const block of requirementBlocks) {
      const lines = block.split('\n');
      const headerMatch = lines[0].match(/^([A-Z0-9-]+):\s*(.+)$/);
      if (!headerMatch) continue;

      const [, id, title] = headerMatch;
      const req: Requirement = {
        id: id.trim(),
        title: title.trim(),
        description: '',
        priority: 'medium',
        category: '',
      };

      for (const line of lines.slice(1)) {
        const priorityMatch = line.match(/- \*\*Priority\*\*:\s*(high|medium|low)/i);
        if (priorityMatch) {
          req.priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
          continue;
        }

        const categoryMatch = line.match(/- \*\*Category\*\*:\s*(.+)$/);
        if (categoryMatch) {
          req.category = categoryMatch[1].trim();
          continue;
        }

        const descMatch = line.match(/- \*\*Description\*\*:\s*(.+)$/);
        if (descMatch) {
          req.description = descMatch[1].trim();
          continue;
        }
      }

      if (req.id && req.title) {
        requirements.push(req);
      }
    }

    return requirements;
  }

  private parseModifiedRequirementSection(section: string): ModifiedRequirement[] {
    const requirements: ModifiedRequirement[] = [];
    const requirementBlocks = section.split(/^### /gm).slice(1);

    for (const block of requirementBlocks) {
      const lines = block.split('\n');
      const headerMatch = lines[0].match(/^([A-Z0-9-]+):\s*(.+)$/);
      if (!headerMatch) continue;

      const [, id, title] = headerMatch;
      const req: ModifiedRequirement = {
        id: id.trim(),
        title: title.trim(),
        description: '',
        priority: 'medium',
        category: '',
        originalId: '',
        modificationNotes: '',
      };

      for (const line of lines.slice(1)) {
        const priorityMatch = line.match(/- \*\*Priority\*\*:\s*(high|medium|low)/i);
        if (priorityMatch) {
          req.priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low';
          continue;
        }

        const categoryMatch = line.match(/- \*\*Category\*\*:\s*(.+)$/);
        if (categoryMatch) {
          req.category = categoryMatch[1].trim();
          continue;
        }

        const descMatch = line.match(/- \*\*Description\*\*:\s*(.+)$/);
        if (descMatch) {
          req.description = descMatch[1].trim();
          continue;
        }

        const originalIdMatch = line.match(/- \*\*Original ID\*\*:\s*(.+)$/);
        if (originalIdMatch) {
          req.originalId = originalIdMatch[1].trim();
          continue;
        }

        const notesMatch = line.match(/- \*\*Modification Notes\*\*:\s*(.+)$/);
        if (notesMatch) {
          req.modificationNotes = notesMatch[1].trim();
          continue;
        }
      }

      if (req.id && req.title) {
        requirements.push(req);
      }
    }

    return requirements;
  }

  private parseReviewHistorySection(section: string): RequirementsArtifact['reviewHistory'] {
    const history: RequirementsArtifact['reviewHistory'] = [];
    const historyBlocks = section.split(/^### /gm).slice(1);

    for (const block of historyBlocks) {
      const lines = block.split('\n');
      const timestamp = lines[0].trim();

      const entry: RequirementsArtifact['reviewHistory'][0] = {
        timestamp: new Date(timestamp).toISOString(),
        summary: '',
        approvedIds: [],
        rejectedIds: [],
        modifiedIds: [],
      };

      for (const line of lines.slice(1)) {
        const summaryMatch = line.match(/- \*\*Summary\*\*:\s*(.+)$/);
        if (summaryMatch) {
          entry.summary = summaryMatch[1].trim();
          continue;
        }

        const approvedMatch = line.match(/- \*\*Approved IDs\*\*:\s*(.+)$/);
        if (approvedMatch) {
          entry.approvedIds = approvedMatch[1]
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
          continue;
        }

        const rejectedMatch = line.match(/- \*\*Rejected IDs\*\*:\s*(.+)$/);
        if (rejectedMatch) {
          entry.rejectedIds = rejectedMatch[1]
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
          continue;
        }

        const modifiedMatch = line.match(/- \*\*Modified IDs\*\*:\s*(.+)$/);
        if (modifiedMatch) {
          entry.modifiedIds = modifiedMatch[1]
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
          continue;
        }
      }

      if (
        entry.summary ||
        entry.approvedIds.length > 0 ||
        entry.rejectedIds.length > 0 ||
        entry.modifiedIds.length > 0
      ) {
        history.push(entry);
      }
    }

    return history;
  }
}
