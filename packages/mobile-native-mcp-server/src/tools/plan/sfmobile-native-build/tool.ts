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
import { TempDirectoryManager, defaultTempDirectoryManager } from '../../../common.js';

export class SFMobileNativeBuildTool extends AbstractWorkflowTool<typeof BUILD_TOOL> {
  private readonly tempDirManager: TempDirectoryManager;

  constructor(
    server: McpServer,
    tempDirManager: TempDirectoryManager = defaultTempDirectoryManager,
    logger?: Logger
  ) {
    super(server, BUILD_TOOL, 'BuildTool', logger);
    this.tempDirManager = tempDirManager;
  }

  public handleRequest = async (input: BuildWorkflowInput) => {
    const guidance = this.generateBuildGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateBuildGuidance(input: BuildWorkflowInput) {
    return dedent`
     # Salesforce Mobile App Build Execution for ${input.platform}

     ## IMPORTANT: Your ONLY Task
     
     Your sole responsibility is to:
     1. Execute the build command exactly as specified below
     2. Check the exit code to determine success or failure
     3. Return the result immediately
     
     **DO NOT** attempt to fix any errors or issues you encounter.
     **DO NOT** run any additional commands beyond what is specified.
     
     If the build fails, simply return the failure status. The build recovery process will handle fixes separately.

      ${input.platform === 'iOS' ? this.msdkAppBuildExecutionIOS(input.projectPath, input.projectName) : this.msdkAppBuildExecutionAndroid(input.projectPath)}
      
    `;
  }

  private msdkAppBuildExecutionIOS(projectPath: string, projectName: string) {
    return dedent`  
      ## Build Execution Steps

      **Step 1:** Navigate to the project directory:
      \`\`\`bash
      cd ${projectPath}
      \`\`\`

      **Step 2:** Execute the build command (this is the ONLY command you should run):
      \`\`\`bash
      { xcodebuild -workspace ${projectName}.xcworkspace -scheme ${projectName} -destination 'generic/platform=iOS Simulator' clean build CONFIGURATION_BUILD_DIR="${this.tempDirManager.getAppArtifactRootPath(projectName)}" > "${this.tempDirManager.getIOSBuildOutputFilePath()}" 2>&1; echo $?; }
      \`\`\`
      
      **Step 3:** Check the exit code:
      - Exit code 0 = Build succeeded
      - Any other exit code = Build failed
      
      **Step 4:** Return the result IMMEDIATELY:
      - Set \`buildSuccessful\` to \`true\` if exit code is 0, \`false\` otherwise
      - If build failed (exit code is not 0), also set \`buildOutputFilePath\` to "${this.tempDirManager.getIOSBuildOutputFilePath()}"
      
      **STOP HERE.** Do not attempt to diagnose or fix any errors. Do not run any other commands.
    `;
  }

  private msdkAppBuildExecutionAndroid(projectPath: string) {
    return dedent`  
      ## Build Execution Steps

      **Step 1:** Navigate to the project directory:
      \`\`\`bash
      cd ${projectPath}
      \`\`\`

      **Step 2:** Execute the build command (this is the ONLY command you should run):
      \`\`\`bash
      { ./gradlew build > "${this.tempDirManager.getAndroidBuildOutputFilePath()}" 2>&1; echo $?; }
      \`\`\`
      
      **Step 3:** Check the exit code:
      - Exit code 0 = Build succeeded
      - Any other exit code = Build failed
      
      **Step 4:** Return the result IMMEDIATELY:
      - Set \`buildSuccessful\` to \`true\` if exit code is 0, \`false\` otherwise
      - If build failed (exit code is not 0), also set \`buildOutputFilePath\` to "${this.tempDirManager.getAndroidBuildOutputFilePath()}"
      
      **STOP HERE.** Do not attempt to diagnose or fix any errors. Do not run any other commands.
    `;
  }
}
