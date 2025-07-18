/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import tseslint from 'typescript-eslint';
/**
 * disable no-undef for dataset component js files
 */
export default tseslint.config({
  files: ['dataset/**/*.js'],
  rules: {
    'no-undef': 'off',
  },
});
