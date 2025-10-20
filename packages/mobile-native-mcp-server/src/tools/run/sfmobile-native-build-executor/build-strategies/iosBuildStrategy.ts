import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import { BuildStrategy } from './buildStrategy.js';
import { BuildExecutorResult } from '../metadata.js';
import { TempDirectoryManager } from '../../../../common.js';
import { Logger } from '../../../../logging/logger.js';

export class IOSBuildStrategy implements BuildStrategy {
  constructor(
    private readonly logger: Logger,
    private readonly tempDirManager: TempDirectoryManager
  ) {}

  public async build(
    projectPath: string,
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<BuildExecutorResult> {
    await sendProgress('Starting iOS build...', 0, 100);

    // Find workspace or xcodeproj
    const projectFiles = fs.readdirSync(projectPath);
    const workspace = projectFiles.find(f => f.endsWith('.xcworkspace'));
    const xcodeproj = projectFiles.find(f => f.endsWith('.xcodeproj'));

    if (!workspace && !xcodeproj) {
      return {
        success: false,
        message: 'No Xcode workspace or project found',
        error: 'Could not find .xcworkspace or .xcodeproj file',
      };
    }

    const projectFile = workspace ?? xcodeproj;
    if (!projectFile) {
      return {
        success: false,
        message: 'No Xcode workspace or project found',
        error: 'Could not find project file',
      };
    }

    const projectFlag = workspace ? '-workspace' : '-project';

    // Get scheme - try to find the first scheme
    const schemePath = workspace
      ? path.join(projectPath, workspace, 'xcshareddata', 'xcschemes')
      : path.join(projectPath, xcodeproj!, 'xcshareddata', 'xcschemes');

    let scheme = '';
    if (fs.existsSync(schemePath)) {
      const schemes = fs.readdirSync(schemePath).filter(f => f.endsWith('.xcscheme'));
      if (schemes.length > 0) {
        scheme = schemes[0].replace('.xcscheme', '');
      }
    }

    if (!scheme) {
      // Fallback: use the project name without extension
      scheme = projectFile.replace(/\.(xcworkspace|xcodeproj)$/, '');
    }

    await sendProgress(`Building iOS project with scheme: ${scheme}`, 10, 100);
    const buildOutputFilePath = this.tempDirManager.getIOSBuildOutputFilePath();

    return new Promise(resolve => {
      const buildProcess: ChildProcess = spawn(
        'xcodebuild',
        [
          projectFlag,
          projectFile,
          '-scheme',
          scheme,
          '-destination',
          'generic/platform=iOS Simulator',
          'clean',
          'build',
        ],
        {
          cwd: projectPath,
        }
      );

      let output = '';
      let errorOutput = '';
      const outputFileStream = fs.createWriteStream(buildOutputFilePath);

      let lastProgress = 10;
      let currentPhase = 'Building';
      let lastProgressUpdate = Date.now();
      const MIN_PROGRESS_INTERVAL = 2000; // Send progress at least every 2 seconds

      // Set up interval timer to ensure progress updates even during long phases
      const progressInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress slowly to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
            await sendProgress(`${currentPhase}...`, lastProgress, 100);
            lastProgressUpdate = now;
          }
        }
      }, MIN_PROGRESS_INTERVAL);

      buildProcess.stdout?.on('data', async (data: Buffer) => {
        const text = data.toString();
        output += text;
        outputFileStream.write(text);
        this.logger.debug('Build output:', { output: text });

        const now = Date.now();
        // Send progress update on any output if enough time has passed
        if (now - lastProgressUpdate > MIN_PROGRESS_INTERVAL) {
          // Increment progress to show activity
          if (lastProgress < 95) {
            lastProgress = Math.min(95, lastProgress + 1);
          }

          // Detect build phase for better messaging
          if (text.includes('Build settings')) {
            currentPhase = 'Preparing build settings';
            lastProgress = Math.max(lastProgress, 20);
          } else if (text.includes('CompileSwift') || text.includes('CompileSwiftSources')) {
            currentPhase = 'Compiling Swift files';
            lastProgress = Math.max(lastProgress, 40);
          } else if (text.includes('CompileC')) {
            currentPhase = 'Compiling source files';
            lastProgress = Math.max(lastProgress, 45);
          } else if (text.includes('Ld ') || text.includes('Link ')) {
            currentPhase = 'Linking';
            lastProgress = Math.max(lastProgress, 70);
          } else if (text.includes('CodeSign')) {
            currentPhase = 'Code signing';
            lastProgress = Math.max(lastProgress, 90);
          } else if (text.includes('ProcessInfoPlistFile')) {
            currentPhase = 'Processing Info.plist';
            lastProgress = Math.max(lastProgress, 30);
          }

          await sendProgress(`${currentPhase}...`, lastProgress, 100);
          lastProgressUpdate = now;
        }
      });

      buildProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        outputFileStream.write(text);
        this.logger.debug('Build error output:', { error: data.toString() });
      });

      buildProcess.on('close', async (code: number | null) => {
        outputFileStream.end();
        clearInterval(progressInterval);
        if (code === 0) {
          await sendProgress('iOS build completed successfully!', 100, 100);
          this.logger.info('iOS build successful');
          resolve({
            success: true,
            message: 'iOS build completed successfully',
            output: output.substring(Math.max(0, output.length - 1000)), // Last 1000 chars
          });
        } else {
          await sendProgress('iOS build failed', 100, 100);
          const error = new Error(
            `iOS build failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`
          );
          this.logger.error('iOS build failed', error);
          resolve({
            success: false,
            message: `iOS build failed with exit code ${code}`,
            output: output.substring(Math.max(0, output.length - 1000)),
            error: errorOutput.substring(Math.max(0, errorOutput.length - 1000)),
            buildOutputFilePath,
          });
        }
      });

      buildProcess.on('error', async (error: Error) => {
        outputFileStream.end();
        clearInterval(progressInterval);
        await sendProgress('iOS build error', 100, 100);
        this.logger.error('Failed to start iOS build', error);
        resolve({
          success: false,
          message: 'Failed to start iOS build',
          error: error.message,
        });
      });
    });
  }
}
