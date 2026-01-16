/*
 * Copyright (c) 2019-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or
 * without modification, are permitted provided that the following conditions
 * are met:
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * - Neither the name of salesforce.com, inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission of salesforce.com, inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
package com.salesforce.agentforcedemo

import com.salesforce.android.agentforceservice.AgentforceAuthCredentialProvider
import com.salesforce.android.agentforceservice.AgentforceAuthCredentials

/**
 * CredentialProvider provides authentication credentials for Agentforce SDK integration.
 *
 * This class implements the AgentforceAuthCredentialProvider interface to supply
 * authentication credentials for communicating with Salesforce APIs.
 *
 * ## Usage
 * The class is typically instantiated and passed to AgentforceClient during initialization:
 * ```kotlin
 * val credentialProvider = CredentialProvider()
 * val agentforceClient = AgentforceClient(
 *     credentialProvider = credentialProvider,
 *     mode = AgentforceMode.ServiceAgent(config)
 * )
 * ```
 *
 * ## Authentication Types Supported
 * - Guest: Uses a placeholder URL for unauthenticated access
 * - OAuth: Can be extended to use access token from Salesforce Mobile SDK
 * - OrgJWT: Alternative JWT-based authentication
 *
 * ## Thread Safety
 * This implementation is thread-safe as it returns immutable credential objects.
 */
class CredentialProvider : AgentforceAuthCredentialProvider {

    /**
     * Retrieves current authentication credentials for Agentforce operations.
     *
     * This method is called automatically by the Agentforce SDK when authentication
     * is required for API requests.
     *
     * ## Implementation Details
     * - Returns Guest credentials with a placeholder URL
     * - Can be modified to return OAuth or JWT credentials
     *
     * ## Error Handling
     * The method provides graceful fallbacks. The Agentforce SDK will handle
     * invalid credentials appropriately by triggering re-authentication flows.
     *
     * @return AgentforceAuthCredentials containing authentication information
     */
    override fun getAuthCredentials(): AgentforceAuthCredentials {
        return AgentforceAuthCredentials.Guest(url = "https://unused.url")
    }
}

