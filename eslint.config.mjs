/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: [
      'packages/mobile-web/dist/**',
      'packages/mobile-web/resources/**',
      'packages/mobile-web/coverage/**',
      'packages/project-maintenance-utilities/dist/**',
      'packages/project-maintenance-utilities/node_modules/**',
      'packages/project-maintenance-utilities/coverage/**',
      'packages/evaluation/dist/**',
      'packages/evaluation/node_modules/**',
      'packages/evaluation/coverage/**',
      '**/dist/*',
      '**/*.d.ts',

      // TODO: Clean up complex mock typing issues in these test files in a future work item
      // Mobile-web package test files with complex mock typing issues
      'packages/mobile-web/tests/tools/mobile-offline/offline-analysis/tool.test.ts',
      'packages/mobile-web/tests/tools/mobile-offline/offline-guidance/tool.test.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Configuration for JavaScript files (LWC components)
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  // Configuration for TypeScript files
  {
    files: [
      'packages/mobile-web/src/**/*.ts',
      'packages/project-maintenance-utilities/src/**/*.ts',
      'packages/evaluation/src/**/*.ts',
    ],
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
);
