/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { Logger } from '@salesforce/magen-mcp-workflow';
import { BUILD_RECOVERY_TOOL, BuildRecoveryWorkflowInput } from './metadata.js';
import { AbstractNativeProjectManagerTool } from '../../base/abstractNativeProjectManagerTool.js';

export class SFMobileNativeBuildRecoveryTool extends AbstractNativeProjectManagerTool<
  typeof BUILD_RECOVERY_TOOL
> {
  constructor(server: McpServer, logger?: Logger) {
    super(server, BUILD_RECOVERY_TOOL, 'BuildRecoveryTool', logger);
  }

  public handleRequest = async (input: BuildRecoveryWorkflowInput) => {
    const guidance = this.generateRecoveryGuidance(input);

    const finalOutput = this.finalizeWorkflowToolOutput(guidance, input.workflowStateData);
    return finalOutput;
  };

  private generateRecoveryGuidance(input: BuildRecoveryWorkflowInput) {
    const platformSpecificIssues =
      input.platform === 'iOS' ? this.iosCommonIssues(input) : this.androidCommonIssues(input);

    const platformSpecificFiles =
      input.platform === 'iOS' ? this.iosCommonFiles() : this.androidCommonFiles();

    return dedent`
     You are a tech-adept agent acting on behalf of a user who is not familiar with the technical details of MSDK development.
     The build has failed (attempt #${input.attemptNumber}). Your task is to analyze the build errors and attempt to fix them. 

     IMPORTANT: you should not run the build as the build process is handled by a separate tool.

     # Salesforce Mobile App Build Recovery for ${input.platform}

     ## Project Path

     Path to the app project: \`${input.projectPath}\`

     You have full access to inspect and modify files in this project directory to fix build issues.

     ## Build Recovery Process

     The build has failed. Follow these steps to diagnose and fix the issues:

     ### Step 1: Analyze Build Output
     1. Read the build output file at "${input.buildOutputFilePath}"
     2. Look for error messages and warnings that indicate the root cause
     
     ### Step 2: Identify Common Issues
     ${platformSpecificIssues}

     ### Step 3: Apply Fixes
     1. Based on the errors identified, apply the appropriate fixes
     2. You have full access to inspect and modify project files
     3. Common files to check/modify:
     ${platformSpecificFiles}

     ### Step 4: Return Results
     Return a result with:
     - \`fixesAttempted\`: Array of strings describing what you fixed
     - \`readyForRetry\`: Set to \`true\` if you successfully applied fixes and believe the build should be retried
     - \`readyForRetry\`: Set to \`false\` if you cannot identify a fix or the errors are too complex to resolve automatically
    `;
  }

  private iosCommonIssues(input: BuildRecoveryWorkflowInput): string {
    return dedent`
      Common iOS build failures and their solutions:

      **Missing Dependencies or Pods:**
      - Look for errors like "No such module" or "framework not found"
      - Solution: Navigate to ${input.projectPath} and run \`pod install\`

      **Code Signing Issues:**
      - Look for errors mentioning "Code Signing" or "Provisioning Profile"
      - Solution: Check and update code signing settings in the Xcode project
      - For simulator builds, ensure "Sign to Run Locally" is selected

      **Swift/API Compatibility:**
      - Look for Swift compiler errors or deprecated API warnings
      - Solution: Update code to use current APIs or fix Swift syntax errors

      **Missing Files or Resources:**
      - Look for errors like "file not found" or "No such file or directory"
      - Solution: Verify all required files exist and are properly referenced in the project

      **Xcode Project Configuration:**
      - Look for errors about build settings or schemes
      - Solution: Check and fix project build settings, ensuring all paths are correct
    `;
  }

  private iosCommonFiles(): string {
    return dedent`
      - Podfile (for dependencies)
      - *.xcodeproj/project.pbxproj (for project settings)
      - Source code files (*.swift, *.m, *.h)
      - Info.plist and other configuration files
    `;
  }

  private androidCommonIssues(_input: BuildRecoveryWorkflowInput): string {
    return dedent`
      Common Android build failures and their solutions:

      **Gradle Dependency Issues:**
      - Look for errors like "Could not resolve dependency" or "Failed to download"
      - Solution: Update Gradle dependencies in build.gradle files or sync Gradle

      **SDK/Build Tools Version Mismatch:**
      - Look for errors mentioning SDK versions or build tools
      - Solution: Update compileSdkVersion, targetSdkVersion, or buildToolsVersion in build.gradle

      **Kotlin/Java Compilation Errors:**
      - Look for compilation errors in Kotlin or Java code
      - Solution: Fix syntax errors, missing imports, or type mismatches

      **Missing Permissions or Manifest Issues:**
      - Look for errors about AndroidManifest.xml
      - Solution: Check and fix manifest configuration

      **Resource Issues:**
      - Look for errors like "Resource not found" or layout/drawable issues
      - Solution: Verify all resources exist and are properly named

      **ProGuard/R8 Issues:**
      - Look for errors during code shrinking/obfuscation
      - Solution: Update ProGuard rules or disable for debug builds
    `;
  }

  private androidCommonFiles(): string {
    return dedent`
      - build.gradle (project and app level)
      - AndroidManifest.xml
      - gradle.properties
      - Source code files (*.kt, *.java)
      - Resource files (res/)
    `;
  }
}
