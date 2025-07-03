/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class NfcTool extends BaseTool {
  readonly name = 'NFC Service';
  public readonly toolId = 'sfmobile-web-nfc';
  public readonly description =
    'Provides expert grounding to implement an NFC feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'nfc/nfcService.d.ts';
  public readonly serviceName = 'NFC';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages NFC facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the NFC API of the mobile device, within the LWC.`;
}
