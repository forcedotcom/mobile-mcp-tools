/** Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 **/

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'node:fs/promises';
import { Evaluator } from '../evaluation/evaluator.js';
import { Score } from '../evaluation/lwcEvaluatorAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface EvaluationResult {
  componentName: string;
  score?: Score;
  error?: string;
}

export interface EvaluationSummary {
  totalComponents: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  averageScore: number;
  results: EvaluationResult[];
}

//
export async function getAvailableComponents(): Promise<string[]> {
  const subDir = 'mobile-web';
  const datasetPath = join(__dirname, `../../dataset/${subDir}`);
  try {
    const entries = await readdir(datasetPath, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => `${subDir}/${entry.name}`);
  } catch (error) {
    console.error('Error reading dataset directory:', error);
    return [];
  }
}

export async function evaluateComponent(
  evaluator: Evaluator,
  componentName: string
): Promise<EvaluationResult> {
  try {
    console.log(`\n🔍 Evaluating component: ${componentName}`);
    const score = await evaluator.evaluate(componentName);

    console.log(
      `${score.verdict == 'FAIL' ? '❌' : '✅'} ${componentName} - Verdict: ${score.verdict}, Score: ${score.rawScore}/100`
    );

    return {
      componentName,
      score,
    };
  } catch (error) {
    console.error(`❌ Error evaluating ${componentName}:`, error);
    return {
      componentName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function printSummary(summary: EvaluationSummary): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EVALUATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Components: ${summary.totalComponents}`);
  console.log(`Successful Evaluations: ${summary.successfulEvaluations}`);
  console.log(`Failed Evaluations: ${summary.failedEvaluations}`);
  console.log(`Average Score: ${summary.averageScore.toFixed(2)}/10`);

  if (summary.results.length > 0) {
    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(60));
    summary.results.forEach(result => {
      const status = result.error || result.score?.verdict == 'FAIL' ? '❌ FAILED' : '✅ PASSED';
      console.log(`${status} ${result.componentName}: ${result.score?.rawScore}/100`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
}

export async function runEvaluation(componentNames?: string[]): Promise<void> {
  console.log('🚀 Starting LWC Component Evaluation');
  console.log('='.repeat(60));

  let evaluator: Evaluator | null = null;

  // Set a timeout to ensure the process doesn't hang indefinitely
  const timeout = setTimeout(
    () => {
      console.error('⏰ Evaluation timed out after 10 minutes');
      process.exit(1);
    },
    10 * 60 * 1000 // 10 minutes
  );

  // Add process exit handlers for debugging
  const exitHandler = (code: number) => {
    console.log(`🔄 Process exiting with code: ${code}`);
  };
  process.on('exit', exitHandler);

  try {
    // Initialize evaluator
    console.log('🔧 Initializing evaluator...');
    evaluator = await Evaluator.create();
    console.log('✅ Evaluator initialized successfully');

    // Get components to evaluate
    let componentsToEvaluate: string[];
    if (componentNames && componentNames.length > 0) {
      componentsToEvaluate = componentNames;
      console.log(`📝 Evaluating specified components: ${componentsToEvaluate.join(', ')}`);
    } else {
      componentsToEvaluate = await getAvailableComponents();
      console.log(
        `📝 Found ${componentsToEvaluate.length} components to evaluate: ${componentsToEvaluate.join(', ')}`
      );
    }

    if (componentsToEvaluate.length === 0) {
      console.log('⚠️  No components found to evaluate');
      return;
    }

    // Run evaluations
    const results: EvaluationResult[] = [];
    for (const componentName of componentsToEvaluate) {
      const result = await evaluateComponent(evaluator, componentName);
      results.push(result);
    }

    // Calculate summary
    const successfulResults = results.filter(r => !r.error && r.score?.verdict != 'FAIL');
    const failedResults = results.filter(r => r.error || r.score?.verdict == 'FAIL');
    const averageScore =
      successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.score!.rawScore, 0) /
          successfulResults.length
        : 0;

    const summary: EvaluationSummary = {
      totalComponents: componentsToEvaluate.length,
      successfulEvaluations: successfulResults.length,
      failedEvaluations: failedResults.length,
      averageScore,
      results,
    };

    printSummary(summary);
  } catch (error) {
    console.error('💥 Fatal error during evaluation:', error);
    throw error;
  } finally {
    // Clear the timeout
    clearTimeout(timeout);

    // Remove exit handler
    process.off('exit', exitHandler);

    if (evaluator) {
      console.log('\n🧹 Cleaning up...');
      try {
        await evaluator.destroy();
        console.log('✅ Cleanup completed');
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }
    }
  }
}

export function printUsage(): void {
  console.log(`
Usage: tsx run-evaluation.ts [options] [component-names...]

Options:
  --help, -h     Show this help message

Examples:
  # Evaluate all available components
  tsx run-evaluation.ts
  
  # Evaluate specific components
  tsx run-evaluation.ts qrCodeOnlyScanner
  
  # Evaluate multiple components
  tsx run-evaluation.ts qrCodeOnlyScanner anotherComponent

Environment Variables Required:
  JUDGE_MODEL                    - Model name for evaluation
  JUDGE_MODEL_PROVIDER          - Provider for judge model
  JUDGE_MODEL_API_KEY           - API key for judge model
  JUDGE_MODEL_BASE_URL          - Base URL for judge model
  JUDGE_MODEL_CLIENT_FEATURE_ID - Client feature ID for judge model
  JUDGE_MODEL_TENANT_ID         - Tenant ID for judge model
  MODEL_TO_EVAL                 - Model name to evaluate
  MODEL_TO_EVAL_PROVIDER        - Provider for model to evaluate
  MODEL_TO_EVAL_API_KEY         - API key for model to evaluate
  MODEL_TO_EVAL_BASE_URL        - Base URL for model to evaluate
  MODEL_TO_EVAL_CLIENT_FEATURE_ID - Client feature ID for model to evaluate
  MODEL_TO_EVAL_TENANT_ID       - Tenant ID for model to evaluate
`);
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return; // Return early to prevent further execution
  }

  // Extract component names (any non-flag arguments)
  const componentNames = args.filter(arg => !arg.startsWith('--'));

  await runEvaluation(componentNames.length > 0 ? componentNames : undefined);
}

// Run the script
main()
  .catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  })
  .finally(() => {
    // Force exit after a short delay to ensure cleanup completes
    setTimeout(() => {
      console.log('🔄 Forcing process exit...');
      process.exit(0);
    }, 1000);
  });
