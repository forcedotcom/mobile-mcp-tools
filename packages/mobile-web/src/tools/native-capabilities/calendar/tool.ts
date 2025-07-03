/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { BaseTool } from '../baseTool';

export class CalendarTool extends BaseTool {
  readonly name = 'Calendar Service';
  public readonly toolId = 'sfmobile-web-calendar';
  public readonly description =
    'Provides expert grounding to implement a Calendar feature in a Salesforce Lightning web component (LWC).';
  protected readonly typeDefinitionPath = 'calendar/calendarService.d.ts';
  public readonly serviceName = 'Calendar';
  protected readonly serviceDescription = `The following content provides grounding information for generating a Salesforce LWC that leverages calendar facilities on mobile devices. Specifically, this context will cover the API types and methods available to leverage the calendar API of the mobile device, within the LWC.`;
}
