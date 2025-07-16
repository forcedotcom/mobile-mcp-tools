/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { join, extname, basename } from 'path';
import * as fs from 'node:fs/promises';
import { z } from 'zod/v4';

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

export interface LWCFile {
  name: string;
  type: LWCFileType;
  content: string;
}

export interface LWCComponent {
  files: LWCFile[];
}

const McpToolSchema = z.object({
  toolId: z.string(),
  params: z.record(z.string(), z.any()).describe('The parameters to pass to the MCP tool').optional(),
});

const McpToolArraySchema = z.array(McpToolSchema);

type McpTool = z.infer<typeof McpToolSchema>;
type McpToolArray = z.infer<typeof McpToolArraySchema>;

export interface EvaluationUnit {
  query: string;
  answer: LWCComponent;
  mcpTools?: McpToolArray;
}

// Load an evaluation unit from a directory
export async function loadEvaluationUnit(subDirPath: string): Promise<EvaluationUnit | null> {
  try {
    const promptFile = join(subDirPath, 'prompt', 'prompt.md');

    // Load prompt from prompt.md file
    const query = await fs.readFile(promptFile, 'utf-8');

    const files: LWCFile[] = [];
    // Load component files
    const componentPath = join(subDirPath, 'component');

    const componentFiles = await fs.readdir(componentPath);
    for (const file of componentFiles) {
      const ext = extname(file).slice(1);
      if (isLWCFileType(ext)) {
        const name = basename(file, `.${ext}`);
        const content = await fs.readFile(join(componentPath, file), 'utf-8');
        files.push({
          name,
          type: ext,
          content,
        });
      }
    }

    const mcpToolsPath = join(subDirPath, 'mcpTools.json');
    const mcpTools = await fs.readFile(mcpToolsPath, 'utf-8');
    const mcpToolsArray = McpToolArraySchema.parse(JSON.parse(mcpTools));

    return {
      query,
      answer: {
        files,
      },
      mcpTools: mcpToolsArray,
    };
  } catch (error) {
    console.warn(`Warning: Failed to process component in ${subDirPath}:`, error);
    return null;
  }
}

/**
 * Format the LWC component according to the standard format for LLM
 */
export function formatComponent4LLM(component: LWCComponent, componentName?: string): string {
  const promptElements: string[] = [];

  promptElements.push(
    component.files
      .map(
        (file: LWCFile) =>
          `${componentName || file.name}.${file.type}\n${THREE_BACKTICKS}${getExtensionType(file.type)}\n${file.content}\n${THREE_BACKTICKS}\n`
      )
      .join('')
  );

  return promptElements.join('\n');
}

/**
 * Extract the LWC component from the LLM response, only
 * one lwc component is supported in the response
 *
 * @param responseText - The response text from the LLM
 * @returns The LWC component
 */
export function getLwcComponentFromLlmResponse(responseText: string): LWCComponent {
  // Extract component name - look for filenames in the response
  let componentNameMatch =
    responseText.match(/([\w-]+)\.html/) ||
    responseText.match(/([\w-]+)\.js/) ||
    responseText.match(/([\w-]+)\.js-meta\.xml/);

  // If no component name is found, use 'component' as the default name
  const componentName = componentNameMatch ? componentNameMatch[1] : 'component';

  const files: LWCFile[] = [];

  // Extract code blocks using regex
  const htmlCodeBlockRegex = /```html\s*([\s\S]*?)\s*```/gi;
  const htmlMatch = htmlCodeBlockRegex.exec(responseText);
  if (!htmlMatch) {
    console.debug(`responseText:${responseText}`);
    throw new Error('No html code block found in the response');
  }
  files.push({
    name: `${componentName}.html`,
    type: LWCFileType.HTML,
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
  files.push({
    name: `${componentName}.js`,
    type: LWCFileType.JS,
    content: jsMatch[1],
  });
  if (jsCodeBlockRegex.exec(responseText)) {
    console.debug(`responseText:${responseText}`);
    throw new Error('More than one js code block found in the response');
  }

  const xmlMetaCodeBlockRegex = /```xml\s*([\s\S]*?)\s*```/gi;
  const xmlMatch = xmlMetaCodeBlockRegex.exec(responseText);
  if (xmlMatch) {
    files.push({
      name: `${componentName}.js-meta.xml`,
      type: LWCFileType.JS_META,
      content: xmlMatch[1],
    });
    if (xmlMetaCodeBlockRegex.exec(responseText)) {
      console.debug(`responseText:${responseText}`);
      throw new Error('More than one js-meta.xml code block found in the response');
    }
  }

  const component = {
    files,
  };

  return component;
}

// Check if a file type is a valid LWC file type
function isLWCFileType(value: string): value is LWCFileType {
  return Object.values(LWCFileType).includes(value as LWCFileType);
}
