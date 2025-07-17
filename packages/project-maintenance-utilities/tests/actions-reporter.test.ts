import { describe, it, expect, beforeEach } from 'vitest';
import { ActionsReporter } from '../src/actions-reporter.js';
import { MockActionsService } from './mocks/index.js';

describe('ActionsReporter', () => {
  let actionsReporter: ActionsReporter;
  let mockActions: MockActionsService;

  beforeEach(() => {
    mockActions = new MockActionsService();
    actionsReporter = new ActionsReporter(mockActions);
  });

  describe('info', () => {
    it('should log info message', () => {
      actionsReporter.info('Test info message');

      expect(mockActions.getInfoMessages()).toContain('Test info message');
    });

    it('should handle multiple info messages', () => {
      actionsReporter.info('First message');
      actionsReporter.info('Second message');

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('First message');
      expect(infoMessages).toContain('Second message');
      expect(infoMessages).toHaveLength(2);
    });
  });

  describe('warning', () => {
    it('should log warning message', () => {
      actionsReporter.warning('Test warning message');

      expect(mockActions.getWarningMessages()).toContain('Test warning message');
    });

    it('should handle multiple warning messages', () => {
      actionsReporter.warning('First warning');
      actionsReporter.warning('Second warning');

      const warningMessages = mockActions.getWarningMessages();
      expect(warningMessages).toContain('First warning');
      expect(warningMessages).toContain('Second warning');
      expect(warningMessages).toHaveLength(2);
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      actionsReporter.error('Test error message');

      expect(mockActions.getErrorMessages()).toContain('Test error message');
    });

    it('should handle multiple error messages', () => {
      actionsReporter.error('First error');
      actionsReporter.error('Second error');

      const errorMessages = mockActions.getErrorMessages();
      expect(errorMessages).toContain('First error');
      expect(errorMessages).toContain('Second error');
      expect(errorMessages).toHaveLength(2);
    });
  });

  describe('setOutput', () => {
    it('should set output value', () => {
      actionsReporter.setOutput('test_output', 'test_value');

      expect(mockActions.getOutput('test_output')).toBe('test_value');
    });

    it('should handle multiple outputs', () => {
      actionsReporter.setOutput('output1', 'value1');
      actionsReporter.setOutput('output2', 'value2');

      expect(mockActions.getOutput('output1')).toBe('value1');
      expect(mockActions.getOutput('output2')).toBe('value2');
    });

    it('should overwrite existing output', () => {
      actionsReporter.setOutput('test_output', 'initial_value');
      actionsReporter.setOutput('test_output', 'updated_value');

      expect(mockActions.getOutput('test_output')).toBe('updated_value');
    });
  });

  describe('exportVariable', () => {
    it('should export variable', () => {
      actionsReporter.exportVariable('TEST_VAR', 'test_value');

      expect(mockActions.getVariable('TEST_VAR')).toBe('test_value');
    });

    it('should handle multiple variables', () => {
      actionsReporter.exportVariable('VAR1', 'value1');
      actionsReporter.exportVariable('VAR2', 'value2');

      expect(mockActions.getVariable('VAR1')).toBe('value1');
      expect(mockActions.getVariable('VAR2')).toBe('value2');
    });
  });

  describe('setFailed', () => {
    it('should set failure message', () => {
      actionsReporter.setFailed('Test failure message');

      expect(mockActions.getFailureMessage()).toBe('Test failure message');
      expect(mockActions.hasFailed()).toBe(true);
    });

    it('should overwrite previous failure message', () => {
      actionsReporter.setFailed('First failure');
      actionsReporter.setFailed('Second failure');

      expect(mockActions.getFailureMessage()).toBe('Second failure');
    });
  });

  describe('step', () => {
    it('should log step as info message', () => {
      actionsReporter.step('Starting deployment');

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('🔄 Starting deployment');
    });

    it('should format step message correctly', () => {
      actionsReporter.step('Running tests');

      expect(mockActions.getInfoMessages()).toContain('🔄 Running tests');
    });
  });

  describe('success', () => {
    it('should log success as info message', () => {
      actionsReporter.success('Deployment completed');

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('✅ Deployment completed');
    });

    it('should format success message correctly', () => {
      actionsReporter.success('Tests passed');

      expect(mockActions.getInfoMessages()).toContain('✅ Tests passed');
    });
  });

  describe('packageInfo', () => {
    it('should log package information', () => {
      const packageInfo = {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tagPrefix: 'test-package',
      };

      actionsReporter.packageInfo(packageInfo);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('📦 Package: @test/package');
      expect(infoMessages).toContain('🔢 Version: 1.0.0');
      expect(infoMessages).toContain('🏷️  Tag: test-package_v1.0.0');
    });
  });

  describe('releaseInfo', () => {
    it('should log release information', () => {
      const releaseInfo = {
        packageFullName: '@test/package',
        version: '1.0.0',
        tagName: 'test-package_v1.0.0',
        tarballName: 'test-package-1.0.0.tgz',
      };

      actionsReporter.releaseInfo(releaseInfo);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('📋 Release Details:');
      expect(infoMessages).toContain('  Package: @test/package');
      expect(infoMessages).toContain('  Version: 1.0.0');
      expect(infoMessages).toContain('  Tag: test-package_v1.0.0');
      expect(infoMessages).toContain('  Tarball: test-package-1.0.0.tgz');
    });
  });

  describe('links', () => {
    it('should log links', () => {
      const links = {
        'Release URL': 'https://github.com/owner/repo/releases/tag/v1.0.0',
        'NPM Package': 'https://www.npmjs.com/package/@test/package',
      };

      actionsReporter.links(links);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('🔗 Links:');
      expect(infoMessages).toContain(
        '  Release URL: https://github.com/owner/repo/releases/tag/v1.0.0'
      );
      expect(infoMessages).toContain('  NPM Package: https://www.npmjs.com/package/@test/package');
    });

    it('should handle empty links object', () => {
      actionsReporter.links({});

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('🔗 Links:');
      expect(infoMessages).toHaveLength(2); // Empty string + header message
    });

    it('should handle single link', () => {
      const links = {
        Documentation: 'https://docs.example.com',
      };

      actionsReporter.links(links);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('🔗 Links:');
      expect(infoMessages).toContain('  Documentation: https://docs.example.com');
    });
  });

  describe('nextSteps', () => {
    it('should log next steps', () => {
      const steps = [
        'Download and test the package',
        'Run integration tests',
        'Deploy to production',
      ];

      actionsReporter.nextSteps(steps);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('📋 Next Steps:');
      expect(infoMessages).toContain('1. Download and test the package');
      expect(infoMessages).toContain('2. Run integration tests');
      expect(infoMessages).toContain('3. Deploy to production');
    });

    it('should handle empty steps array', () => {
      actionsReporter.nextSteps([]);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('📋 Next Steps:');
      expect(infoMessages).toHaveLength(2); // Empty string + header message
    });

    it('should handle single step', () => {
      actionsReporter.nextSteps(['Complete the release']);

      const infoMessages = mockActions.getInfoMessages();
      expect(infoMessages).toContain('📋 Next Steps:');
      expect(infoMessages).toContain('1. Complete the release');
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed logging operations', () => {
      actionsReporter.step('Starting process');
      actionsReporter.info('Processing data');
      actionsReporter.warning('Minor issue detected');
      actionsReporter.success('Process completed');
      actionsReporter.setOutput('result', 'success');
      actionsReporter.exportVariable('PROCESS_STATUS', 'completed');

      expect(mockActions.getInfoMessages()).toHaveLength(3); // step, info, success
      expect(mockActions.getWarningMessages()).toHaveLength(1);
      expect(mockActions.getOutput('result')).toBe('success');
      expect(mockActions.getVariable('PROCESS_STATUS')).toBe('completed');
      expect(mockActions.hasFailed()).toBe(false);
    });

    it('should handle failure scenario', () => {
      actionsReporter.step('Starting process');
      actionsReporter.error('Critical error occurred');
      actionsReporter.setFailed('Process failed due to critical error');

      expect(mockActions.getInfoMessages()).toContain('🔄 Starting process');
      expect(mockActions.getErrorMessages()).toContain('Critical error occurred');
      expect(mockActions.getFailureMessage()).toBe('Process failed due to critical error');
      expect(mockActions.hasFailed()).toBe(true);
    });
  });
});
