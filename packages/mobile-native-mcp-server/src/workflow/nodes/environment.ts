/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { State } from '../metadata.js';
import { BaseNode } from '@salesforce/magen-mcp-workflow';

export class EnvironmentValidationNode extends BaseNode<State> {
  constructor() {
    super('validateEnvironment');
  }

  execute = (_state: State): Partial<State> => {
    // For now, you have to set your Connected App information in the environment.
    const { invalidEnvironmentMessages, connectedAppClientId, connectedAppCallbackUri } =
      this.validateEnvironmentVariables();

    const validEnvironment = invalidEnvironmentMessages.length === 0;
    return {
      validEnvironment,
      workflowFatalErrorMessages: validEnvironment ? undefined : invalidEnvironmentMessages,
      connectedAppClientId,
      connectedAppCallbackUri,
    };
  };

  private validateEnvironmentVariables() {
    const invalidEnvironmentMessages: string[] = [];
    const connectedAppClientId = process.env.CONNECTED_APP_CONSUMER_KEY;
    const connectedAppCallbackUri = process.env.CONNECTED_APP_CALLBACK_URL;

    if (!connectedAppClientId) {
      invalidEnvironmentMessages.push(
        'You must set the CONNECTED_APP_CONSUMER_KEY environment variable, with your Salesforce Connected App Consumer Key associated with the mobile app. See https://help.salesforce.com/s/articleView?id=xcloud.connected_app_create_mobile.htm&type=5 for information on how to create a Connected App for mobile apps.'
      );
    }
    if (!connectedAppCallbackUri) {
      invalidEnvironmentMessages.push(
        'You must set the CONNECTED_APP_CALLBACK_URL environment variable, with your Salesforce Connected App Callback URL associated with the mobile app. See https://help.salesforce.com/s/articleView?id=xcloud.connected_app_create_mobile.htm&type=5 for information on how to create a Connected App for mobile apps.'
      );
    }

    return { invalidEnvironmentMessages, connectedAppClientId, connectedAppCallbackUri };
  }
}
