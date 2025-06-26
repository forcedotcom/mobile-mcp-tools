/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * LLM calls to a model need to be configured to go
 * through LLM Gateway (https://git.soma.salesforce.com/pages/tech-enablement/einstein/docs/gateway/get-started/feature).
 *
 * This type is used to configure the LLM model.
 */
export type ModelConfig = {
  model: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  clientFeatureID: string;
  tenantId: string;
};
