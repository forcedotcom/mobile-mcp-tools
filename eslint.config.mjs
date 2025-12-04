/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import evaluationConfig from './packages/evaluation/eslint.config.mjs';

// Read Prettier options from .prettierrc to ensure consistency between IDE and CLI.
// Using an absolute path ensures eslint-plugin-prettier uses the correct config
// regardless of the working directory from which ESLint is invoked.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prettierRcPath = path.join(__dirname, '.prettierrc');
const prettierOptions = JSON.parse(fs.readFileSync(prettierRcPath, 'utf-8'));

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
      'prettier/prettier': ['error', prettierOptions],
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
      'packages/mcp-magi/{src,tests}/**/*.ts',
      'packages/workflow-magi/{src,tests}/**/*.ts',
      '{src,tests}/**/*.ts', // For when running from package directories
    ],
    plugins: {
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': ['error', prettierOptions],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-duplicate-imports': 'error',
    },
  }
);
