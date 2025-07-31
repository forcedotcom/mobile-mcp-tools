/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ModelConfig } from '../src/llmclient/modelConfig.js';
// commonly used mocks for testing

export const mockConfig: ModelConfig = {
  model: 'test-model',
  provider: 'test-provider',
  apiKey: 'test-api-key',
  baseUrl: 'https://test-api.com',
  clientFeatureID: 'test-feature',
  tenantId: 'test-tenant',
};
