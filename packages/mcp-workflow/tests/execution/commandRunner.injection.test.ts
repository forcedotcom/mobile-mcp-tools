/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect } from 'vitest';
import { DefaultCommandRunner } from '../../src/execution/commandRunner.js';

// Real subprocess (no child_process mock): proves untrusted argv is passed verbatim to the
// program and never parsed by a shell.
describe('DefaultCommandRunner injection safety', () => {
  it.each([
    // `;` is a POSIX shell command separator, but NOT a cmd.exe metacharacter — this case proves
    // non-interpretation under sh/bash on POSIX runners.
    ['POSIX shell separator', 'a; echo INJECTED'],
    // `&` is a cmd.exe command separator (and also meaningful to POSIX shells), so this case
    // proves non-interpretation under cmd.exe on Windows runners — the vector this fix targets.
    ['cmd.exe metacharacter', 'a & echo INJECTED'],
  ])(
    'passes a metacharacter-laden argument verbatim, without shell interpretation (%s)',
    async (_label, malicious) => {
      const runner = new DefaultCommandRunner();

      // node -e writes argv[1] back out. If a shell interpreted the arg, `echo INJECTED` would
      // run as a separate command and "INJECTED\n" would appear as extra output.
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
