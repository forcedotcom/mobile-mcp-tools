/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Shared template source path for Salesforce Mobile SDK commands
export const MOBILE_SDK_TEMPLATES_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates'
);
