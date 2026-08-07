/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  CMD_SAFE_ARG,
  SafeSpawnError,
  assertSafeForCmd,
  buildSpawnInvocation,
} from '../../src/execution/safeSpawn.js';

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

describe('safeSpawn', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  describe('CMD_SAFE_ARG / assertSafeForCmd', () => {
    it('accepts structured values', () => {
      const safe = [
        'TestApp',
        'TestApp.xcworkspace',
        'system-images;android-33;google_apis;x86_64',
        '/path/to/project',
        'CONFIGURATION_BUILD_DIR=/output',
        'generic/platform=iOS Simulator',
        'emulator-5554',
      ];
      for (const value of safe) {
        expect(CMD_SAFE_ARG.test(value)).toBe(true);
        expect(() => assertSafeForCmd(value)).not.toThrow();
      }
    });

    it.each(['&', '|', '<', '>', '^', '(', ')', '"', '%', '!'])(
      'rejects cmd metacharacter %s',
      metachar => {
        const value = `App${metachar}calc`;
        expect(CMD_SAFE_ARG.test(value)).toBe(false);
        expect(() => assertSafeForCmd(value)).toThrow(SafeSpawnError);
      }
    );

    it('throws SafeSpawnError with code UnsafeCmdArgument', () => {
      try {
        assertSafeForCmd('a&b');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(SafeSpawnError);
        expect((err as SafeSpawnError).code).toBe('UnsafeCmdArgument');
      }
    });
  });

  describe('buildSpawnInvocation', () => {
    it('POSIX: returns command and args verbatim with shell false', () => {
      setPlatform('darwin');
      const inv = buildSpawnInvocation('xcodebuild', ['-scheme', 'App; rm -rf ~']);
      expect(inv).toEqual({
        command: 'xcodebuild',
        args: ['-scheme', 'App; rm -rf ~'],
        shell: false,
      });
    });

    it('Windows: wraps command in cmd.exe /d /s /c with shell false', () => {
      setPlatform('win32');
      const inv = buildSpawnInvocation('sf', ['mobilesdk', 'ios', 'listtemplates']);
      expect(inv.shell).toBe(false);
      expect(inv.command).toBe(process.env.comspec ?? 'cmd.exe');
      expect(inv.args).toEqual(['/d', '/s', '/c', 'sf', 'mobilesdk', 'ios', 'listtemplates']);
    });

    it('Windows: rejects an unsafe arg before spawning', () => {
      setPlatform('win32');
      expect(() => buildSpawnInvocation('sf', ['a&calc'])).toThrow(SafeSpawnError);
    });
  });
});
