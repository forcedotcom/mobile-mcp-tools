/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PluginCheckNode } from '../../../src/workflow/nodes/checkPluginSetup.js';
import { createTestState } from '../../utils/stateBuilders.js';
import { MockLogger } from '../../utils/MockLogger.js';
import * as childProcess from 'child_process';

// Mock execSync
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('PluginCheckNode', () => {
  let node: PluginCheckNode;
  let mockLogger: MockLogger;
  let mockExecSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = new MockLogger();
    node = new PluginCheckNode(mockLogger);
    mockExecSync = vi.mocked(childProcess.execSync);
    mockExecSync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Helper to mock both plugins as valid
  const mockBothPluginsValid = () => {
    mockExecSync
      .mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
          type: 'jit',
        })
      )
      .mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
          type: 'jit',
        })
      );
  };

  describe('Constructor', () => {
    it('should initialize with correct node name', () => {
      expect(node.name).toBe('checkPluginSetup');
    });

    it('should extend BaseNode', () => {
      expect(node).toBeDefined();
      expect(node.name).toBeDefined();
      expect(node.execute).toBeDefined();
    });

    it('should create default logger when none provided', () => {
      const nodeWithoutLogger = new PluginCheckNode();
      expect(nodeWithoutLogger).toBeDefined();
    });

    it('should use provided logger', () => {
      const customLogger = new MockLogger();
      const nodeWithCustomLogger = new PluginCheckNode(customLogger);
      expect(nodeWithCustomLogger['logger']).toBe(customLogger);
    });
  });

  describe('execute() - Plugin Already Installed and Valid', () => {
    it('should handle both plugins installed with valid versions', () => {
      const inputState = createTestState({});

      // Mock both plugins as installed with valid versions
      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: 'sfdx-mobilesdk-plugin',
            version: '13.2.0-alpha.1',
            type: 'jit',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@salesforce/lwc-dev-mobile',
            version: '3.0.0-alpha.3',
            type: 'jit',
          })
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins inspect sfdx-mobilesdk-plugin --json', {
        encoding: 'utf-8',
        timeout: 10000,
      });
      expect(mockExecSync).toHaveBeenCalledWith(
        'sf plugins inspect @salesforce/lwc-dev-mobile --json',
        {
          encoding: 'utf-8',
          timeout: 10000,
        }
      );
    });

    it('should handle both plugins with versions higher than minimum', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: 'sfdx-mobilesdk-plugin',
            version: '14.0.0',
            type: 'jit',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@salesforce/lwc-dev-mobile',
            version: '4.0.0',
            type: 'jit',
          })
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle both plugins with complex version strings', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: 'sfdx-mobilesdk-plugin',
            version: '13.2.0-alpha.2',
            type: 'jit',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@salesforce/lwc-dev-mobile',
            version: '3.0.0-alpha.4',
            type: 'jit',
          })
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle plugin info with result wrapper', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            result: {
              name: 'sfdx-mobilesdk-plugin',
              version: '13.2.0-alpha.1',
              type: 'jit',
            },
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            result: {
              name: '@salesforce/lwc-dev-mobile',
              version: '3.0.0-alpha.3',
              type: 'jit',
            },
          })
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle plugin info as array', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify([
            {
              name: 'sfdx-mobilesdk-plugin',
              version: '13.2.0-alpha.1',
              type: 'jit',
            },
          ])
        )
        .mockReturnValueOnce(
          JSON.stringify([
            {
              name: '@salesforce/lwc-dev-mobile',
              version: '3.0.0-alpha.3',
              type: 'jit',
            },
          ])
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });
  });

  describe('execute() - Plugin Not Installed', () => {
    it('should install both plugins when not found', () => {
      const inputState = createTestState({});

      // First plugin: not installed, then install, then verify
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin: not installed, then install, then verify
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin@alpha', {
        encoding: 'utf-8',
        timeout: 60000,
      });
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install @salesforce/lwc-dev-mobile', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    });

    it('should log info when plugin not installed', () => {
      const inputState = createTestState({});

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const installLog = infoLogs.find(log =>
        log.message.includes('Plugin not installed, attempting installation')
      );
      expect(installLog).toBeDefined();
    });

    it('should handle installation failure', () => {
      const inputState = createTestState({});

      // First call fails (plugin not installed)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      // Second call fails (installation error)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Installation failed: network error');
      });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to install plugin');
      expect(result.workflowFatalErrorMessages![0]).toContain('network error');
    });

    it('should handle installed version below minimum', () => {
      const inputState = createTestState({});

      // First call fails (plugin not installed)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      // Second call installs plugin
      mockExecSync.mockImplementationOnce(() => '');

      // Third call returns old version
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('below minimum 13.2.0-alpha.1');
    });
  });

  describe('execute() - Plugin Version Too Old', () => {
    it('should upgrade plugin when version is below minimum', () => {
      const inputState = createTestState({});

      // First plugin: old version, upgrade, verify
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin is valid
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin@alpha', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    });

    it('should log info when upgrading plugin', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const upgradeLog = infoLogs.find(log =>
        log.message.includes(
          'Plugin version 12.0.0 is below minimum 13.2.0-alpha.1, attempting upgrade'
        )
      );
      expect(upgradeLog).toBeDefined();
    });

    it('should handle upgrade failure', () => {
      const inputState = createTestState({});

      // First call returns old version
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      // Second call fails (upgrade error)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Upgrade failed: permission denied');
      });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to upgrade plugin');
      expect(result.workflowFatalErrorMessages![0]).toContain('permission denied');
    });

    it('should handle upgrade that still results in old version', () => {
      const inputState = createTestState({});

      // First call returns old version
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      // Second call upgrades
      mockExecSync.mockImplementationOnce(() => '');

      // Third call still returns old version
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.5.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain(
        'Plugin upgraded but version 12.5.0 is still below minimum 13.2.0-alpha.1'
      );
    });
  });

  describe('execute() - Version Comparison', () => {
    it('should accept exact minimum alpha versions for both plugins', () => {
      const inputState = createTestState({});

      mockBothPluginsValid();

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept stable versions with same numeric part as minimum alpha', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: 'sfdx-mobilesdk-plugin',
            version: '13.2.0',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@salesforce/lwc-dev-mobile',
            version: '3.0.0',
          })
        );

      const result = node.execute(inputState);

      // Stable version (no prerelease) is greater than alpha version
      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher major versions (stable)', () => {
      const inputState = createTestState({});

      mockExecSync
        .mockReturnValueOnce(
          JSON.stringify({
            name: 'sfdx-mobilesdk-plugin',
            version: '14.0.0',
          })
        )
        .mockReturnValueOnce(
          JSON.stringify({
            name: '@salesforce/lwc-dev-mobile',
            version: '4.0.0',
          })
        );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher minor version (stable)', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.3.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher patch version (stable)', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.1',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher alpha version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.2',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher numeric version with alpha tag', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.3.0-alpha.1',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should reject lower major version', () => {
      const inputState = createTestState({});

      // First plugin: old version, upgrade, verify
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.9.9',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin is valid
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sf plugins install'),
        expect.any(Object)
      );
    });

    it('should reject lower minor version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.9',
        })
      );

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sf plugins install'),
        expect.any(Object)
      );
    });

    it('should reject lower alpha version with same numeric part', () => {
      const inputState = createTestState({});

      // First plugin: old alpha version, upgrade, verify
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin is valid
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sf plugins install'),
        expect.any(Object)
      );
    });

    it('should correctly compare numeric prerelease identifiers (alpha.10 > alpha.2)', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.10',
        })
      );

      const result = node.execute(inputState);

      // alpha.10 should be greater than minimum alpha.1
      expect(result.validPluginSetup).toBe(true);
    });

    it('should correctly compare alpha vs beta prerelease identifiers', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-beta.1',
        })
      );

      const result = node.execute(inputState);

      // beta.1 should be greater than minimum alpha.1 (lexicographically "beta" > "alpha")
      expect(result.validPluginSetup).toBe(true);
    });

    it('should correctly compare numeric vs non-numeric prerelease identifiers', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.beta',
        })
      );

      const result = node.execute(inputState);

      // alpha.beta should be greater than alpha.1 (non-numeric > numeric per SemVer)
      expect(result.validPluginSetup).toBe(true);
    });
  });

  describe('execute() - JSON Parsing Errors', () => {
    it('should handle invalid JSON from inspect command', () => {
      const inputState = createTestState({});

      // First call returns invalid JSON (not found)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Invalid JSON');
      });

      // Second call attempts install but fails with parse error
      mockExecSync.mockImplementationOnce(() => '');

      // Third call returns invalid JSON after install
      mockExecSync.mockReturnValue('This is not valid JSON');

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages![0]).toContain('Failed to install plugin');
    });

    it('should handle empty output', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue('');

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
    });

    it('should handle JSON missing required fields', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          // Missing version field
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
    });
  });

  describe('execute() - Logging', () => {
    it('should log debug message when checking plugins', () => {
      const inputState = createTestState({});

      mockBothPluginsValid();

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const checkLogs = debugLogs.filter(log =>
        log.message.includes('Checking plugin installation')
      );
      expect(checkLogs.length).toBe(2);
    });

    it('should log debug message when both plugin checks passed', () => {
      const inputState = createTestState({});

      mockBothPluginsValid();

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const passedLogs = debugLogs.filter(log => log.message.includes('Plugin check passed'));
      expect(passedLogs.length).toBe(2);
    });

    it('should log info when plugin installed successfully', () => {
      const inputState = createTestState({});

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const installLog = infoLogs.find(log =>
        log.message.includes('Plugin successfully installed')
      );
      expect(installLog).toBeDefined();
    });

    it('should log info when plugin upgraded successfully', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const upgradeLog = infoLogs.find(log => log.message.includes('Plugin successfully upgraded'));
      expect(upgradeLog).toBeDefined();
    });
  });

  describe('execute() - Return Value', () => {
    it('should return partial state object', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('validPluginSetup');
      expect(typeof result.validPluginSetup).toBe('boolean');
    });

    it('should return validPluginSetup true when both plugins succeed', () => {
      const inputState = createTestState({});

      mockBothPluginsValid();

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should return validPluginSetup false on failure', () => {
      const inputState = createTestState({});

      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
    });
  });

  describe('execute() - Edge Cases', () => {
    it('should handle version with only major number', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
    });

    it('should handle version with alpha/beta tags', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      const result = node.execute(inputState);

      // Should accept exact minimum alpha version
      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher alpha version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.2',
        })
      );

      const result = node.execute(inputState);

      // Should accept alpha version higher than minimum
      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept stable version higher than alpha minimum', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0',
        })
      );

      const result = node.execute(inputState);

      // Should accept stable version (no prerelease) as it's greater than alpha
      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept newer stable version (13.3.0) without alpha tag', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.3.0',
        })
      );

      const result = node.execute(inputState);

      // Should accept stable version higher than minimum alpha version
      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept newer stable version (14.0.0) without alpha tag', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '14.0.0',
        })
      );

      const result = node.execute(inputState);

      // Should accept stable version higher than minimum alpha version
      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle invalid version strings gracefully', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0.0.0.0', // Invalid SemVer (too many parts)
        })
      );

      const result = node.execute(inputState);

      // Should reject invalid versions (semver library will throw, caught by try-catch)
      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
    });
  });

  describe('execute() - Timeout Configuration', () => {
    it('should set timeout to 10000ms for inspect command', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(expect.any(String), {
        encoding: 'utf-8',
        timeout: 10000,
      });
    });

    it('should set timeout to 60000ms for install command', () => {
      const inputState = createTestState({});

      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin@alpha', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    });

    it('should set timeout to 60000ms for update command', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin@alpha', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    });
  });

  describe('execute() - Multi-Plugin Scenarios', () => {
    it('should return true only when both plugins are valid', () => {
      const inputState = createTestState({});

      mockBothPluginsValid();

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should return false when first plugin fails and second succeeds', () => {
      const inputState = createTestState({});

      // First plugin fails
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Installation failed');
      });

      // Second plugin succeeds
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages!.length).toBeGreaterThan(0);
      expect(result.workflowFatalErrorMessages![0]).toContain('sfdx-mobilesdk-plugin');
    });

    it('should return false when first plugin succeeds and second fails', () => {
      const inputState = createTestState({});

      // First plugin succeeds
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin fails
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Installation failed');
      });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages!.length).toBeGreaterThan(0);
      expect(result.workflowFatalErrorMessages![0]).toContain('@salesforce/lwc-dev-mobile');
    });

    it('should return false when both plugins fail', () => {
      const inputState = createTestState({});

      // Both plugins fail installation
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Plugin not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('Installation failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('Plugin not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('Installation failed');
        });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages!.length).toBe(2);
      expect(result.workflowFatalErrorMessages![0]).toContain('sfdx-mobilesdk-plugin');
      expect(result.workflowFatalErrorMessages![1]).toContain('@salesforce/lwc-dev-mobile');
    });

    it('should handle first plugin needs upgrade and second is valid', () => {
      const inputState = createTestState({});

      // First plugin needs upgrade
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin is valid
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle first plugin is valid and second needs upgrade', () => {
      const inputState = createTestState({});

      // First plugin is valid
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin needs upgrade
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '2.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle both plugins need installation', () => {
      const inputState = createTestState({});

      // First plugin: not installed, install, verify
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin: not installed, install, verify
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle both plugins need upgrade', () => {
      const inputState = createTestState({});

      // First plugin: old version, upgrade, verify
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0-alpha.1',
        })
      );

      // Second plugin: old version, upgrade, verify
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '2.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '3.0.0-alpha.3',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should aggregate error messages from multiple plugin failures', () => {
      const inputState = createTestState({});

      // First plugin: installation fails
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      // Second plugin: version too old and upgrade fails
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: '@salesforce/lwc-dev-mobile',
          version: '2.0.0',
        })
      );
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Upgrade failed');
      });

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(false);
      expect(result.workflowFatalErrorMessages).toBeDefined();
      expect(result.workflowFatalErrorMessages!.length).toBe(2);
      expect(result.workflowFatalErrorMessages![0]).toContain('sfdx-mobilesdk-plugin');
      expect(result.workflowFatalErrorMessages![1]).toContain('@salesforce/lwc-dev-mobile');
    });
  });
});
