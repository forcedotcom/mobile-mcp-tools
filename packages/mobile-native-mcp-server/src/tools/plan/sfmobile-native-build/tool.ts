import { Tool } from '../../tool.js';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import dedent from 'dedent';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

const BuildInputSchema = z.object({
  platform: z.enum(['iOS', 'Android']).describe('Target mobile platform'),
  projectPath: z.string().describe('Path to the project'),
});

type BuildInput = z.infer<typeof BuildInputSchema>;

export class SfmobileNativeBuildTool implements Tool {
  readonly name = 'Salesforce Mobile App Build Tool';
  readonly title = 'Salesforce Mobile app build guide';
  readonly description =
    'Guides LLM through the process of building a Salesforce mobile app with target platform';
  public readonly toolId = 'sfmobile-native-build';
  readonly inputSchema = BuildInputSchema;
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

  private async handleRequest(input: BuildInput) {
    const guidance = this.generateBuildGuidance(input);

    return {
      content: [
        {
          type: 'text' as const,
          text: guidance,
        },
      ],
    };
  }

  private generateBuildGuidance(input: BuildInput) {
    return dedent`
     You are a tech-adept agent acting on behalf of a user who is not familiar with the technical details of MSDK development. 
     Carry out the steps in the following guideline for them, and share the key outcomes they need to know.

     # Salesforce Mobile App Build Guidance for ${input.platform}
      


      You MUST follow the steps in this guide in order. Do not execute any commands that are not part of the steps in this guide.

      ${input.platform === 'iOS' ? this.msdkAppBuildRequirementsIOS() : this.msdkAppBuildRequirementsAndroid()}

      ${input.platform === 'iOS' ? this.msdkAppBuildExecutionIOS(input.projectPath) : this.msdkAppBuildExecutionAndroid(input.projectPath)}

      ${this.generateNextStepsSection()}
      
    `;
  }

  private msdkAppBuildRequirementsIOS() {
    return dedent`
      ## Step 1: iOS Build Requirements
      First, verify the XCode Command Line Tools are installed correctly. ONLY run this command to verify the XCode Command Line Tools are installed:

      \`\`\`bash
      xcodebuild -version
      \`\`\`

      If the XCode Command Line Tools are not installed, install them:

      \`\`\`bash
      xcode-select --install
      \`\`\`

      Secondly, verify that deployment target is set to iOS 17.0 or greater for the MSDK iOS App. ONLY run this command to verify the deployment target is set to iOS 17.0 or greater:

      \`\`\`bash
      xcodebuild -showBuildSettings | grep -A 1 'IPHONEOS_DEPLOYMENT_TARGET'
      \`\`\`

      Third, confirm that a list of simulators is available as build destinations, with at least one running iOS 17.0 or greater. Run this command only for verification purposes:

      \`\`\`bash
      sf force lightning local device list -p ios
      \`\`\`

      If no iOS 17.0 or greater simulator is present, run this command to install the simulators:

      \`\`\`bash
       sf force lightning local device create -p ios -n device-name -d device-model
      \`\`\`
      
    `;
  }

  private msdkAppBuildRequirementsAndroid() {
    return dedent`  
      ## Step 1: Android Build Requirements
      First, verify JDK is installed correctly. ONLY run this command to verify the JDK is installed:

      \`\`\`bash
      java -version
      \`\`\`

      Secondly, confirm that the Android SDK is installed correctly.The SDK Build-Tools version must match the version required by the MSDK Android App. Use the following command only to verify the Android SDK installation:

      \`\`\`bash
      echo $ANDROID_HOME
      \`\`\`

      Thirdly, verify Android Gradle plugin is defined in the project level build.gradle file.
    `;
  }

  private msdkAppBuildExecutionIOS(projectPath: string) {
    return dedent`  
      ## Step 2: iOS Build Execution
      Navigate to the ${projectPath} directory and run the following command to build the MSDK iOS App:

      \`\`\`bash
      xcodebuild -workspace <your-workspace>.xcworkspace -scheme <your-scheme> -destination <simulator-destination> clean build
      \`\`\`

      Replace <your-workspace>.xcworkspace and <your-scheme> with the actual workspace and scheme names of your project. Ensure that <simulator-destination>  points to a valid simulator running iOS 17.0 or greater.

      If the output includes **BUILD SUCCEEDED**, the build completed successfully. If you see errors such as **error:** or **Undefined symbol**, resolve them and try again. Refer back to Step 1 for guidance on fixing setup issues.
      
      
    `;
  }

  private msdkAppBuildExecutionAndroid(projectPath: string) {
    return dedent`  
      ## Step 2: Android Build Execution
      Navigate to the ${projectPath} directory and use the following command to build the MSDK Android App:

      \`\`\`bash
      ./gradlew build
      \`\`\`

      If **BUILD SUCCESSFUL** is shown as the output, the build is successful. If there are build errors like **FAILURE:Build failed**, please fix them and retry the build. Refer to the step 1 to fix the setup issues.
    `;
  }

  private generateNextStepsSection(): string {
    return dedent`
      ## Next Steps

      Once you've build successfully:
      1. Call the \`sfmobile-native-deployment\` tool to deploy the app to the target platform. If the target is iOS, be sure to use the simulator/emulator ID from step 1.
    `;
  }
}
