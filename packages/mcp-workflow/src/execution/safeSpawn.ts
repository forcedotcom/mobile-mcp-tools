/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Characters safe to pass to cmd.exe as (Node-quoted) argv elements. Allowlist rather than
 * denylist: the values that reach the Windows cmd.exe path are structured (device ids, paths,
 * `system-images;api;image;abi` strings, name=value args), so a strict allowlist rejects
 * anything unexpected instead of trying to enumerate every cmd metacharacter. `;` and `=` are
 * permitted (system-image paths and name=value args); space is permitted. Every cmd
 * metacharacter (`& | < > ^ ( ) " % !`) is excluded.
 */
export const CMD_SAFE_ARG = /^[A-Za-z0-9 ._:;@\\/=+-]+$/;

/** Thrown when an argv element cannot be safely passed to cmd.exe. */
export class SafeSpawnError extends Error {
  public readonly code = 'UnsafeCmdArgument';
  constructor(message: string) {
    super(message);
    this.name = 'SafeSpawnError';
  }
}

/** A spawn invocation that never routes arguments through a shell. */
export interface SpawnInvocation {
  command: string;
  args: string[];
  shell: false;
}

/** Throws SafeSpawnError if `value` contains a character outside the cmd.exe allowlist. */
export function assertSafeForCmd(value: string): void {
  if (!CMD_SAFE_ARG.test(value)) {
    throw new SafeSpawnError(`Value cannot be safely passed to cmd.exe: ${JSON.stringify(value)}`);
  }
}

/**
 * Build a shell:false spawn invocation.
 *
 * POSIX: the command and args pass through unchanged; each arg reaches the OS as a single inert
 * element.
 *
 * Windows: many CLIs ship as `.cmd`/`.bat`, which shell:false cannot launch directly (CreateProcess
 * only auto-appends `.exe`; post-CVE-2024-27980 Node refuses `.bat`/`.cmd` without shell:true). We
 * launch through `cmd.exe /d /s /c` with shell:false so PATHEXT resolves the wrapper. Because
 * cmd.exe re-parses the flattened command line with its own grammar (and libuv only quotes
 * space/tab/`"`), a bare metacharacter would inject; we therefore validate each untrusted arg
 * against a strict allowlist first. `command` is a trusted, code-derived binary name and is not
 * validated.
 */
export function buildSpawnInvocation(command: string, args: string[]): SpawnInvocation {
  if (process.platform === 'win32') {
    args.forEach(arg => assertSafeForCmd(arg));
    return {
      command: process.env.comspec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...args],
      shell: false,
    };
  }
  return { command, args, shell: false };
}
