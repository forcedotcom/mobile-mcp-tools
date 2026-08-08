/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const spawnSyncMock = vi.fn();
vi.mock('child_process', () => ({
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    openSync: vi.fn(() => 3),
    closeSync: vi.fn(),
    readFileSync: vi.fn(() => JSON.stringify({ templates: [] })),
    unlinkSync: vi.fn(),
  };
});

import { TemplateOptionsFetchNode } from '../../../src/workflow/nodes/templateOptionsFetch.js';
import type { State } from '../../../src/workflow/metadata.js';

describe('TemplateOptionsFetchNode', () => {
  beforeEach(() => {
    spawnSyncMock.mockReset();
    spawnSyncMock.mockReturnValue({ status: 0, error: null, stderr: '' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function runWith(platform: string): void {
    const node = new TemplateOptionsFetchNode();
    node.execute({ platform } as unknown as State);
  }

  it('spawns sf with an argv array, never a shell string', () => {
    runWith('iOS');

    expect(spawnSyncMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnSyncMock.mock.calls[0] as [
      string,
      string[],
      { shell?: boolean },
    ];

    // command must be the executable, not a concatenated string, and shell must be off
    expect(command).not.toContain(' ');
    expect(Array.isArray(args)).toBe(true);
    expect(options.shell).toBe(false);
  });

  it('passes the platform as an inert argv element', () => {
    runWith('iOS');
    const args = spawnSyncMock.mock.calls[0][1] as string[];
    expect(args).toContain('mobilesdk');
    expect(args).toContain('ios');
    expect(args).toContain('listtemplates');
    expect(args).toContain('--doc');
    expect(args).toContain('--json');
  });
});
