/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BarcodeScannerTool } from '../../../../src/tools/native-capabilities/barcodeScanner/tool.js';
import { setupToolTest } from '../../../utils/tool-test-helper.js';

const { runCommonTests } = setupToolTest({
  toolName: 'Barcode Scanner',
  toolClass: BarcodeScannerTool,
  typeDefinitionPath: 'barcodeScanner/barcodeScanner.d.ts',
});

runCommonTests();
