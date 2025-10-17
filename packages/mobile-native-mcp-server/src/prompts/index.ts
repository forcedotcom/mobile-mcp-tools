/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// Base classes
export { AbstractPrompt } from './base/abstractPrompt.js';

// Prompt implementations
export { MobileAppProjectPrompt } from './mobile-app-project/prompt.js';
export {
  MOBILE_APP_PROJECT_PROMPT_NAME,
  MOBILE_APP_PROJECT_PROMPT_DESCRIPTION,
  type MobileAppProjectPromptArguments,
} from './mobile-app-project/metadata.js';
