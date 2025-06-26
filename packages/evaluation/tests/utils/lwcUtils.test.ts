/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import {
  formatComponent4LLM,
  LWCComponent,
  LWCFileType,
  getExtensionType,
  getLwcComponentFromLlmResponse,
} from '../../src/utils/lwcUtils.js';

describe('LWC Utilities', () => {
  describe('getExtensionType', () => {
    it('should return correct extension for HTML file type', () => {
      expect(getExtensionType(LWCFileType.HTML)).toBe('html');
    });

    it('should return correct extension for JS file type', () => {
      expect(getExtensionType(LWCFileType.JS)).toBe('javascript');
    });

    it('should return correct extension for CSS file type', () => {
      expect(getExtensionType(LWCFileType.CSS)).toBe('css');
    });

    it('should return correct extension for JS_META file type', () => {
      expect(getExtensionType(LWCFileType.JS_META)).toBe('xml');
    });
  });

  describe('formatComponent4LLM', () => {
    it('should correctly format an LWC component with a single file', () => {
      // Prepare test data
      const component: LWCComponent = {
        files: [
          {
            name: 'testComponent',
            type: LWCFileType.JS,
            content: 'export default class TestComponent {}',
          },
        ],
      };

      // Execute function
      const result = formatComponent4LLM(component);

      // Verify result
      expect(result).toBe(
        'testComponent.js\n```javascript\nexport default class TestComponent {}\n```\n'
      );
    });

    it('should correctly format an LWC component with multiple files', () => {
      // Prepare test data
      const component: LWCComponent = {
        files: [
          {
            name: 'testComponent',
            type: LWCFileType.JS,
            content: 'export default class TestComponent {}',
          },
          {
            name: 'testComponent',
            type: LWCFileType.HTML,
            content: '<template><div>Hello</div></template>',
          },
          {
            name: 'testComponent',
            type: LWCFileType.CSS,
            content: '.container { color: red; }',
          },
        ],
      };

      // Execute function
      const result = formatComponent4LLM(component);

      // Verify result
      const expected =
        'testComponent.js\n```javascript\nexport default class TestComponent {}\n```\n' +
        'testComponent.html\n```html\n<template><div>Hello</div></template>\n```\n' +
        'testComponent.css\n```css\n.container { color: red; }\n```\n';

      expect(result).toBe(expected);
    });

    it('should handle empty components', () => {
      // Prepare test data
      const component: LWCComponent = {
        files: [],
      };

      // Execute function
      const result = formatComponent4LLM(component);

      // Verify result
      expect(result).toBe('');
    });

    it('should use correct syntax highlighting for js-meta.xml files', () => {
      // Prepare test data
      const component: LWCComponent = {
        files: [
          {
            name: 'testComponent',
            type: LWCFileType.JS_META,
            content:
              '<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>',
          },
        ],
      };

      // Execute function
      const result = formatComponent4LLM(component);

      // Verify result
      expect(result).toBe(
        'testComponent.js-meta.xml\n```xml\n<?xml version="1.0" encoding="UTF-8"?><LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata"></LightningComponentBundle>\n```\n'
      );
    });

    it('should use the component name if provided', () => {
      const component: LWCComponent = {
        files: [
          {
            name: 'testComponent',
            type: LWCFileType.JS,
            content: 'export default class TestComponent {}',
          },
        ],
      };
      const result = formatComponent4LLM(component, 'xyz');
      expect(result).toBe('xyz.js\n```javascript\nexport default class TestComponent {}\n```\n');
    });
  });

  describe('getLwcComponentFromLlmResponse', () => {
    it('should correctly parse a response with HTML, JS, and XML files', () => {
      const responseText = `
Here is the generated LWC component:
testComponent.html
\`\`\`html
<template></template>
\`\`\`

testComponent.js
\`\`\`javascript
const abc = "xyz";
\`\`\`

testComponent.js-meta.xml
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
</LightningComponentBundle>
\`\`\`
      `;

      const result = getLwcComponentFromLlmResponse(responseText);

      expect(result.files).toHaveLength(3);
      expect(result.files[0]).toEqual({
        name: 'testComponent.html',
        type: LWCFileType.HTML,
        content: '<template></template>',
      });
      expect(result.files[1]).toEqual({
        name: 'testComponent.js',
        type: LWCFileType.JS,
        content: 'const abc = "xyz";',
      });
      expect(result.files[2]).toEqual({
        name: 'testComponent.js-meta.xml',
        type: LWCFileType.JS_META,
        content:
          '<?xml version="1.0" encoding="UTF-8"?>\n<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">\n</LightningComponentBundle>',
      });
    });

    it('should handle response with only HTML and JS files (no XML)', () => {
      const responseText = `
testComponent.html
\`\`\`html
<template></template>
\`\`\`

testComponent.js
\`\`\`javascript
const abc = "xyz";
\`\`\`
      `;

      const result = getLwcComponentFromLlmResponse(responseText);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].type).toBe(LWCFileType.HTML);
      expect(result.files[1].type).toBe(LWCFileType.JS);
    });

    it('should handle response with no component name specified', () => {
      const responseText = `
\`\`\`html
<template></template>
\`\`\`

\`\`\`javascript
const abc = "xyz";
\`\`\`
      `;

      const result = getLwcComponentFromLlmResponse(responseText);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].type).toBe(LWCFileType.HTML);
      expect(result.files[0].name).toBe('component.html');
      expect(result.files[1].type).toBe(LWCFileType.JS);
      expect(result.files[1].name).toBe('component.js');
    });
    it('should throw error when no HTML code block is found', () => {
      const responseText = `
        testComponent.js
        \`\`\`javascript
        const abc = "xyz";
        \`\`\`
      `;

      expect(() => getLwcComponentFromLlmResponse(responseText)).toThrow(
        'No html code block found in the response'
      );
    });

    it('should throw error when no JS code block is found', () => {
      const responseText = `
        testComponent.html
        \`\`\`html
        <template></template>
        \`\`\`
      `;

      expect(() => getLwcComponentFromLlmResponse(responseText)).toThrow(
        'No js code block found in the response'
      );
    });

    it('should throw error when more than one JS code block are found', () => {
      const responseText = `
        testComponent.html
        \`\`\`html
        <template></template>
        \`\`\`

        testComponent.js
        \`\`\`javascript
        const abc = "xyz";
        \`\`\`

        testComponent2.js
        \`\`\`javascript
        const abc = "xyz";
        \`\`\`
      `;

      expect(() => getLwcComponentFromLlmResponse(responseText)).toThrow(
        'More than one js code block found in the response'
      );
    });

    it('should throw error when more than one HTML code block are found', () => {
      const responseText = `
        testComponent1.html
        \`\`\`html
        <template></template>
        \`\`\`

         testComponent2.html
        \`\`\`html
        <template></template>
        \`\`\`

        testComponent1.js
        \`\`\`javascript
        const abc = "xyz";
        \`\`\`
      `;

      expect(() => getLwcComponentFromLlmResponse(responseText)).toThrow(
        'More than one html code block found in the response'
      );
    });

    it('should throw error when more than one meta xml code block are found', () => {
      const responseText = `
        testComponent1.html
        \`\`\`html
        <template></template>
        \`\`\`

        testComponent1.js
        \`\`\`javascript
        const abc = "xyz";
        \`\`\`

        testComponent1.js-meta.xml
        \`\`\`xml
        <?xml version="1.0" encoding="UTF-8"?>
        <LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
        </LightningComponentBundle>
        \`\`\`

        testComponent2.js-meta.xml
        \`\`\`xml
        <?xml version="1.0" encoding="UTF-8"?>
        <LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
        </LightningComponentBundle>
        \`\`\`
      `;

      expect(() => getLwcComponentFromLlmResponse(responseText)).toThrow(
        'More than one js-meta.xml code block found in the response'
      );
    });
  });
});
