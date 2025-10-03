/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '../../../logging/logger.js';
import { BUILD_TOOL, BuildWorkflowInput } from './metadata.js';
import { AbstractWorkflowTool } from '../../base/abstractWorkflowTool.js';

export class SFMobileNativeBuildTool extends AbstractWorkflowTool<typeof BUILD_TOOL> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, BUILD_TOOL, 'BuildTool', logger);
  }

  public handleRequest = async (input: BuildWorkflowInput) => {
    const guidance = this.generateBuildGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateBuildGuidance(input: BuildWorkflowInput) {
    return dedent`
     You are a tech-adept agent acting on behalf of a user who is not familiar with the technical details of MSDK development. 
     Carry out the steps in the following guideline for them, and share the key outcomes they need to know.

     # Salesforce Mobile App Build Guidance for ${input.platform}
      

      ${input.platform === 'iOS' ? this.msdkAppBuildExecutionIOS(input.projectPath) : this.msdkAppBuildExecutionAndroid(input.projectPath)}
      
    `;
  }

  private msdkAppBuildExecutionIOS(projectPath: string) {
    return dedent`  
      ## iOS Build Execution
      Navigate to the ${projectPath} directory and run the following command to build the MSDK iOS App:

      \`\`\`bash
      xcodebuild -workspace <your-workspace>.xcworkspace -scheme <your-scheme> -destination 'generic/platform=iOS Simulator' clean build
      \`\`\`

      Replace <your-workspace>.xcworkspace and <your-scheme> with the actual workspace and scheme names of your project.

      If the output includes **BUILD SUCCEEDED**, the build completed successfully. If you see errors such as **error:** or **Undefined symbol**, resolve them and try again. Refer back to Step 1 for guidance on fixing setup issues.
      
      
    `;
  }

  private msdkAppBuildExecutionAndroid(projectPath: string) {
    return dedent`  
      ## Android Build Execution
      Navigate to the ${projectPath} directory and use the following command to build the MSDK Android App:

      \`\`\`bash
      ./gradlew build
      \`\`\`

      If **BUILD SUCCESSFUL** is shown as the output, the build is successful. If there are build errors like **FAILURE:Build failed**, please fix them and retry the build. Refer to the step 1 to fix the setup issues.
    `;
  }
}
