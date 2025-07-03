import { z } from 'zod';

const ExpertReviewerNameSchema = z
  .string()
  .describe(
    'The title-cased name of the reviewer providing the review instructions, representing a brief description of the functional area meant to be reviewed.'
  );

export const CodeAnalysisBaseIssueSchema = z.object({
  type: z.string().describe('Categorize the issue'),
  description: z.string().describe('Why this is an issue?'),
  intentAnalysis: z.string().describe('What is the likely intent of the developer?'),
  suggestedAction: z
    .string()
    .describe(
      `How a developer should address the issue? Be as detailed as possible without adding code snippets.`
    ),
});

export const CodeAnalysisIssueSchema = CodeAnalysisBaseIssueSchema.extend({
  code: z.string().optional().describe('What is the code snippet with the issue?'),
  location: z
    .object({
      startLine: z.number(),
      endLine: z.number().optional(),
      startColumn: z.number().optional(),
      endColumn: z.number().optional(),
    })
    .describe('Provide the exact line number(s) and column number(s) where the issue occurs'),
});

export const ExpertCodeAnalysisIssuesSchema = z.object({
  expertReviewerName: ExpertReviewerNameSchema,
  issues: z
    .array(CodeAnalysisIssueSchema)
    .describe(
      'Specific issues found during the analysis. Should be empty if no issues were found.'
    ),
});

export const ExpertsCodeAnalysisIssuesSchema = z.object({
  analysisResults: z
    .array(ExpertCodeAnalysisIssuesSchema)
    .min(1)
    .describe(
      'An array of expert reviews of the code, each outlining specific issues found during analysis.'
    ),
  orchestrationInstructions: z
    .string()
    .default(
      "If you have not already executed the 'sfmobile-web-offline-guidance' tool in this conversation thread: (1) Immediately call the 'sfmobile-web-offline-guidance' tool, (2) Execute all review instructions from the guidance tool's output against the user's LWC component code in the specified format, (3) Combine the review results from step 2 with this tool's analysis results, then refactor the component based on all combined review recommendations."
    )
    .describe(
      'Instructions for the MCP client on how to orchestrate this tool with the companion guidance tool for comprehensive offline compatibility review.'
    ),
});

export type CodeAnalysisIssueType = z.infer<typeof CodeAnalysisIssueSchema>;
export type CodeAnalysisBaseIssueType = z.infer<typeof CodeAnalysisBaseIssueSchema>;
export type ExpertCodeAnalysisIssuesType = z.infer<typeof ExpertCodeAnalysisIssuesSchema>;
export type ExpertsCodeAnalysisIssuesType = z.infer<typeof ExpertsCodeAnalysisIssuesSchema>;
