import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import { BuildStrategy } from './buildStrategy.js';
import { BuildExecutorResult } from '../metadata.js';
import { TempDirectoryManager } from '../../../../common.js';
import { Logger } from '../../../../logging/logger.js';

export class AndroidBuildStrategy implements BuildStrategy {
  constructor(
    private readonly logger: Logger,
    private readonly tempDirManager: TempDirectoryManager
  ) {}

  public async build(
    projectPath: string,
    sendProgress: (message: string, progress: number, total: number) => Promise<void>
  ): Promise<BuildExecutorResult> {
    await sendProgress('Starting Android build...', 0, 100);

    const gradlewPath = path.join(projectPath, 'gradlew');

    if (!fs.existsSync(gradlewPath)) {
      return {
        success: false,
        message: 'Gradle wrapper not found',
        error: `gradlew not found at ${gradlewPath}`,
      };
    }

    // Make gradlew executable
    fs.chmodSync(gradlewPath, '755');

    await sendProgress('Building Android project...', 10, 100);
    const buildOutputFilePath = this.tempDirManager.getAndroidBuildOutputFilePath();

    return new Promise(resolve => {
      const buildProcess: ChildProcess = spawn('./gradlew', ['build'], {
        cwd: projectPath,
      });

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
          if (text.includes('preBuild')) {
            currentPhase = 'Running pre-build tasks';
            lastProgress = Math.max(lastProgress, 20);
          } else if (text.includes('compileDebugKotlin') || text.includes('compileKotlin')) {
            currentPhase = 'Compiling Kotlin';
            lastProgress = Math.max(lastProgress, 40);
          } else if (text.includes('compileDebugJavaWithJavac') || text.includes('compileJava')) {
            currentPhase = 'Compiling Java';
            lastProgress = Math.max(lastProgress, 50);
          } else if (text.includes('mergeDebugResources') || text.includes('mergeResources')) {
            currentPhase = 'Merging resources';
            lastProgress = Math.max(lastProgress, 60);
          } else if (text.includes('dexBuilder') || text.includes('mergeDex')) {
            currentPhase = 'Processing DEX files';
            lastProgress = Math.max(lastProgress, 75);
          } else if (text.includes('packageDebug') || text.includes('package')) {
            currentPhase = 'Packaging application';
            lastProgress = Math.max(lastProgress, 85);
          } else if (text.includes('BUILD SUCCESSFUL')) {
            currentPhase = 'Finalizing build';
            lastProgress = Math.max(lastProgress, 95);
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
          await sendProgress('Android build completed successfully!', 100, 100);
          this.logger.info('Android build successful');
          resolve({
            success: true,
            message: 'Android build completed successfully',
            output: output.substring(Math.max(0, output.length - 1000)),
          });
        } else {
          await sendProgress('Android build failed', 100, 100);
          const error = new Error(
            `Android build failed with exit code ${code}\nOutput: ${output}\nError: ${errorOutput}`
          );
          this.logger.error('Android build failed', error);
          resolve({
            success: false,
            message: `Android build failed with exit code ${code}`,
            output: output.substring(Math.max(0, output.length - 1000)),
            error: errorOutput.substring(Math.max(0, errorOutput.length - 1000)),
            buildOutputFilePath,
          });
        }
      });

      buildProcess.on('error', async (error: Error) => {
        outputFileStream.end();
        clearInterval(progressInterval);
        await sendProgress('Android build error', 100, 100);
        this.logger.error('Failed to start Android build', error);
        resolve({
          success: false,
          message: 'Failed to start Android build',
          error: error.message,
        });
      });
    });
  }
}
