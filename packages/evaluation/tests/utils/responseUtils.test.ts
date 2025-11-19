/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, expect, it } from 'vitest';
import { getJsonResponse } from '../../src/utils/responseUtils.js';

describe('Response Utils', () => {
  describe('getJsonResponse', () => {
    it('should extract JSON from code blocks with json tag', () => {
      const response = '```json\n{"key": "value"}\n```';
      expect(getJsonResponse(response)).toBe('{"key": "value"}');
    });

    it('should extract JSON object when wrapped in curly braces', () => {
      const response = '{"key": "value", "nested": {"prop": 123}}';
      expect(getJsonResponse(response)).toBe('{"key": "value", "nested": {"prop": 123}}');
    });

    it('should extract JSON array when wrapped in square brackets', () => {
      const response = '[{"key": "value"}, {"key2": "value2"}]';
      expect(getJsonResponse(response)).toBe('[{"key": "value"}, {"key2": "value2"}]');
    });

    it('should throw error when no JSON is found', () => {
      const response = 'This is just plain text without JSON';
      expect(() => getJsonResponse(response)).toThrow('No JSON response found in LLM output');
    });

    it('should throw error when JSON is not properly wrapped', () => {
      const response = 'Some text {"key": "value"} more text';
      expect(() => getJsonResponse(response)).toThrow('No JSON response found in LLM output');
    });

    it('should extract JSON from multi-line code block', () => {
      const response = `\`\`\`json
{
  "key1": "value1",
  "key2": "value2",
  "nested": {
    "prop": 123
  }
}
\`\`\``;
      const expected = `{
  "key1": "value1",
  "key2": "value2",
  "nested": {
    "prop": 123
  }
}`;
      expect(getJsonResponse(response)).toBe(expected);
    });
  });
});
