/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { DefaultCommandRunner } from '../../src/execution/commandRunner.js';

// Real subprocess (no child_process mock, no safeSpawn mock): proves untrusted argv is passed
// verbatim to the program and never parsed by a shell.
//
// POSIX-only: this test asserts the "passed verbatim" property, which is a POSIX guarantee.
// On Windows, buildSpawnInvocation validates EVERY argv element (including this test's own
// `node -e` harness script, which necessarily contains `(`, `)`, `|`, `"` — all outside
// CMD_SAFE_ARG) and throws SafeSpawnError. That win32 behavior is rejection, not passthrough,
// and is exercised directly by the metacharacter allowlist tests in safeSpawn.test.ts. Running
// this real-subprocess passthrough assertion on Windows would therefore fail on the harness arg
// itself, so we skip it there rather than assert a property the platform does not provide.
describe('DefaultCommandRunner injection safety', () => {
  it.skipIf(process.platform === 'win32')(
    'passes a metacharacter-laden argument verbatim, without shell interpretation',
    async () => {
      const runner = new DefaultCommandRunner();
      const malicious = 'a; echo INJECTED';

      // node -e writes argv[1] back out. If a shell interpreted the arg, `echo INJECTED` would run
      // as a separate command and "INJECTED\n" would appear as extra output.
      const result = await runner.execute(
        process.execPath,
        ['-e', 'process.stdout.write(process.argv[1] || "")', malicious],
        { commandName: 'Injection Test', timeout: 30000 }
      );

      expect(result.success).toBe(true);
      expect(result.stdout).toBe(malicious);
      expect(result.stdout).not.toContain('INJECTED\n');
    }
  );
});
