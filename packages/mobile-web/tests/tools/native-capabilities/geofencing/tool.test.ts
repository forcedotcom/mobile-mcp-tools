/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { GeofencingTool } from '../../../../src/tools/native-capabilities/geofencing/tool.js';
import { setupToolTest } from '../../../utils/tool-test-helper.js';

const { runCommonTests } = setupToolTest({
  toolName: 'Geofencing Service',
  toolClass: GeofencingTool,
  typeDefinitionPath: 'geofencing/geofencingService.d.ts',
});

runCommonTests();
