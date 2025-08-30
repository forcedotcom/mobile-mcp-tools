import { Tool } from '../../tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

const EnvironmentSetupInputSchema = z.object({
  platform: z.enum(['iOS', 'Android']).describe('Target mobile platform'),
  projectPath: z.string().describe('Path to the project'),
});

type EnvironmentSetupInput = z.infer<typeof EnvironmentSetupInputSchema>;

export class SfmobileEnvironmentSetupTool implements Tool {
  readonly name = 'Salesforce Mobile Environment Setup Tool';
  readonly title = 'Salesforce Mobile Environment Setup Guide';
  readonly description =
    'Guides LLM through the process of setting up the environment for Salesforce mobile app development';
  public readonly toolId = 'sfmobile-environment-setup';
  readonly inputSchema = EnvironmentSetupInputSchema;
  readonly outputSchema = z.object({});

  public register(server: McpServer, annotations: ToolAnnotations): void {
    server.tool(
      this.toolId,
      this.description,
      this.inputSchema.shape,
      {
        ...annotations,
        title: this.title,
      },
      this.handleRequest.bind(this)
    );
  }

  private async handleRequest(input: EnvironmentSetupInput) {
    const guidance = this.generateEnvironmentSetupGuidance(input);

    return {
      content: [
        {
          type: 'text' as const,
          text: guidance,
        },
      ],
    };
  }

  private generateEnvironmentSetupGuidance(input: EnvironmentSetupInput) {
    return dedent`
      # Salesforce Mobile Environment Setup Guidance for ${input.platform}

      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.
      Please execute the instructions of the following plan on behalf of the user, providing them information on the outcomes that they may need to know.

      ${input.platform === 'iOS' ? this.setupEnvironmentIOS() : this.setupEnvironmentAndroid()}

    `;
  }

  private setupEnvironmentIOS() {
    return dedent`
      ## iOS Environment Setup
      1. Install Xcode from the Mac App Store.
      2. Install Homebrew by running the following command:

      \`\`\`bash
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      \`\`\`

      3. Install Node.js and npm using Homebrew:

      \`\`\`bash
      brew install node
      \`\`\`

      4. Install the Salesforce CLI:

      \`\`\`bash
      npm install sfdx-cli --global
      \`\`\`
    `;
  }

  private setupEnvironmentAndroid() {
    return dedent`
      ## Android Environment Setup
      1. Install Android Studio from the official website if not already installed.
      2. Install Node.js and npm using Homebrew if not already installed:

      \`\`\`bash
      brew install node
      \`\`\`

      3. Install the Salesforce CLI if not already installed:

      \`\`\`bash
      npm install sfdx-cli --global
      \`\`\
    `;
  }
}






