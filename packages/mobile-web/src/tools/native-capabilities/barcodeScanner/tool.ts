/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class BarcodeScannerTool extends BaseTool {
  readonly name = 'Barcode Scanner';
  public readonly toolId = 'sfmobile-web-barcode-scanner';
  public readonly description =
    'Provides expert grounding to implement a Barcode Scanner feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'barcodeScanner/barcodeScanner.d.ts';
  public readonly serviceName = 'Barcode Scanner';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages barcode scanning facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the barcode scanning API of the mobile device, within the LWC.`;
}
