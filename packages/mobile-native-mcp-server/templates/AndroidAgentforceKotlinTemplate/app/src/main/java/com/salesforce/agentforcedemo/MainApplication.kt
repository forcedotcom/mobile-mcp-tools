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

/**
 * Application class for the Agentforce Demo application.
 *
 * This class serves as the main entry point for application-level initialization.
 * It handles SDK initialization and application-wide configuration.
 *
 * ## Key Responsibilities
 * - Initialize application context
 * - Configure any application-wide settings
 * - Set up instrumentation and telemetry (optional)
 *
 * ## Agentforce SDK Integration
 * The Agentforce SDK is initialized when the AgentforceClient is created
 * in the MainActivity or ViewModel. This Application class provides the
 * context needed for that initialization.
 */
class MainApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Application-level initialization can be performed here
        // The Agentforce SDK is initialized lazily when AgentforceClient is created

        /*
         * Optional: Set up instrumentation for telemetry
         * Uncomment and implement AgentforceInstrumentation if needed:
         *
         * val instrumentation = object : AgentforceInstrumentation {
         *     override fun logEvent(name: String, parameters: Map<String, Any>?) {
         *         // Log to your analytics system
         *     }
         * }
         */
    }
}

