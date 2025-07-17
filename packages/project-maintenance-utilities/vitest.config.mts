/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config.base.mts';

export default mergeConfig(baseConfig, {
    test: {
        coverage: {
            exclude: [
              'tests/**',
              '**/*.config.*',
              'dist/**',
              // Exclude most service implementations - these are thin wrappers around third-party APIs
              // (Node.js fs, child_process, Octokit, @actions/core) and contain no business logic worth testing
              'src/services/implementations/**',
              // But include PackageService which contains business logic we test directly
              '!src/services/implementations/PackageService.ts',
              // Exclude service interfaces - these are TypeScript interface definitions only
              'src/services/interfaces/**',
            ]
        }
    }
});