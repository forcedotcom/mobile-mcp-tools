/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

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
  /**
   * Set true only on the Windows cmd.exe path. Callers MUST forward this into their
   * spawn/spawnSync options: it tells libuv to pass our already-quoted argv through verbatim
   * instead of re-quoting (which would corrupt the cmd.exe command line). Ignored by Node on
   * POSIX and when undefined.
   */
  windowsVerbatimArguments?: boolean;
}

/**
 * Quote a single argument for a cmd.exe command line.
 *
 * cmd.exe treats `& | < > ^ ( )` (and spaces/commas) as literal INSIDE double quotes, so wrapping
 * in `"..."` neutralizes the injection metacharacters. Three things quoting cannot make safe, so we
 * reject them: a literal `"` (closes the quote context), `%` (env-var expansion happens even inside
 * quotes and has no reliable command-line escape), and CR/LF (line breaks). These characters are not
 * legitimate in the values our callers pass (paths, name=value flags, callback URLs, org names,
 * template properties).
 */
export function quoteForCmd(value: string): string {
  if (/["%\r\n]/.test(value)) {
    throw new SafeSpawnError(
      `Value cannot be safely quoted for cmd.exe (contains one of " % CR LF): ${JSON.stringify(value)}`
    );
  }
  return `"${value}"`;
}

/**
 * Build a shell:false spawn invocation.
 *
 * POSIX: command and args pass through unchanged; each arg reaches the OS as a single inert element.
 *
 * Windows: many CLIs ship as `.cmd`/`.bat`, which shell:false cannot launch directly (CreateProcess
 * only auto-appends `.exe`; post-CVE-2024-27980 Node refuses `.bat`/`.cmd` without shell:true). We
 * launch through `cmd.exe /d /s /c` with shell:false so PATHEXT resolves the wrapper. cmd.exe
 * re-parses the flattened command line with its own grammar, so we quote each arg with quoteForCmd
 * and wrap the whole inner command in one outer pair of quotes; the `/s` flag then strips exactly
 * that outer pair and runs the remainder verbatim. `command` is a trusted, code-derived, space-free
 * binary name and is passed bare (never quoted or validated). windowsVerbatimArguments:true stops
 * libuv from re-quoting our argv.
 */
export function buildSpawnInvocation(command: string, args: string[]): SpawnInvocation {
  if (process.platform === 'win32') {
    const inner = [command, ...args.map(quoteForCmd)].join(' ');
    return {
      command: process.env.comspec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', `"${inner}"`],
      shell: false,
      windowsVerbatimArguments: true,
    };
  }
  return { command, args, shell: false };
}
