import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { LwcEvaluatorAgent, Score } from './lwcEvaluatorAgent.js';
import LwcComponentAgent from './lwcComponentAgent.js';
import { loadTrainingUnit } from '../utils/lwcUtils.js';
import { LlmClient } from '../llmclient/llmClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EVAL_DATA_FOLDER = join(__dirname, '../../dataset');

/**
 * This class calls the judge model to evaluate the quality of
 * the LWC component generated by the modelToEval against
 * the reference LWC in the training data
 */
export class Evaluator {
  private readonly evaluatorAgent: LwcEvaluatorAgent;
  private readonly componentAgent: LwcComponentAgent;

  constructor() {
    // Check judge model environment variables are set
    if (
      !process.env.JUDGE_MODEL ||
      !process.env.JUDGE_MODEL_PROVIDER ||
      !process.env.JUDGE_MODEL_API_KEY ||
      !process.env.JUDGE_MODEL_BASE_URL ||
      !process.env.JUDGE_MODEL_CLIENT_FEATURE_ID ||
      !process.env.JUDGE_MODEL_TENANT_ID
    ) {
      throw new Error(
        'JUDGE_MODEL, JUDGE_PROVIDER, JUDGE_MODEL_API_KEY, JUDGE_MODEL_BASE_URL, JUDGE_MODEL_CLIENT_FEATURE_ID, and JUDGE_MODEL_TENANT_ID must be set'
      );
    }
    const evaluatorLlmClient = new LlmClient({
      model: process.env.JUDGE_MODEL,
      provider: process.env.JUDGE_MODEL_PROVIDER,
      apiKey: process.env.JUDGE_MODEL_API_KEY,
      baseUrl: process.env.JUDGE_MODEL_BASE_URL,
      clientFeatureID: process.env.JUDGE_MODEL_CLIENT_FEATURE_ID,
      tenantId: process.env.JUDGE_MODEL_TENANT_ID,
    });
    this.evaluatorAgent = new LwcEvaluatorAgent(evaluatorLlmClient);

    // Check environment variables for model to eval are set
    if (
      !process.env.MODEL_TO_EVAL ||
      !process.env.MODEL_TO_EVAL_PROVIDER ||
      !process.env.MODEL_TO_EVAL_API_KEY ||
      !process.env.MODEL_TO_EVAL_BASE_URL ||
      !process.env.MODEL_TO_EVAL_CLIENT_FEATURE_ID ||
      !process.env.MODEL_TO_EVAL_TENANT_ID
    ) {
      throw new Error(
        'MODEL_TO_EVAL, MODEL_TO_EVAL_PROVIDER, MODEL_TO_EVAL_API_KEY, MODEL_TO_EVAL_BASE_URL, MODEL_TO_EVAL_CLIENT_FEATURE_ID, and MODEL_TO_EVAL_TENANT_ID must be set'
      );
    }
    const componentLlmClient = new LlmClient({
      model: process.env.MODEL_TO_EVAL,
      provider: process.env.MODEL_TO_EVAL_PROVIDER,
      apiKey: process.env.MODEL_TO_EVAL_API_KEY,
      baseUrl: process.env.MODEL_TO_EVAL_BASE_URL,
      clientFeatureID: process.env.MODEL_TO_EVAL_CLIENT_FEATURE_ID,
      tenantId: process.env.MODEL_TO_EVAL_TENANT_ID,
    });
    this.componentAgent = new LwcComponentAgent(evaluatorLlmClient);
  }

  async evaluate(componentName: string): Promise<Score> {
    const componentPath = join(EVAL_DATA_FOLDER, componentName);
    const trainingUnit = await loadTrainingUnit(componentPath);
    if (!trainingUnit) {
      throw new Error(`Training unit not found for component ${componentName}`);
    }
    const resultLwc = await this.componentAgent.generateLwcComponent(trainingUnit.query);
    return await this.evaluatorAgent.evaluate(trainingUnit.answer, resultLwc);
  }
}
