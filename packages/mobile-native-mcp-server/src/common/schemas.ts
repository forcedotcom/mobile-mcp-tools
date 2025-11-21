/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Common Schema Components
 *
 * Shared field definitions, validators, and schema components used across multiple tools.
 * This eliminates duplication and ensures consistency in field validation.
 */

import { z } from 'zod';

/**
 * Platform enum used across all mobile tools
 */
export const PLATFORM_ENUM = z.enum(['iOS', 'Android']).describe('Target mobile platform');
export type PlatformEnum = z.infer<typeof PLATFORM_ENUM>;

/**
 * Project path field used in multiple tools
 */
export const PROJECT_PATH_FIELD = z.string().describe('Path to the mobile project directory');

/**
 * Project name field used in multiple tools
 */
export const PROJECT_NAME_FIELD = z.string().describe('Name for the mobile app project');

/**
 * Template-related schemas
 * Used for validating template discovery and selection data structures
 */

// Schema for template metadata - only require platform and displayName, allow everything else to passthrough
const TemplateMetadataSchema = z
  .object({
    platform: z.enum(['ios', 'android']),
    displayName: z.string(),
  })
  .passthrough();

// Schema for individual template entry in the list - require metadata and path (template identifier)
// Note: path is not defined in template-schema.json (which only defines the metadata structure),
// but it IS present in the CLI output from `sf mobilesdk listtemplates --doc --json`
const TemplateEntrySchema = z
  .object({
    path: z
      .string()
      .describe(
        'Template path/name identifier used for template selection and detail fetching. Present in CLI output but not in template-schema.json'
      ),
    metadata: TemplateMetadataSchema,
  })
  .passthrough();

// Schema for the complete template list output structure - allow passthrough for flexibility
export const TEMPLATE_LIST_SCHEMA = z
  .object({
    templates: z.array(TemplateEntrySchema),
  })
  .passthrough();

// Type inferred from the schema
export type TemplateListOutput = z.infer<typeof TEMPLATE_LIST_SCHEMA>;
