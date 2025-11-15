import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  EvaluationResponse,
  calculateOverallScore,
  ScoreCategory,
  LwcEvaluatorAgent,
  determineVerdict,
} from '../../src/agent/lwcEvaluatorAgent.js';
import { LlmClient } from '../../src/llmclient/llmClient.js';
import { LwcCodeType } from '../../src/schema/schema.js';

function createEvaluationResponse(
  coreFunctionalityScore: ScoreCategory,
  errorHandlingScore: ScoreCategory,
  templateImplementationScore: ScoreCategory,
  javascriptImplementationScore: ScoreCategory,
  mobileCapabilitiesScore: ScoreCategory,
  performanceScore: ScoreCategory,
  securityScore: ScoreCategory,
  uiImplementationScore: ScoreCategory
): EvaluationResponse {
  return {
    functionalRequirements: {
      coreFunctionality: {
        score: coreFunctionalityScore,
        matches: [],
        mismatches: [],
      },
      errorHandling: { score: errorHandlingScore, matches: [], mismatches: [] },
    },
    codeQuality: {
      templateImplementation: {
        score: templateImplementationScore,
        matches: [],
        mismatches: [],
      },
      javascriptImplementation: {
        score: javascriptImplementationScore,
        matches: [],
        mismatches: [],
      },
      mobileCapabilities: {
        score: mobileCapabilitiesScore,
        matches: [],
        mismatches: [],
      },
    },
    performanceAndSecurity: {
      performance: { score: performanceScore, concerns: [] },
      security: { score: securityScore, concerns: [] },
    },
    userExperience: {
      uiImplementation: {
        score: uiImplementationScore,
        matches: [],
        mismatches: [],
      },
    },
    finalVerdict: 'Pass GA Criteria', // This is not used in the calculation
    justification: 'All scores are excellent',
  };
}

describe('LwcEvaluatorAgent tests', () => {
  describe('calculateOverallScore tests', () => {
    it(`should get 100 points if all scores are excellent`, () => {
      const evaluation = createEvaluationResponse(
        'Excellent',
        'Excellent',
        'Excellent',
        'Excellent',
        'Excellent',
        'Excellent',
        'Excellent',
        'Excellent'
      );
      expect(calculateOverallScore(evaluation)).toBe(100);
    });

    it(`should get 80 points if all scores are good`, () => {
      const evaluation = createEvaluationResponse(
        'Good',
        'Good',
        'Good',
        'Good',
        'Good',
        'Good',
        'Good',
        'Good'
      );
      expect(calculateOverallScore(evaluation)).toBe(80);
    });

    it(`should get 60 points if all scores are satisfactory`, () => {
      const evaluation = createEvaluationResponse(
        'Satisfactory',
        'Satisfactory',
        'Satisfactory',
        'Satisfactory',
        'Satisfactory',
        'Satisfactory',
        'Satisfactory',
        'Satisfactory'
      );
      expect(calculateOverallScore(evaluation)).toBe(60);
    });

    it(`should get 40 points if all scores are limited`, () => {
      const evaluation = createEvaluationResponse(
        'Limited',
        'Limited',
        'Limited',
        'Limited',
        'Limited',
        'Limited',
        'Limited',
        'Limited'
      );
      expect(calculateOverallScore(evaluation)).toBe(40);
    });

    it(`should get 20 points if all scores are poor`, () => {
      const evaluation = createEvaluationResponse(
        'Poor',
        'Poor',
        'Poor',
        'Poor',
        'Poor',
        'Poor',
        'Poor',
        'Poor'
      );
      expect(calculateOverallScore(evaluation)).toBe(20);
    });

    it(`should get 0 points if all scores are missing`, () => {
      const evaluation = createEvaluationResponse(
        'Missing',
        'Missing',
        'Missing',
        'Missing',
        'Missing',
        'Missing',
        'Missing',
        'Missing'
      );
      expect(calculateOverallScore(evaluation)).toBe(0);
    });
  });

  describe('determineVerdict tests', () => {
    it('should return "Pass GA Criteria" for score >= 85', () => {
      expect(determineVerdict(100)).toEqual({
        verdict: 'Pass GA Criteria',
        rawScore: 100,
      });
      expect(determineVerdict(85)).toEqual({
        verdict: 'Pass GA Criteria',
        rawScore: 85,
      });
    });

    it('should return "Pass Beta Criteria" for score >= 70 and < 85', () => {
      expect(determineVerdict(84)).toEqual({
        verdict: 'Pass Beta Criteria',
        rawScore: 84,
      });
      expect(determineVerdict(70)).toEqual({
        verdict: 'Pass Beta Criteria',
        rawScore: 70,
      });
    });

    it('should return "Pass Dev Preview Criteria" for score >= 55 and < 70', () => {
      expect(determineVerdict(69)).toEqual({
        verdict: 'Pass Dev Preview Criteria',
        rawScore: 69,
      });
      expect(determineVerdict(55)).toEqual({
        verdict: 'Pass Dev Preview Criteria',
        rawScore: 55,
      });
    });

    it('should return "FAIL" for score < 55', () => {
      expect(determineVerdict(54)).toEqual({
        verdict: 'FAIL',
        rawScore: 54,
      });
      expect(determineVerdict(0)).toEqual({
        verdict: 'FAIL',
        rawScore: 0,
      });
    });
  });

  describe('LwcEvaluatorAgent tests', () => {
    let mockLlmClient: LlmClient;
    let agent: LwcEvaluatorAgent;
    let mockComponent: LwcCodeType;

    beforeEach(() => {
      mockLlmClient = {
        callLLM: vi.fn(),
      } as unknown as LlmClient;
      agent = new LwcEvaluatorAgent(mockLlmClient);
      mockComponent = {
        name: 'testComponent',
        namespace: 'c',
        html: [{ path: 'testComponent.html', content: '<template></template>' }],
        js: [{ path: 'testComponent.js', content: 'export default class TestComponent {}' }],
        css: [],
      };
    });

    it('should evaluate components and return score', async () => {
      const mockResponse = JSON.stringify({
        functionalRequirements: {
          coreFunctionality: { score: 'Excellent', matches: [], mismatches: [] },
          errorHandling: { score: 'Excellent', matches: [], mismatches: [] },
        },
        codeQuality: {
          templateImplementation: { score: 'Excellent', matches: [], mismatches: [] },
          javascriptImplementation: { score: 'Excellent', matches: [], mismatches: [] },
          mobileCapabilities: { score: 'Excellent', matches: [], mismatches: [] },
        },
        performanceAndSecurity: {
          performance: { score: 'Excellent', concerns: [] },
          security: { score: 'Excellent', concerns: [] },
        },
        userExperience: {
          uiImplementation: { score: 'Excellent', matches: [], mismatches: [] },
        },
        finalVerdict: 'Pass GA Criteria',
        justification:
          'Excellent implementation across all criteria with comprehensive test coverage and proper error handling patterns',
      });

      vi.mocked(mockLlmClient.callLLM).mockResolvedValue(mockResponse);

      const result = await agent.evaluate(mockComponent, mockComponent);

      expect(result).toEqual({
        verdict: 'Pass GA Criteria',
        rawScore: 100,
      });
      expect(mockLlmClient.callLLM).toHaveBeenCalledOnce();
    });

    it('should handle parsing errors gracefully', async () => {
      vi.mocked(mockLlmClient.callLLM).mockResolvedValue('invalid json');

      await expect(agent.evaluate(mockComponent, mockComponent)).rejects.toThrow(
        'Failed to parse LLM response as valid evaluation data'
      );
    });

    it('should handle LLM errors', async () => {
      vi.mocked(mockLlmClient.callLLM).mockRejectedValue(new Error('LLM API error'));

      await expect(agent.evaluate(mockComponent, mockComponent)).rejects.toThrow('LLM API error');
    });
  });
});
