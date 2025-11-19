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
    it('should handle plugin installed with valid version', () => {
      const inputState = createTestState({});

      const mockOutput = JSON.stringify({
        name: 'sfdx-mobilesdk-plugin',
        version: '13.1.0',
        type: 'jit',
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins inspect sfdx-mobilesdk-plugin --json', {
        encoding: 'utf-8',
        timeout: 10000,
      });
    });

    it('should handle plugin with version higher than minimum', () => {
      const inputState = createTestState({});

      const mockOutput = JSON.stringify({
        name: 'sfdx-mobilesdk-plugin',
        version: '14.0.0',
        type: 'jit',
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(result.workflowFatalErrorMessages).toBeUndefined();
    });

    it('should handle plugin with complex version string', () => {
      const inputState = createTestState({});

      const mockOutput = JSON.stringify({
        name: 'sfdx-mobilesdk-plugin',
        version: '13.1.2',
        type: 'jit',
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle plugin info with result wrapper', () => {
      const inputState = createTestState({});

      const mockOutput = JSON.stringify({
        result: {
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
          type: 'jit',
        },
      });

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle plugin info as array', () => {
      const inputState = createTestState({});

      const mockOutput = JSON.stringify([
        {
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
          type: 'jit',
        },
      ]);

      mockExecSync.mockReturnValue(mockOutput);

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });
  });

  describe('execute() - Plugin Not Installed', () => {
    it('should install plugin when not found', () => {
      const inputState = createTestState({});

      // First call fails (plugin not installed)
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Plugin not found');
      });

      // Second call installs plugin
      mockExecSync.mockImplementationOnce(() => '');

      // Third call verifies installation
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin', {
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
          version: '13.1.0',
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
      expect(result.workflowFatalErrorMessages![0]).toContain('below minimum 13.1.0');
    });
  });

  describe('execute() - Plugin Version Too Old', () => {
    it('should upgrade plugin when version is below minimum', () => {
      const inputState = createTestState({});

      // First call returns old version
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '12.0.0',
        })
      );

      // Second call upgrades plugin
      mockExecSync.mockImplementationOnce(() => '');

      // Third call verifies upgrade
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('sf plugins update sfdx-mobilesdk-plugin', {
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
          version: '13.1.0',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const infoLogs = mockLogger.getLogsByLevel('info');
      const upgradeLog = infoLogs.find(log =>
        log.message.includes('Plugin version 12.0.0 is below minimum 13.1.0, attempting upgrade')
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
        'Plugin upgraded but version 12.5.0 is still below minimum 13.1.0'
      );
    });
  });

  describe('execute() - Version Comparison', () => {
    it('should accept exact minimum version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher major version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '14.0.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher minor version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.2.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should accept higher patch version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.1',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });

    it('should reject lower major version', () => {
      const inputState = createTestState({});

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
          version: '13.1.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sf plugins update'),
        expect.any(Object)
      );
    });

    it('should reject lower minor version', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.0.9',
        })
      );

      mockExecSync.mockImplementationOnce(() => '');
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('sf plugins update'),
        expect.any(Object)
      );
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
    it('should log debug message when checking plugin', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const checkLog = debugLogs.find(log => log.message.includes('Checking plugin installation'));
      expect(checkLog).toBeDefined();
    });

    it('should log debug message when plugin check passed', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

      mockLogger.reset();
      node.execute(inputState);

      const debugLogs = mockLogger.getLogsByLevel('debug');
      const passedLog = debugLogs.find(log => log.message.includes('Plugin check passed'));
      expect(passedLog).toBeDefined();
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
          version: '13.1.0',
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
          version: '13.1.0',
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
          version: '13.1.0',
        })
      );

      const result = node.execute(inputState);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('validPluginSetup');
      expect(typeof result.validPluginSetup).toBe('boolean');
    });

    it('should return validPluginSetup true on success', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
        })
      );

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
          version: '13.1.0-alpha.1',
        })
      );

      const result = node.execute(inputState);

      // Should consider 13.1.0-alpha.1 as >= 13.1.0 based on first three parts
      expect(result.validPluginSetup).toBe(true);
    });

    it('should handle very long version strings', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0.0.0.0',
        })
      );

      const result = node.execute(inputState);

      expect(result.validPluginSetup).toBe(true);
    });
  });

  describe('execute() - Timeout Configuration', () => {
    it('should set timeout to 10000ms for inspect command', () => {
      const inputState = createTestState({});

      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'sfdx-mobilesdk-plugin',
          version: '13.1.0',
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
          version: '13.1.0',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith('sf plugins install sfdx-mobilesdk-plugin', {
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
          version: '13.1.0',
        })
      );

      node.execute(inputState);

      expect(mockExecSync).toHaveBeenCalledWith('sf plugins update sfdx-mobilesdk-plugin', {
        encoding: 'utf-8',
        timeout: 60000,
      });
    });
  });
});
