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
// On Windows, buildSpawnInvocation wraps the call in cmd.exe and double-quotes every argv element
// via quoteForCmd. This test's own `node -e` harness script contains a `"` (see argv[1] below),
// which quoteForCmd rejects (it throws SafeSpawnError on " % CR LF — the chars quoting cannot
// neutralize), so the invocation would fail on the harness arg itself rather than exercise
// passthrough. The Windows quote-and-reject behavior is covered directly by safeSpawn.test.ts.
// We therefore skip this real-subprocess passthrough assertion on Windows.
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
