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
// Scope note: this file intentionally covers only characters that reach the OS as inert argv
// elements on every platform. `;` is a POSIX shell separator but is in safeSpawn's Windows
// CMD_SAFE_ARG allowlist, so shell:false alone makes it inert everywhere — a genuine
// "passed verbatim" claim. Excluded cmd.exe metacharacters (e.g. `&`) are NOT passed verbatim on
// Windows — buildSpawnInvocation's win32 branch calls assertSafeForCmd and throws SafeSpawnError
// for them, which is a rejection, not a passthrough. That rejection behavior is exercised by the
// metacharacter allowlist tests in safeSpawn.test.ts, not here.
describe('DefaultCommandRunner injection safety', () => {
  it('passes a metacharacter-laden argument verbatim, without shell interpretation', async () => {
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
  });
});
