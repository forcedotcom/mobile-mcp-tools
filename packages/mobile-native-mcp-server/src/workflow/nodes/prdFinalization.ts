/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode } from './abstractBaseNode.js';
import { Logger } from '../../logging/logger.js';

export class PRDFinalizationNode extends BaseNode {
  constructor(logger?: Logger) {
    super('prdFinalization');
  }

  execute = (state: State): Partial<State> => {
    // Update the PRD status to finalized
    const currentDate = new Date().toISOString().split('T')[0];

    const updatedDocumentStatus = {
      author: state.prdDocumentStatus?.author || 'AI Assistant (Mobile MCP Tools)',
      lastModified: currentDate,
      status: 'finalized' as const,
    };

    // Update the PRD content with the finalized status
    const updatedPrdContent = this.updatePRDStatus(state.prdContent || '', updatedDocumentStatus);

    return {
      prdDocumentStatus: updatedDocumentStatus,
      prdContent: updatedPrdContent,
      prdFinalized: true,
      workflowComplete: true, // This is a terminal node
    };
  };

  private updatePRDStatus(
    prdContent: string,
    documentStatus: { author: string; lastModified: string; status: string }
  ): string {
    // Update the Document Status section in the PRD content
    const statusSectionRegex = /## Document Status[\s\S]*?(?=##|$)/;
    const newStatusSection = `## Document Status

- **Author**: ${documentStatus.author}
- **Last Modified**: ${documentStatus.lastModified}
- **Status**: ${documentStatus.status}

`;

    if (statusSectionRegex.test(prdContent)) {
      return prdContent.replace(statusSectionRegex, newStatusSection);
    } else {
      // If no Document Status section exists, add it at the beginning
      return `# Product Requirements Document

${newStatusSection}

${prdContent.replace(/^# Product Requirements Document\s*\n/, '')}`;
    }
  }
}
