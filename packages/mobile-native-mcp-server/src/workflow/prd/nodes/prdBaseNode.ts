/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { PRDState } from '../metadata.js';

/**
 * Base class for PRD workflow nodes that don't invoke MCP tools.
 * These nodes perform state transformations and routing decisions.
 */
export abstract class PRDBaseNode {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract execute: (state: PRDState) => Partial<PRDState>;
}
