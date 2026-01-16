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

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.compose.rememberNavController
import com.salesforce.agentforcedemo.navigation.NavigationGraph
import com.salesforce.agentforcedemo.ui.theme.AgentforceDemoTheme

/**
 * Main Activity for the Agentforce Demo application.
 *
 * This activity serves as the entry point for the app's UI, hosting the
 * Jetpack Compose-based interface. It manages the lifecycle of the
 * Agentforce chat experience and coordinates between the ViewModel
 * and UI components.
 *
 * ## Architecture
 * - Uses Jetpack Compose for modern declarative UI
 * - Navigation component for screen navigation
 * - ViewModel pattern for state management
 * - Settings data class for SDK configuration
 *
 * ## Agentforce Integration
 * The ViewModel handles:
 * - AgentforceClient initialization
 * - Service agent configuration
 * - Chat conversation management
 *
 * ## Navigation
 * - HomeScreen: Main screen with button to launch chat
 * - ChatScreen: Agentforce conversation UI with back navigation
 */
class MainActivity : ComponentActivity() {

    private lateinit var viewModel: AgentforceViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize ViewModel with application context
        val factory = AgentforceViewModel.Factory(application)
        viewModel = ViewModelProvider(this, factory)[AgentforceViewModel::class.java]

        // Enable edge-to-edge display
        enableEdgeToEdge()

        setContent {
            AgentforceDemoTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    NavigationGraph(
                        navController = navController,
                        viewModel = viewModel
                    )
                }
            }
        }
    }
}
