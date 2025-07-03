import { type AST, Linter } from 'eslint';
import { parse, type Options as MeriyahOptions } from 'meriyah';
import { Tool } from '../../tool';
import { LwcCodeSchema, type LwcCodeType } from '../../../schemas/lwcSchema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import lwcGraphAnalyzerPlugin from '@salesforce/eslint-plugin-lwc-graph-analyzer';
import { ruleConfigs } from './ruleConfig';

import {
  CodeAnalysisBaseIssueType,
  CodeAnalysisIssueType,
  ExpertsCodeAnalysisIssuesSchema,
  ExpertsCodeAnalysisIssuesType,
  ExpertCodeAnalysisIssuesType,
} from '../../../schemas/analysisSchema';

const BUNDLE_ANALYZER = lwcGraphAnalyzerPlugin.processors.bundleAnalyzer;
const ANALYSIS_EXPERT_NAME = 'Mobile Web Offline Analysis';
const PLUGIN_NAME = '@salesforce/lwc-graph-analyzer';
const RECOMMENDED_CONFIG = lwcGraphAnalyzerPlugin.configs.recommended;
const RECOMMENDED_RULES = RECOMMENDED_CONFIG.rules || {};

// ESLint parser configuration
const MERIYAH_PARSER: Linter.Parser = {
  parseForESLint(code: string, options: MeriyahOptions): { ast: AST.Program } {
    const tokens: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const comments: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const program = parse(code, {
      ...options,
      onToken: tokens,
      onComment: comments,
    }) as NonNullable<AST.Program>;

    const ast: AST.Program = {
      ...program,
      tokens,
      comments,
    };

    return { ast };
  },
};

const PARSER_OPTIONS: Linter.ParserOptions = {
  next: true,
  module: true,
  loc: true,
  ranges: true,
};

const LINTER_CONFIG: Linter.Config = {
  name: `config: ${PLUGIN_NAME}`,
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: MERIYAH_PARSER,
    parserOptions: PARSER_OPTIONS,
  },
  rules: RECOMMENDED_RULES,
  plugins: {
    [PLUGIN_NAME]: lwcGraphAnalyzerPlugin,
  },
  processor: BUNDLE_ANALYZER,
};

export class OfflineAnalysisTool implements Tool {
  readonly name = 'Mobile Web Offline Analysis Tool';
  readonly description =
    'Analyzes LWC components for mobile-specific issues and provides detailed recommendations for improvements. It can be leveraged to check if components are mobile-ready.';
  readonly toolId = 'sfmobile-web-offline-analysis';
  readonly inputSchema = LwcCodeSchema;
  readonly outputSchema = ExpertsCodeAnalysisIssuesSchema;

  private readonly linter: Linter;
  private readonly ruleReviewers: Record<string, CodeAnalysisBaseIssueType>;

  constructor() {
    this.linter = new Linter({ configType: 'flat' });
    this.ruleReviewers = this.initializeRuleReviewers();
  }

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.registerTool(
      this.toolId,
      {
        description: this.description,
        inputSchema: this.inputSchema.shape,
        annotations: annotations,
      },
      async (code: LwcCodeType) => {
        try {
          const analysisResults = await this.analyzeCode(code);
          return {
            content: [
              {
                type: 'text',
                text: this.createAnalysisMarkdown(code.name, analysisResults),
              },
            ],
          };
        } catch (error) {
          console.error('Error during code analysis:', error);
          throw new Error(
            `Failed to analyze code: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    );
  }

  private initializeRuleReviewers(): Record<string, CodeAnalysisBaseIssueType> {
    return ruleConfigs.reduce(
      (acc, ruleConfig) => {
        acc[ruleConfig.id] = ruleConfig.config;
        return acc;
      },
      {} as Record<string, CodeAnalysisBaseIssueType>
    );
  }

  private async analyzeCode(code: LwcCodeType): Promise<ExpertsCodeAnalysisIssuesType> {
    const jsCode = code.js.map(js => js.content).join('\n');
    const { messages } = this.linter.verifyAndFix(jsCode, LINTER_CONFIG, {
      fix: true,
    });

    const offlineAnalysisIssues = this.analyzeIssues(jsCode, messages);

    return {
      analysisResults: [offlineAnalysisIssues],
      orchestrationInstructions: this.getOrchestrationInstructions(),
    };
  }

  private getOrchestrationInstructions(): string {
    return "If you have not already executed the 'sfmobile-web-offline-guidance' tool in this conversation thread: (1) Immediately call the 'sfmobile-web-offline-guidance' tool, (2) Execute all review instructions from the guidance tool's output against the user's LWC component code in the specified format, (3) Combine the review results from step 2 with this tool's analysis results, then refactor the component based on all combined review recommendations.";
  }

  private createAnalysisMarkdown(
    componentName: string,
    analysisResults: ExpertsCodeAnalysisIssuesType
  ): string {
    let markdown = `Analysis results for the LWC component ${componentName} are presented below. Please review them and provide a detailed refactoring plan for the component. \n\n`;

    for (const analysis of analysisResults.analysisResults) {
      markdown += this.formatAnalysisSection(analysis);
    }

    if (analysisResults.orchestrationInstructions) {
      markdown += `# orchestration instructions:\n\n ${analysisResults.orchestrationInstructions}\n\n`;
    }

    return markdown.trim();
  }

  private formatAnalysisSection(analysis: ExpertCodeAnalysisIssuesType): string {
    let section = `# ${analysis.expertReviewerName}\n\n`;

    if (analysis.issues.length === 0) {
      section += 'No issues found.\n\n';
      return section;
    }

    for (const issue of analysis.issues) {
      section += this.formatIssue(issue);
    }

    return section;
  }

  private formatIssue(issue: CodeAnalysisIssueType): string {
    let issueText = `## ${issue.type}\n\n`;
    issueText += `**Description:** ${issue.description}\n\n`;
    issueText += `**Intent Analysis:** ${issue.intentAnalysis}\n\n`;
    issueText += `**Suggested Action:** ${issue.suggestedAction}\n\n`;

    if (issue.location) {
      issueText += `**Location:** Line ${issue.location.startLine}:${issue.location.startColumn} - Line ${issue.location.endLine}:${issue.location.endColumn}\n\n`;
    }

    if (issue.code) {
      issueText += `**Code:**\n\`\`\`javascript\n${issue.code}\n\`\`\`\n\n`;
    }

    issueText += '---\n\n';
    return issueText;
  }

  private analyzeIssues(
    code: string,
    messages: Linter.LintMessage[]
  ): ExpertCodeAnalysisIssuesType {
    const issues: CodeAnalysisIssueType[] = [];

    for (const violation of messages) {
      const { ruleId, line, column, endLine, endColumn } = violation;
      const ruleReviewer = this.ruleReviewers[ruleId];

      if (ruleReviewer) {
        const issue: CodeAnalysisIssueType = {
          type: ruleReviewer.type,
          description: ruleReviewer.description,
          intentAnalysis: ruleReviewer.intentAnalysis,
          suggestedAction: ruleReviewer.suggestedAction,
          code: this.extractCodeSnippet(code, line, endLine),
          location: {
            startLine: line,
            startColumn: column,
            endLine: endLine,
            endColumn: endColumn,
          },
        };
        issues.push(issue);
      }
    }

    return {
      expertReviewerName: ANALYSIS_EXPERT_NAME,
      issues: issues,
    };
  }

  private extractCodeSnippet(code: string, startLine: number, endLine: number): string {
    return code
      .split('\n')
      .slice(startLine - 1, endLine)
      .join('\n');
  }
}
