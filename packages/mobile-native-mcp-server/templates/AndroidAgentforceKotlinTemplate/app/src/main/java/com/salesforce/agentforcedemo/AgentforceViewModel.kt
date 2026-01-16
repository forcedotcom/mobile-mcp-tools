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

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import com.salesforce.android.agentforcesdkimpl.AgentforceClient
import com.salesforce.android.agentforcesdkimpl.configuration.AgentforceMode
import com.salesforce.android.agentforcesdkimpl.configuration.ServiceAgentConfiguration
import com.salesforce.android.agentforcesdkimpl.AgentforceConversation
/**
 * ViewModel for managing Agentforce state and client lifecycle.
 *
 * This ViewModel holds the Agentforce client and conversation state,
 * allowing the state to persist across configuration changes like
 * screen rotations and navigation.
 *
 * @param application The application context for initializing the Agentforce client
 */
class AgentforceViewModel(application: Application) : AndroidViewModel(application) {

    private val settings = Settings()

    /**
     * The Agentforce client instance
     */
    var agentforceClient: AgentforceClient? = null
        private set

    private val _isClientInitialized = MutableStateFlow(false)
    /**
     * Whether the Agentforce client has been initialized
     */
    val isClientInitialized: StateFlow<Boolean> = _isClientInitialized.asStateFlow()

    private val _conversation = MutableStateFlow<AgentforceConversation?>(null)
    /**
     * The current Agentforce conversation
     */
    val conversation: StateFlow<AgentforceConversation?> = _conversation.asStateFlow()

    init {
        initializeClient()
    }

    /**
     * Initialize the Agentforce client with service agent configuration
     */
    private fun initializeClient() {
        val agentforceMode = AgentforceMode.ServiceAgent(
            serviceAgentConfiguration = ServiceAgentConfiguration.builder(
                serviceApiURL = settings.serviceApiURL,
                organizationId = settings.organizationId,
                esDeveloperName = settings.esDeveloperName
            ).build()
        )

        agentforceClient = AgentforceClient().apply {
            init(
                authCredentialProvider = CredentialProvider(),
                agentforceMode = agentforceMode,
                application = getApplication()
            )
        }
        _isClientInitialized.value = true
    }

    /**
     * Start a new Agentforce conversation
     */
    fun startConversation() {
        agentforceClient?.let { client ->
            _conversation.value = client.startAgentforceConversation()
        }
    }

    /**
     * Factory for creating AgentforceViewModel with application context
     */
    class Factory(private val application: Application) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(AgentforceViewModel::class.java)) {
                return AgentforceViewModel(application) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
