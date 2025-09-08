/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EmptySchema } from '../../schemas/lwcSchema.js';
import { Tool } from '../tool.js';

export abstract class BaseTool implements Tool {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly title: string;
  protected abstract readonly typeDefinitionPath: string;
  public abstract readonly toolId: string;
  protected abstract readonly serviceDescription: string;
  public abstract readonly serviceName: string;

  // Required by Tool interface
  public readonly inputSchema = EmptySchema;
  // Extract repeated path as a protected member
  protected readonly resourcesPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'resources'
  );

  // Simplified - no parameter needed since it always uses this.typeDefinitionPath
  protected async readTypeDefinitionFile(): Promise<string> {
    return readFile(join(this.resourcesPath, this.typeDefinitionPath), 'utf-8');
  }

  protected async readBaseCapability(): Promise<string> {
    return readFile(join(this.resourcesPath, 'BaseCapability.d.ts'), 'utf-8');
  }

  protected async readMobileCapabilities(): Promise<string> {
    return readFile(join(this.resourcesPath, 'mobileCapabilities.d.ts'), 'utf-8');
  }

  protected createServiceGroundingText(
    typeDefinitions: string,
    baseCapability: string,
    mobileCapabilities: string
  ): string {
    return `# ${this.serviceName} Service Grounding Context

${this.serviceDescription}

## Base Capability
\`\`\`typescript
${baseCapability}
\`\`\`

## Mobile Capabilities
\`\`\`typescript
${mobileCapabilities}
\`\`\`

## ${this.serviceName} Service API
\`\`\`typescript
${typeDefinitions}
\`\`\``;
  }

  public async handleRequest() {
    try {
      const typeDefinitions = await this.readTypeDefinitionFile();
      const baseCapability = await this.readBaseCapability();
      const mobileCapabilities = await this.readMobileCapabilities();
      return {
        content: [
          {
            type: 'text' as const,
            text: this.createServiceGroundingText(
              typeDefinitions,
              baseCapability,
              mobileCapabilities
            ),
          },
        ],
      };
    } catch {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error: Unable to load ${this.name} type definitions.`,
          },
        ],
      };
    }
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    // Add title annotation from the tool
    const enhancedAnnotations = {
      ...annotations,
      title: this.title,
    };

    server.tool(
      this.toolId,
      this.description,
      EmptySchema.shape,
      enhancedAnnotations,
      this.handleRequest.bind(this)
    );
  }
}
