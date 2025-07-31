/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { LwcRefactorAgent } from '../../src/agent/lwcRefactorAgent.js';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server/schemas/lwcSchema';
import { CodeAnalysisIssuesType } from '@salesforce/mobile-web-mcp-server/schemas/analysisSchema';
import * as lwcUtils from '../../src/utils/lwcUtils.js';
import { mockConfig } from '../testUtils.js';

describe('LwcRefactorAgent', () => {
  let refactorAgent: LwcRefactorAgent;
  let mockLlmClient: LlmClient;

  const mockLwcCode: LwcCodeType = {
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
        content: 'export default class TestComponent {}',
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
      type: 'error-handling1',
      description: 'Missing error handling',
      intentAnalysis: 'The developer intended to handle errors',
      suggestedAction: 'Add try-catch blocks',
      location: {
        startLine: 1,
        endLine: 1,
      },
    },
    {
      type: 'error-handling2',
      description: 'Error swallow',
      intentAnalysis: 'No error swallow allowed',
      suggestedAction: 'Remove that catch block or rethrow the error',
      location: {
        startLine: 2,
        endLine: 2,
      },
    },
  ];

  const mockRefactoredComponent: LwcCodeType = {
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
          'export default class TestComponent {\n  try {\n    // implementation\n  } catch (error) {\n    console.error(error);\n  }\n}',
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

  beforeEach(() => {
    mockLlmClient = new LlmClient(mockConfig);
    refactorAgent = new LwcRefactorAgent(mockLlmClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('refactorComponent', () => {
    it('should successfully refactor a component with issues', async () => {
      // Mock the LLM response
      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div aria-label="Hello World">Hello World</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {
          try {
            // implementation
          } catch (error) {
            console.error(error);
          }
        }
        \`\`\`

        testComponent.css
        \`\`\`css
        .container { color: red; }
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue(mockRefactoredComponent);

      const result = await refactorAgent.refactorComponent(mockLwcCode, mockIssues);

      expect(mockLlmClient.callLLM).toHaveBeenCalledTimes(1);
      expect(lwcUtils.getLwcComponentFromLlmResponse).toHaveBeenCalledWith(mockLlmResponse);

      // Verify the result preserves original metadata but uses refactored code
      expect(result.name).toBe(mockLwcCode.name);
      expect(result.namespace).toBe(mockLwcCode.namespace);
      expect(result.jsMetaXml).toBe(mockLwcCode.jsMetaXml);
      expect(result.html).toBe(mockRefactoredComponent.html);
      expect(result.js).toBe(mockRefactoredComponent.js);
      expect(result.css).toBe(mockRefactoredComponent.css);
    });

    it('should preserve original jsMetaXml when refactoring', async () => {
      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div>Refactored</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {}
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue({
        ...mockRefactoredComponent,
        jsMetaXml: undefined, // Simulate LLM not returning js-meta.xml
      });

      const result = await refactorAgent.refactorComponent(mockLwcCode, mockIssues);

      // Should preserve the original jsMetaXml even if LLM doesn't return it
      expect(result.jsMetaXml).toBe(mockLwcCode.jsMetaXml);
    });

    it('should handle component without CSS files', async () => {
      const lwcCodeWithoutCss: LwcCodeType = {
        ...mockLwcCode,
        css: [],
      };

      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div>Refactored</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {}
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue({
        ...mockRefactoredComponent,
        css: [],
      });

      const result = await refactorAgent.refactorComponent(lwcCodeWithoutCss, mockIssues);

      expect(result.css).toEqual([]);
    });

    it('should handle component without jsMetaXml', async () => {
      const lwcCodeWithoutMeta: LwcCodeType = {
        ...mockLwcCode,
        jsMetaXml: undefined,
      };

      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div>Refactored</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {}
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue({
        ...mockRefactoredComponent,
        jsMetaXml: undefined,
      });

      const result = await refactorAgent.refactorComponent(lwcCodeWithoutMeta, mockIssues);

      expect(result.jsMetaXml).toBeUndefined();
    });

    it('should throw error when LLM call fails', async () => {
      vi.spyOn(mockLlmClient, 'callLLM').mockRejectedValue(new Error('LLM API error'));

      await expect(refactorAgent.refactorComponent(mockLwcCode, mockIssues)).rejects.toThrow(
        'LLM API error'
      );
    });

    it('should throw error when getLwcComponentFromLlmResponse fails', async () => {
      const mockLlmResponse = 'Invalid response';

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockImplementation(() => {
        throw new Error('No html code block found in the response');
      });

      await expect(refactorAgent.refactorComponent(mockLwcCode, mockIssues)).rejects.toThrow(
        'No html code block found in the response'
      );
    });
  });

  describe('createRefactorPrompt', () => {
    it('should create a properly formatted refactor prompt', async () => {
      // Access the private method through the public interface
      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div>Refactored</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {}
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue(mockRefactoredComponent);
      vi.spyOn(lwcUtils, 'formatLwcCode4LLM').mockReturnValue('formatted component code');

      await refactorAgent.refactorComponent(mockLwcCode, mockIssues);

      // Verify that formatLwcCode4LLM was called with the component
      expect(lwcUtils.formatLwcCode4LLM).toHaveBeenCalledWith(mockLwcCode);

      // Verify the LLM was called with a prompt that includes the component and issues
      expect(mockLlmClient.callLLM).toHaveBeenCalledWith(
        expect.stringContaining('formatted component code')
      );
      expect(mockLlmClient.callLLM).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(mockIssues, null, 2))
      );
      expect(mockLlmClient.callLLM).toHaveBeenCalledWith(
        expect.stringContaining('LWC Code Refactoring Assistant')
      );
    });

    it('should include all required sections in the prompt', async () => {
      const mockLlmResponse = `
        testComponent.html
        \`\`\`html
        <template><div>Refactored</div></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        export default class TestComponent {}
        \`\`\`
      `;

      vi.spyOn(mockLlmClient, 'callLLM').mockResolvedValue(mockLlmResponse);
      vi.spyOn(lwcUtils, 'getLwcComponentFromLlmResponse').mockReturnValue(mockRefactoredComponent);

      await refactorAgent.refactorComponent(mockLwcCode, mockIssues);

      const callArgs = vi.mocked(mockLlmClient.callLLM).mock.calls[0][0];

      expect(callArgs).toContain('# Lightning Web Component code to be refactored');
      expect(callArgs).toContain('# The issues identified in the Lightning Web Component code');
      expect(callArgs).toContain('# LWC Code Refactoring Assistant');
      expect(callArgs).toContain('## Guidelines:');
      expect(callArgs).toContain('## Output:');
      expect(callArgs).toContain('## Process:');
    });
  });

  describe('constructor', () => {
    it('should create an instance with the provided LlmClient', () => {
      const agent = new LwcRefactorAgent(mockLlmClient);
      expect(agent).toBeInstanceOf(LwcRefactorAgent);
    });
  });
});
