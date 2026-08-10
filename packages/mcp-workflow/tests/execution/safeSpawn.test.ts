/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, afterEach } from 'vitest';
import { quoteForCmd, buildSpawnInvocation, SafeSpawnError } from '../../src/execution/safeSpawn.js';

const originalPlatform = process.platform;
function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
}

describe('safeSpawn', () => {
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  describe('quoteForCmd', () => {
    it('wraps free-form and structured values in double quotes', () => {
      const cases = [
        'myapp://cb?state=x&code=y',
        'Acme, Inc',
        "Ben's Org",
        'note (draft)',
        'C:\\Users\\me\\proj',
        'CONFIGURATION_BUILD_DIR=/tmp/out',
        'system-images;android-34;google_apis;x86_64',
        'a & b | c',
      ];
      for (const value of cases) {
        expect(quoteForCmd(value)).toBe(`"${value}"`);
      }
    });

    it('rejects characters cmd.exe quoting cannot neutralize', () => {
      for (const bad of ['has"quote', 'pct%VAR%', 'line\rreturn', 'line\nfeed']) {
        expect(() => quoteForCmd(bad)).toThrow(SafeSpawnError);
      }
    });

    it('throws SafeSpawnError with code UnsafeCmdArgument', () => {
      try {
        quoteForCmd('a"b');
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(SafeSpawnError);
        expect((e as SafeSpawnError).code).toBe('UnsafeCmdArgument');
      }
    });
  });

  describe('buildSpawnInvocation', () => {
    it('POSIX: returns command and args verbatim with shell false', () => {
      setPlatform('darwin');
      const inv = buildSpawnInvocation('xcodebuild', ['-scheme', 'App; rm -rf ~']);
      expect(inv.command).toBe('xcodebuild');
      expect(inv.args).toEqual(['-scheme', 'App; rm -rf ~']);
      expect(inv.shell).toBe(false);
      expect(inv.windowsVerbatimArguments).toBeUndefined();
    });

    it('Windows: wraps command in cmd.exe /d /s /c with each arg quoted', () => {
      setPlatform('win32');
      const inv = buildSpawnInvocation('sf', ['mobilesdk', 'ios', '--organization', 'Acme, Inc']);
      const comspec = process.env.comspec ?? 'cmd.exe';
      expect(inv.command).toBe(comspec);
      expect(inv.args).toEqual([
        '/d',
        '/s',
        '/c',
        '"sf "mobilesdk" "ios" "--organization" "Acme, Inc""',
      ]);
      expect(inv.shell).toBe(false);
      expect(inv.windowsVerbatimArguments).toBe(true);
    });

    it('Windows: accepts a free-form callback URL that the old allowlist rejected', () => {
      setPlatform('win32');
      const inv = buildSpawnInvocation('sf', ['--callbackurl', 'myapp://cb?state=x&code=y']);
      // args = [ '/d', '/s', '/c', '"<command> "arg0" "arg1"..."' ] — inspect the assembled /c string.
      expect(inv.args[3]).toBe('"sf "--callbackurl" "myapp://cb?state=x&code=y""');
      expect(inv.windowsVerbatimArguments).toBe(true);
    });

    it('Windows: rejects an arg containing an unquotable character before spawning', () => {
      setPlatform('win32');
      expect(() => buildSpawnInvocation('sf', ['a%VAR%b'])).toThrow(SafeSpawnError);
    });
  });
});
