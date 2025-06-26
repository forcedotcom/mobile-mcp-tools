import { describe, expect, it } from 'vitest';
import {
  EvaluationResponse,
  calculateOverallScore,
  ScoreCategory,
} from '../../src/evaluation/lwcEvaluatorAgent.js';

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
});
