/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ContactsTool } from '../../../../src/tools/native-capabilities/contacts/tool.js';
import { setupToolTest } from '../../../utils/tool-test-helper.js';

const { runCommonTests } = setupToolTest({
  toolName: 'Contacts Service',
  toolClass: ContactsTool,
  typeDefinitionPath: 'contacts/contactsService.d.ts',
});

runCommonTests();
