/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';
import { PLATFORM_ENUM } from '../../common/schemas.js';

export const MOBILE_APP_PROJECT_PROMPT_NAME = 'mobile_app_project';

export const MOBILE_APP_PROJECT_PROMPT_DESCRIPTION =
  'Launch the Magen (Mobile App Generation) workflow to create a new mobile application project for iOS or Android';

export interface MobileAppProjectPromptArguments {
  platform: z.infer<typeof PLATFORM_ENUM>;
}
