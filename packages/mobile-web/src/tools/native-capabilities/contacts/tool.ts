/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class ContactsTool extends BaseTool {
  readonly name = 'Contacts Service';
  public readonly toolId = 'sfmobile-web-contacts';
  public readonly description =
    'Provides expert grounding to implement a Contacts feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'contacts/contactsService.d.ts';
  public readonly serviceName = 'Contacts';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages contacts facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the contacts API of the mobile device, within the LWC.`;
}
