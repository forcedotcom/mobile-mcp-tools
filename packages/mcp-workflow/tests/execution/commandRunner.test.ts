/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DefaultCommandRunner } from '../../src/execution/commandRunner.js';
import { ProgressReporter } from '../../src/execution/progressReporter.js';
import { MockLogger } from '../utils/MockLogger.js';
import type { ProgressParser } from '../../src/execution/types.js';

// Mock child_process.spawn
vi.mock('child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

describe('DefaultCommandRunner', () => {
  let commandRunner: DefaultCommandRunner;
  let mockLogger: MockLogger;
  let mockChildProcess: {
    stdout: { on: ReturnType<typeof vi.fn> };
    stderr: { on: ReturnType<typeof vi.fn> };
    on: ReturnType<typeof vi.fn>;
    kill: ReturnType<typeof vi.fn>;
    exitCode: number | null;
  };
  let stdoutHandlers: Array<(data: Buffer) => void>;
  let stderrHandlers: Array<(data: Buffer) => void>;
  let exitHandlers: Array<(code: number | null, signal: NodeJS.Signals | null) => void>;
  let errorHandlers: Array<(error: Error) => void>;

  beforeEach(() => {
    mockLogger = new MockLogger();
    commandRunner = new DefaultCommandRunner(mockLogger);
    stdoutHandlers = [];
    stderrHandlers = [];
    exitHandlers = [];
    errorHandlers = [];

    mockChildProcess = {
      stdout: {
        on: vi.fn((event: string, handler: (data: Buffer) => void) => {
          if (event === 'data') {
            stdoutHandlers.push(handler);
          }
        }),
      },
      stderr: {
        on: vi.fn((event: string, handler: (data: Buffer) => void) => {
          if (event === 'data') {
            stderrHandlers.push(handler);
          }
        }),
      },
      on: vi.fn((event: string, handler: unknown) => {
        if (event === 'exit') {
          exitHandlers.push(
            handler as (code: number | null, signal: NodeJS.Signals | null) => void
          );
        } else if (event === 'error') {
          errorHandlers.push(handler as (error: Error) => void);
        }
      }),
      kill: vi.fn(),
      exitCode: null,
    };

    vi.mocked(spawn).mockReturnValue(mockChildProcess as unknown as ReturnType<typeof spawn>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    stdoutHandlers = [];
    stderrHandlers = [];
    exitHandlers = [];
    errorHandlers = [];
  });

  describe('execute', () => {
    it('should implement CommandRunner interface', () => {
      expect(commandRunner.execute).toBeDefined();
      expect(typeof commandRunner.execute).toBe('function');
    });

    it('should spawn process with correct command and args', async () => {
      const promise = commandRunner.execute('echo', ['hello'], { commandName: 'Test Command' });

      // Trigger exit to resolve promise
      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const env = spawnCall[2]?.env;

      expect(spawn).toHaveBeenCalledWith('echo', ['hello'], {
        env: expect.objectContaining({
          ...process.env,
        }),
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: undefined,
      });

      // Ensure UTF-8 encoding variables are set (either from existing env or defaults)
      expect(env).toBeDefined();
      expect(env?.LANG).toBeDefined();
      expect(env?.LC_ALL).toBeDefined();
      // If LANG wasn't already set, it should default to en_US.UTF-8
      if (!process.env.LANG && env) {
        expect(env.LANG).toBe('en_US.UTF-8');
      }
      // If LC_ALL wasn't already set, it should default to en_US.UTF-8
      if (!process.env.LC_ALL && env) {
        expect(env.LC_ALL).toBe('en_US.UTF-8');
      }
    });

    it('should use custom environment variables', async () => {
      const customEnv = { ...process.env, CUSTOM_VAR: 'test' };
      const promise = commandRunner.execute('echo', ['hello'], {
        env: customEnv,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const env = spawnCall[2]?.env;

      expect(spawn).toHaveBeenCalledWith(
        'echo',
        ['hello'],
        expect.objectContaining({
          env: expect.objectContaining({
            ...customEnv,
          }),
        })
      );

      // Ensure UTF-8 encoding variables are set
      expect(env).toBeDefined();
      expect(env?.CUSTOM_VAR).toBe('test');
      expect(env?.LANG).toBeDefined();
      expect(env?.LC_ALL).toBeDefined();
      // If LANG wasn't in customEnv, it should default to en_US.UTF-8
      if (!('LANG' in customEnv) && env) {
        expect(env.LANG).toBe('en_US.UTF-8');
      }
      // If LC_ALL wasn't in customEnv, it should default to en_US.UTF-8
      if (!('LC_ALL' in customEnv) && env) {
        expect(env.LC_ALL).toBe('en_US.UTF-8');
      }
    });

    it('should respect explicitly provided UTF-8 environment variables', async () => {
      const customEnv = {
        ...process.env,
        LANG: 'fr_FR.UTF-8',
        LC_ALL: 'fr_FR.UTF-8',
      };
      const promise = commandRunner.execute('echo', ['hello'], {
        env: customEnv,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        'echo',
        ['hello'],
        expect.objectContaining({
          env: expect.objectContaining({
            LANG: 'fr_FR.UTF-8',
            LC_ALL: 'fr_FR.UTF-8',
          }),
        })
      );
    });

    it('should use custom working directory', async () => {
      const customCwd = '/tmp/test';
      const promise = commandRunner.execute('pwd', [], {
        cwd: customCwd,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      expect(spawn).toHaveBeenCalledWith(
        'pwd',
        [],
        expect.objectContaining({
          cwd: customCwd,
        })
      );
    });

    it('should capture stdout', async () => {
      const promise = commandRunner.execute('echo', ['hello'], { commandName: 'Test Command' });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => handler(Buffer.from('hello\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.stdout).toBe('hello\n');
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should capture stderr', async () => {
      const promise = commandRunner.execute('echo', ['error'], { commandName: 'Test Command' });

      setTimeout(() => {
        stderrHandlers.forEach(handler => handler(Buffer.from('error message\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.stderr).toBe('error message\n');
    });

    it('should handle non-zero exit code as failure', async () => {
      const promise = commandRunner.execute('false', [], { commandName: 'Test Command' });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(1, null));
      }, 10);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should handle process termination by signal', async () => {
      const promise = commandRunner.execute('test', [], { commandName: 'Test Command' });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(null, 'SIGTERM'));
      }, 10);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.signal).toBe('SIGTERM');
    });

    it('should calculate duration', async () => {
      const startTime = Date.now();
      const promise = commandRunner.execute('sleep', ['0.1'], { commandName: 'Test Command' });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;
      const endTime = Date.now();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
    });

    it('should report progress on start', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('echo', ['hello'], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      expect(mockProgressReporter.report).toHaveBeenCalledWith(
        0,
        100,
        'Starting "Test Command" command execution...'
      );
    });

    it('should report progress on stdout chunks', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('echo', ['hello'], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => handler(Buffer.from('output\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      // Should report progress at least once (on stdout chunk)
      // Called: start (1), stdout chunk (2), exit/completion (3)
      expect(mockProgressReporter.report).toHaveBeenCalledTimes(3);
    });

    it('should use progress parser when provided', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const mockParser: ProgressParser = vi.fn((output: string, currentProgress: number) => {
        return {
          progress: output.includes('complete') ? 100 : currentProgress + 10,
          message: 'Parsed progress',
        };
      });

      const promise = commandRunner.execute('echo', ['complete'], {
        progressReporter: mockProgressReporter,
        progressParser: mockParser,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => handler(Buffer.from('complete\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      expect(mockParser).toHaveBeenCalled();
      expect(mockProgressReporter.report).toHaveBeenCalled();
    });

    it('should handle progress parser errors gracefully', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const failingParser: ProgressParser = vi.fn(() => {
        throw new Error('Parser error');
      });

      const promise = commandRunner.execute('echo', ['test'], {
        progressReporter: mockProgressReporter,
        progressParser: failingParser,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => handler(Buffer.from('test\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      // Should still report progress even if parser fails
      expect(mockProgressReporter.report).toHaveBeenCalled();
    });

    it('should report completion on success', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('echo', ['hello'], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      await promise;

      expect(mockProgressReporter.report).toHaveBeenCalledWith(
        100,
        100,
        '"Test Command" command completed successfully'
      );
    });

    it('should report failure on non-zero exit', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('false', [], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(1, null));
      }, 10);

      await promise;

      expect(mockProgressReporter.report).toHaveBeenCalledWith(
        100,
        100,
        'Command failed with exit code: 1'
      );
    });

    it('should report failure on signal termination', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('test', [], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(null, 'SIGTERM'));
      }, 10);

      await promise;

      expect(mockProgressReporter.report).toHaveBeenCalledWith(
        100,
        100,
        'Command terminated by signal: SIGTERM'
      );
    });

    it('should handle process errors', async () => {
      const promise = commandRunner.execute('nonexistent', [], { commandName: 'Test Command' });

      setTimeout(() => {
        errorHandlers.forEach(handler => handler(new Error('Process error')));
      }, 10);

      await expect(promise).rejects.toThrow('Process error');
    });

    it('should report error on process failure', async () => {
      const mockProgressReporter: ProgressReporter = {
        report: vi.fn(),
      };

      const promise = commandRunner.execute('nonexistent', [], {
        progressReporter: mockProgressReporter,
        commandName: 'Test Command',
      });

      setTimeout(() => {
        errorHandlers.forEach(handler => handler(new Error('Process error')));
      }, 10);

      await expect(promise).rejects.toThrow('Process error');

      expect(mockProgressReporter.report).toHaveBeenCalledWith(
        100,
        100,
        '"Test Command" command execution error: Process error'
      );
    });

    it('should write output to file when outputFilePath provided', async () => {
      const outputFile = join(tmpdir(), `test-output-${Date.now()}.txt`);

      try {
        const promise = commandRunner.execute('echo', ['test output'], {
          outputFilePath: outputFile,
          commandName: 'Test Command',
        });

        setTimeout(() => {
          stdoutHandlers.forEach(handler => handler(Buffer.from('test output\n')));
          exitHandlers.forEach(handler => handler(0, null));
        }, 10);

        await promise;

        // File should exist and contain output
        expect(existsSync(outputFile)).toBe(true);
      } finally {
        if (existsSync(outputFile)) {
          unlinkSync(outputFile);
        }
      }
    });

    it('should handle timeout', async () => {
      const commandRunnerWithTimeout = new DefaultCommandRunner(mockLogger, 100);

      const promise = commandRunnerWithTimeout.execute('sleep', ['10'], {
        commandName: 'Test Command',
      });

      // Don't trigger exit - let timeout happen
      await expect(promise).rejects.toThrow(/Command timeout/);

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should not timeout when timeout is 0', async () => {
      const commandRunnerNoTimeout = new DefaultCommandRunner(mockLogger, 0);

      const promise = commandRunnerNoTimeout.execute('echo', ['hello'], {
        commandName: 'Test Command',
      });

      setTimeout(() => {
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('should use custom timeout from options', async () => {
      const promise = commandRunner.execute('sleep', ['10'], {
        timeout: 50,
        commandName: 'Test Command',
      });

      await expect(promise).rejects.toThrow(/Command timeout/);

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should work without progress reporter', async () => {
      const promise = commandRunner.execute('echo', ['hello'], { commandName: 'Test Command' });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => handler(Buffer.from('hello\n')));
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('hello\n');
    });

    it('should accumulate multiple stdout chunks', async () => {
      const promise = commandRunner.execute('echo', ['hello'], { commandName: 'Test Command' });

      setTimeout(() => {
        stdoutHandlers.forEach(handler => {
          handler(Buffer.from('chunk1\n'));
          handler(Buffer.from('chunk2\n'));
        });
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.stdout).toBe('chunk1\nchunk2\n');
    });

    it('should accumulate multiple stderr chunks', async () => {
      const promise = commandRunner.execute('echo', ['error'], { commandName: 'Test Command' });

      setTimeout(() => {
        stderrHandlers.forEach(handler => {
          handler(Buffer.from('error1\n'));
          handler(Buffer.from('error2\n'));
        });
        exitHandlers.forEach(handler => handler(0, null));
      }, 10);

      const result = await promise;

      expect(result.stderr).toBe('error1\nerror2\n');
    });

    describe('progress debounce', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should report progress changes immediately without debounce', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const mockParser: ProgressParser = vi.fn((output: string, currentProgress: number) => {
          // Return increasing progress based on output length
          const progress = Math.min(100, currentProgress + 10);
          return { progress, message: `Progress: ${progress}%` };
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: mockParser,
          progressDebounceMs: 2000,
          commandName: 'Test Command',
        });

        // Simulate multiple stdout chunks with different progress
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 100);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 200);

        await vi.runAllTimersAsync();
        await promise;

        // Should report immediately for each progress change
        // Called: start (1), chunk1 (2), chunk2 (3), chunk3 (4), completion (5)
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(5);
      });

      it('should debounce identical progress values', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const mockParser: ProgressParser = vi.fn(() => {
          // Always return the same progress
          return { progress: 50, message: 'Same progress' };
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: mockParser,
          progressDebounceMs: 2000,
          commandName: 'Test Command',
        });

        // Simulate multiple stdout chunks with same progress
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 500);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
        }, 1000);

        // Advance time past debounce threshold
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk4\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 2500);

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), first chunk (2), after debounce (3), completion (4)
        // chunk2 and chunk3 should be debounced
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });

      it('should use custom debounce time', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const mockParser: ProgressParser = vi.fn(() => {
          return { progress: 50, message: 'Same progress' };
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: mockParser,
          progressDebounceMs: 500, // Custom debounce time
          commandName: 'Test Command',
        });

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 200);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 600); // Past custom debounce time

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), first chunk (2), after debounce (3), completion (4)
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });

      it('should debounce identical progress without parser', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressDebounceMs: 2000,
          commandName: 'Test Command',
        });

        // Simulate multiple stdout chunks (progress stays at 0 without parser)
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 500);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 2500); // Past debounce time

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), first chunk (2), after debounce (3), completion (4)
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });

      it('should debounce identical progress when parser throws errors', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const failingParser: ProgressParser = vi.fn(() => {
          throw new Error('Parser error');
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: failingParser,
          progressDebounceMs: 2000,
          commandName: 'Test Command',
        });

        // Simulate multiple stdout chunks (progress stays at 0 when parser fails)
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 500);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 2500); // Past debounce time

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), first chunk (2), after debounce (3), completion (4)
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });

      it('should report immediately when progress changes after debounce', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        let callCount = 0;
        const mockParser: ProgressParser = vi.fn(() => {
          callCount++;
          // Return same progress for first 3 calls, then change
          const progress = callCount <= 3 ? 50 : 60;
          return { progress, message: `Progress: ${progress}%` };
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: mockParser,
          progressDebounceMs: 2000,
          commandName: 'Test Command',
        });

        // First chunk - should report
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        // Second chunk - same progress, should be debounced
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 500);

        // Third chunk - same progress, should be debounced
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
        }, 1000);

        // Fourth chunk - progress changes, should report immediately
        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk4\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 1500);

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), chunk1 (2), chunk4 with changed progress (3), completion (4)
        // chunk2 and chunk3 are debounced, but chunk4 reports immediately due to progress change
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });

      it('should use default debounce time when not specified', async () => {
        const mockProgressReporter: ProgressReporter = {
          report: vi.fn(),
        };

        const mockParser: ProgressParser = vi.fn(() => {
          return { progress: 50, message: 'Same progress' };
        });

        const promise = commandRunner.execute('echo', ['test'], {
          progressReporter: mockProgressReporter,
          progressParser: mockParser,
          commandName: 'Test Command',
          // progressDebounceMs not specified - should use default 2000ms
        });

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk1\n'));
          });
        }, 0);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk2\n'));
          });
        }, 500);

        setTimeout(() => {
          stdoutHandlers.forEach(handler => {
            handler(Buffer.from('chunk3\n'));
          });
          exitHandlers.forEach(handler => handler(0, null));
        }, 2500); // Past default debounce time (2000ms)

        await vi.runAllTimersAsync();
        await promise;

        // Should report: start (1), first chunk (2), after debounce (3), completion (4)
        expect(mockProgressReporter.report).toHaveBeenCalledTimes(4);
      });
    });
  });
});
