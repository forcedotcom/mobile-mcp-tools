/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { LwcRefactorCorrectnessEvaluatorAgent } from '../../src/agent/lwcRefactorCorrectnessEvaluatorAgent.js';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server/schemas/lwcSchema';
import { CodeAnalysisIssuesType } from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';
import { CorrectnessScore } from '../../src/schema/schema.js';
import * as responseUtils from '../../src/utils/responseUtils.js';
import { LWCFileType } from '../../src/utils/lwcUtils.js';
import { mockConfig } from '../testUtils.js';

describe('LwcRefactorCorrectnessEvaluatorAgent', () => {
  let evaluatorAgent: LwcRefactorCorrectnessEvaluatorAgent;
  let mockLlmClient: LlmClient;

  const mockOriginalCode: LwcCodeType = {
    name: 'testComponent',
    namespace: 'c',
    html: [
      {
        path: 'testComponent.html',
        content: '<template><div>Hello World</div></template>',
      },
    ],
    js: [
      {
        path: 'testComponent.js',
        content:
          'export default class TestComponent {\n  connectedCallback() {\n    // No error handling\n  }\n}',
      },
    ],
    css: [
      {
        path: 'testComponent.css',
        content: '.container { color: red; }',
      },
    ],
    jsMetaXml: {
      path: 'testComponent.js-meta.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
    },
  };

  const mockRefactoredCode: LwcCodeType = {
    name: 'testComponent',
    namespace: 'c',
    html: [
      {
        path: 'testComponent.html',
        content: '<template><div aria-label="Hello World">Hello World</div></template>',
      },
    ],
    js: [
      {
        path: 'testComponent.js',
        content:
          'export default class TestComponent {\n  connectedCallback() {\n    try {\n      // implementation\n    } catch (error) {\n      console.error(error);\n    }\n  }\n}',
      },
    ],
    css: [
      {
        path: 'testComponent.css',
        content: '.container { color: red; }',
      },
    ],
    jsMetaXml: {
      path: 'testComponent.js-meta.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
    },
  };

  const mockIssues: CodeAnalysisIssuesType = [
    {
      type: 'error-handling',
      description: 'Missing error handling in connectedCallback',
      intentAnalysis:
        'Developer likely intended to handle errors but forgot to add try-catch blocks',
      suggestedAction: 'Add try-catch blocks around the connectedCallback implementation',
      code: 'connectedCallback() {\n  // No error handling\n}',
      location: {
        startLine: 2,
        startColumn: 1,
      },
    },
    {
      type: 'accessibility',
      description: 'Improve accessibility by adding aria-label',
      intentAnalysis:
        'Developer likely intended to make the component accessible but forgot aria attributes',
      suggestedAction: 'Add aria-label attributes to improve screen reader accessibility',
      code: '<div>Hello World</div>',
      location: {
        startLine: 1,
        startColumn: 1,
      },
    },
  ];

  const mockCorrectnessScore: CorrectnessScore = {
    verdict: 'Pass GA Criteria',
    rawScore: 95,
    scoreCategory: 'Excellent',
    failedIssues: [],
    incorrectOrUnauthorizedChanges: [],
  };

  beforeEach(() => {
    mockLlmClient = new LlmClient(mockConfig);
    evaluatorAgent = new LwcRefactorCorrectnessEvaluatorAgent(mockLlmClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('scoreRefactorChanges', () => {
    it('should successfully evaluate refactored code and return correctness score', async () => {
      const mockLlmResponse = `
        Here is my evaluation:
        
        \`\`\`json
        {
          "verdict": "Pass GA Criteria",
          "rawScore": 95,
          "scoreCategory": "Excellent",
          "failedIssues": [],
          "incorrectOrUnauthorizedChanges": []
        }
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(responseUtils, 'getJsonResponse').mockReturnValue(
        JSON.stringify(mockCorrectnessScore)
      );

      const result = await evaluatorAgent.scoreRefactorChanges(
        mockOriginalCode,
        mockIssues,
        mockRefactoredCode
      );

      expect(mockLlmClient.callLLM).toHaveBeenCalledTimes(1);
      expect(responseUtils.getJsonResponse).toHaveBeenCalledWith(mockLlmResponse);
      expect(result).toEqual(mockCorrectnessScore);
    });

    it('should handle LLM response with failed issues', async () => {
      const mockLlmResponse = `
        Evaluation result:
        
        \`\`\`json
        {
          "verdict": "FAIL",
          "rawScore": 30,
          "scoreCategory": "Poor",
          "failedIssues": ["issue-1"],
          "incorrectOrUnauthorizedChanges": ["Added unnecessary logging"]
        }
        \`\`\`
      `;

      const expectedScore: CorrectnessScore = {
        verdict: 'FAIL',
        rawScore: 30,
        scoreCategory: 'Poor',
        failedIssues: ['issue-1'],
        incorrectOrUnauthorizedChanges: ['Added unnecessary logging'],
      };

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(responseUtils, 'getJsonResponse').mockReturnValue(JSON.stringify(expectedScore));

      const result = await evaluatorAgent.scoreRefactorChanges(
        mockOriginalCode,
        mockIssues,
        mockRefactoredCode
      );

      expect(result).toEqual(expectedScore);
    });

    it('should handle LLM response without code blocks', async () => {
      const mockLlmResponse = JSON.stringify(mockCorrectnessScore);

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(responseUtils, 'getJsonResponse').mockReturnValue(mockLlmResponse);

      const result = await evaluatorAgent.scoreRefactorChanges(
        mockOriginalCode,
        mockIssues,
        mockRefactoredCode
      );

      expect(result).toEqual(mockCorrectnessScore);
    });

    it('should throw error when LLM response is invalid JSON', async () => {
      const mockLlmResponse = 'Invalid JSON response';

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(responseUtils, 'getJsonResponse').mockReturnValue('Invalid JSON');

      await expect(
        evaluatorAgent.scoreRefactorChanges(mockOriginalCode, mockIssues, mockRefactoredCode)
      ).rejects.toThrow();
    });

    it('should throw error when LLM response is missing required fields', async () => {
      const mockLlmResponse = `
        \`\`\`json
        {
          "verdict": "Pass GA Criteria",
          "rawScore": 95
        }
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(responseUtils, 'getJsonResponse').mockReturnValue(
        '{"verdict": "Pass GA Criteria", "rawScore": 95}'
      );

      await expect(
        evaluatorAgent.scoreRefactorChanges(mockOriginalCode, mockIssues, mockRefactoredCode)
      ).rejects.toThrow();
    });
  });

  describe('createLlmPrompt', () => {
    it('should create a prompt with all file diffs when changes are made', () => {
      const prompt = evaluatorAgent.createLlmPrompt(
        mockOriginalCode,
        mockIssues,
        mockRefactoredCode
      );

      expect(prompt).toContain('# LWC Code Change Evaluation');
      expect(prompt).toContain('## Evaluation Guidelines');
      expect(prompt).toContain('## Critical Evaluation Points');
      expect(prompt).toContain('## Scoring Guidelines');
      expect(prompt).toContain('## The following issues were identified');
      expect(prompt).toContain(
        "## Diff between the original code and the developer's modified code"
      );
      expect(prompt).toContain('### HTML');
      expect(prompt).toContain('### JS');
      expect(prompt).toContain('### CSS');
      expect(prompt).toContain('## Task');
      expect(prompt).toContain('## Response Schema');

      // Check that the issues are included
      expect(prompt).toContain('"type": "error-handling"');
      expect(prompt).toContain('"type": "accessibility"');

      // Check that diffs are generated
      expect(prompt).toContain('```diff');
    });

    it('should handle components without CSS files', () => {
      const codeWithoutCss: LwcCodeType = {
        ...mockOriginalCode,
        css: [],
      };

      const refactoredCodeWithoutCss: LwcCodeType = {
        ...mockRefactoredCode,
        css: [],
      };

      const prompt = evaluatorAgent.createLlmPrompt(
        codeWithoutCss,
        mockIssues,
        refactoredCodeWithoutCss
      );

      expect(prompt).toContain('### CSS');
      expect(prompt).toContain('No changes were made to the "css" code.');
    });

    it('should handle components with no changes', () => {
      const prompt = evaluatorAgent.createLlmPrompt(mockOriginalCode, mockIssues, mockOriginalCode);

      expect(prompt).toContain('No changes were made to the "html" code.');
      expect(prompt).toContain('No changes were made to the "js" code.');
      expect(prompt).toContain('No changes were made to the "css" code.');
    });

    it('should include JSON schema in the prompt', () => {
      const prompt = evaluatorAgent.createLlmPrompt(
        mockOriginalCode,
        mockIssues,
        mockRefactoredCode
      );

      expect(prompt).toContain('"type": "object"');
      expect(prompt).toContain('"properties"');
      expect(prompt).toContain('"verdict"');
      expect(prompt).toContain('"rawScore"');
      expect(prompt).toContain('"scoreCategory"');
      expect(prompt).toContain('"failedIssues"');
      expect(prompt).toContain('"incorrectOrUnauthorizedChanges"');
    });
  });

  describe('computeFullDiff', () => {
    it('should return "No changes" message when codes are identical', () => {
      const result = evaluatorAgent['computeFullDiff'](
        mockOriginalCode,
        mockOriginalCode,
        LWCFileType.HTML
      );
      expect(result).toBe('No changes were made to the "html" code.');
    });

    it('should generate diff when codes are different', () => {
      const modifiedCode: LwcCodeType = {
        ...mockOriginalCode,
        html: [
          {
            path: 'testComponent.html',
            content: '<template><div>Modified Content</div></template>',
          },
        ],
      };

      const result = evaluatorAgent['computeFullDiff'](
        mockOriginalCode,
        modifiedCode,
        LWCFileType.HTML
      );

      expect(result).toContain('```diff');
      expect(result).toContain('--- original.html');
      expect(result).toContain('+++ modified.html');
      expect(result).toContain('-<template><div>Hello World</div></template>');
      expect(result).toContain('+<template><div>Modified Content</div></template>');
    });
  });

  describe('getLwcCodeText', () => {
    it('should extract HTML content correctly', () => {
      const result = evaluatorAgent['getLwcCodeText'](mockOriginalCode, LWCFileType.HTML);
      expect(result).toBe('<template><div>Hello World</div></template>');
    });

    it('should extract JS content correctly', () => {
      const result = evaluatorAgent['getLwcCodeText'](mockOriginalCode, LWCFileType.JS);
      expect(result).toBe(
        'export default class TestComponent {\n  connectedCallback() {\n    // No error handling\n  }\n}'
      );
    });

    it('should extract CSS content correctly', () => {
      const result = evaluatorAgent['getLwcCodeText'](mockOriginalCode, LWCFileType.CSS);
      expect(result).toBe('.container { color: red; }');
    });

    it('should extract JS_META content correctly', () => {
      const result = evaluatorAgent['getLwcCodeText'](mockOriginalCode, LWCFileType.JS_META);
      expect(result).toBe(
        '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>'
      );
    });

    it('should return empty string for unknown file type', () => {
      const result = evaluatorAgent['getLwcCodeText'](mockOriginalCode, 'unknown' as any);
      expect(result).toBe('');
    });

    it('should handle missing file content gracefully', () => {
      const codeWithoutHtml: LwcCodeType = {
        ...mockOriginalCode,
        html: [],
      };

      const result = evaluatorAgent['getLwcCodeText'](codeWithoutHtml, LWCFileType.HTML);
      expect(result).toBe('');
    });
  });

  describe('constructor', () => {
    it('should create instance with LLM client', () => {
      const agent = new LwcRefactorCorrectnessEvaluatorAgent(mockLlmClient);
      expect(agent).toBeInstanceOf(LwcRefactorCorrectnessEvaluatorAgent);
    });
  });
});
