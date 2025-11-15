/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import evaluationConfig from './packages/evaluation/eslint.config.mjs';

export default tseslint.config(
  {
    ignores: [
      'packages/project-maintenance-utilities/dist/**',
      'packages/project-maintenance-utilities/node_modules/**',
      'packages/project-maintenance-utilities/coverage/**',
      'packages/evaluation/dist/**',
      'packages/evaluation/node_modules/**',
      'packages/evaluation/coverage/**',
      'packages/mobile-native-mcp-server/templates/**',
      '**/dist/*',
      '**/*.d.ts',
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
  ...evaluationConfig,
  // TypeScript configuration - works both from root and package directories
  {
    files: [
      'packages/project-maintenance-utilities/{src,tests}/**/*.ts',
      'packages/evaluation/{src,tests}/**/*.ts',
      'packages/mobile-native-mcp-server/{src,tests}/**/*.ts',
      'packages/mcp-workflow/{src,tests}/**/*.ts',
      '{src,tests}/**/*.ts', // For when running from package directories
    ],
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-duplicate-imports': 'error'
    },
  }
);
