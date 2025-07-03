/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class BiometricsTool extends BaseTool {
  readonly name = 'Biometrics Service';
  public readonly toolId = 'sfmobile-web-biometrics';
  public readonly description =
    'Provides expert grounding to implement a Biometrics feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'biometrics/biometricsService.d.ts';
  public readonly serviceName = 'Biometrics';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages biometrics scanning facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the face recognition and the finger printing scanner of the mobile device to authorize the user, within the LWC.`;
}
