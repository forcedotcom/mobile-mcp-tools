/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class LocationTool extends BaseTool {
  readonly name = 'Location Service';
  public readonly toolId = 'sfmobile-web-location';
  public readonly description =
    'Provides expert grounding to implement a Location feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'location/locationService.d.ts';
  public readonly serviceName = 'Location';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages location facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the location API of the mobile device, within the LWC.`;
}
