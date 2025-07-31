/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { join, extname, basename } from 'path';
import * as fs from 'node:fs/promises';
import { z } from 'zod/v4';
import { LwcCodeType } from '@salesforce/mobile-web-mcp-server';
import {
  McpToolArraySchema,
  type McpToolArray,
  EvaluationTypeSchema,
  EvalConfigSchema,
  type EvaluationType,
  type EvalConfig,
} from '../schema/schema.js';

const THREE_BACKTICKS = '```';

export enum LWCFileType {
  HTML = 'html',
  JS = 'js',
  CSS = 'css',
  JS_META = 'js-meta.xml',
}

/**
 * Get the extension type used in LLM prompt for LWC file type
 */
export function getExtensionType(fileType: LWCFileType): string {
  switch (fileType) {
    case LWCFileType.JS_META:
      return 'xml';
    case LWCFileType.HTML:
      return 'html';
    case LWCFileType.JS:
      return 'javascript';
    case LWCFileType.CSS:
      return 'css';
  }
}

export interface EvaluationUnit {
  query?: string;
  component: LwcCodeType;
  config: EvalConfig;
}

// Load an evaluation unit from a directory
export async function loadEvaluationUnit(subDirPath: string): Promise<EvaluationUnit | null> {
  try {
    const promptFile = join(subDirPath, 'prompt', 'prompt.md');

    // Load prompt from prompt.md file
    const query = await fs.readFile(promptFile, 'utf-8');

    const html: Array<{ path: string; content: string }> = [];
    const js: Array<{ path: string; content: string }> = [];
    const css: Array<{ path: string; content: string }> = [];
    let jsMetaXml: { path: string; content: string } | undefined;
    let componentName = 'component';
    let namespace = 'c';

    // Load component files
    const componentPath = join(subDirPath, 'component');

    const componentFiles = await fs.readdir(componentPath);
    for (const file of componentFiles) {
      // Handle compound extensions like js-meta.xml
      let fileType: string;
      if (file.endsWith('.js-meta.xml')) {
        fileType = 'js-meta.xml';
      } else {
        fileType = extname(file).slice(1);
      }

      if (isLWCFileType(fileType)) {
        const name = basename(file, `.${fileType}`);
        const content = await fs.readFile(join(componentPath, file), 'utf-8');
        const filePath = `${name}.${fileType}`;

        switch (fileType) {
          case 'html':
            html.push({ path: filePath, content });
            if (!componentName || componentName === 'component') {
              componentName = name;
            }
            break;
          case 'js':
            js.push({ path: filePath, content });
            if (!componentName || componentName === 'component') {
              componentName = name;
            }
            break;
          case 'css':
            css.push({ path: filePath, content });
            break;
          case 'js-meta.xml':
            jsMetaXml = { path: filePath, content };
            // Extract namespace from meta XML if available
            const namespaceMatch = content.match(
              /<targetConfigs>\s*<targetConfig targets="lightning__AppPage">\s*<property name="namespace" value="([^"]+)"/
            );
            if (namespaceMatch) {
              namespace = namespaceMatch[1];
            }
            break;
        }
      }
    }

    const component: LwcCodeType = {
      name: componentName,
      namespace,
      html,
      js,
      css,
      jsMetaXml,
    };

    const evalConfigPath = join(subDirPath, 'evalConfig.json');
    const evalConfig = await fs.readFile(evalConfigPath, 'utf-8');
    const evalConfigObj = JSON.parse(evalConfig);
    const parsedConfig = EvalConfigSchema.parse(evalConfigObj);

    return {
      query,
      component,
      config: parsedConfig,
    };
  } catch (error) {
    console.warn(`Warning: Failed to process component in ${subDirPath}:`, error);
    return null;
  }
}

/**
 * Format the LWC component according to the standard format for LLM
 */
export function formatComponent4LLM(component: LwcCodeType, componentName?: string): string {
  const promptElements: string[] = [];

  // Format HTML files
  component.html.forEach(file => {
    const fileName = componentName || component.name;
    promptElements.push(
      `${fileName}.html\n${THREE_BACKTICKS}html\n${file.content}\n${THREE_BACKTICKS}\n`
    );
  });

  // Format JS files
  component.js.forEach(file => {
    const fileName = componentName || component.name;
    promptElements.push(
      `${fileName}.js\n${THREE_BACKTICKS}javascript\n${file.content}\n${THREE_BACKTICKS}\n`
    );
  });

  // Format CSS files
  component.css.forEach(file => {
    const fileName = componentName || component.name;
    promptElements.push(
      `${fileName}.css\n${THREE_BACKTICKS}css\n${file.content}\n${THREE_BACKTICKS}\n`
    );
  });

  // Format JS meta XML (optional, only if explicitly requested)
  // Note: js-meta.xml is typically not included in LLM prompts as it's configuration

  return promptElements.join('\n');
}

export function formatLwcCode4LLM(component: LwcCodeType): string {
  const promptElements: string[] = [];
  promptElements.push(
    `${component.name}.html\n${THREE_BACKTICKS}html\n${component.html[0].content}\n${THREE_BACKTICKS}\n`
  );
  if (component.js.length > 0) {
    promptElements.push(
      `${component.name}.js\n${THREE_BACKTICKS}javascript\n${component.js[0].content}\n${THREE_BACKTICKS}\n`
    );
  }
  if (component.css.length > 0) {
    promptElements.push(
      `${component.name}.css\n${THREE_BACKTICKS}css\n${component.css[0].content}\n${THREE_BACKTICKS}\n`
    );
  }
  return promptElements.join('\n');
}

/**
 * Extract the LWC component from the LLM response, only
 * one lwc component is supported in the response
 *
 * @param responseText - The response text from the LLM
 * @returns The LWC component
 */
export function getLwcComponentFromLlmResponse(responseText: string): LwcCodeType {
  // Extract component name - look for filenames in the response
  const componentNameMatch =
    responseText.match(/([\w-]+)\.html/) ||
    responseText.match(/([\w-]+)\.js/) ||
    responseText.match(/([\w-]+)\.js-meta\.xml/);

  // If no component name is found, use 'component' as the default name
  const componentName = componentNameMatch ? componentNameMatch[1] : 'component';

  const html: Array<{ path: string; content: string }> = [];
  const js: Array<{ path: string; content: string }> = [];
  const css: Array<{ path: string; content: string }> = [];
  let jsMetaXml: { path: string; content: string } | undefined;

  // Extract code blocks using regex
  const htmlCodeBlockRegex = /```html\s*([\s\S]*?)\s*```/gi;
  const htmlMatch = htmlCodeBlockRegex.exec(responseText);
  if (!htmlMatch) {
    console.debug(`responseText:${responseText}`);
    throw new Error('No html code block found in the response');
  }
  html.push({
    path: `${componentName}.html`,
    content: htmlMatch[1],
  });
  if (htmlCodeBlockRegex.exec(responseText)) {
    console.debug(`responseText:${responseText}`);
    throw new Error('More than one html code block found in the response');
  }

  const jsCodeBlockRegex = /```javascript\s*([\s\S]*?)\s*```/gi;
  const jsMatch = jsCodeBlockRegex.exec(responseText);
  if (!jsMatch) {
    console.debug(`responseText:${responseText}`);
    throw new Error('No js code block found in the response');
  }
  js.push({
    path: `${componentName}.js`,
    content: jsMatch[1],
  });
  if (jsCodeBlockRegex.exec(responseText)) {
    console.debug(`responseText:${responseText}`);
    throw new Error('More than one js code block found in the response');
  }

  const xmlMetaCodeBlockRegex = /```xml\s*([\s\S]*?)\s*```/gi;
  const xmlMatch = xmlMetaCodeBlockRegex.exec(responseText);
  if (xmlMatch) {
    jsMetaXml = {
      path: `${componentName}.js-meta.xml`,
      content: xmlMatch[1],
    };
    if (xmlMetaCodeBlockRegex.exec(responseText)) {
      console.debug(`responseText:${responseText}`);
      throw new Error('More than one js-meta.xml code block found in the response');
    }
  }

  return {
    name: componentName,
    namespace: 'c',
    html,
    js,
    css,
    jsMetaXml,
  };
}

// Check if a file type is a valid LWC file type
function isLWCFileType(value: string): value is LWCFileType {
  return Object.values(LWCFileType).includes(value as LWCFileType);
}
