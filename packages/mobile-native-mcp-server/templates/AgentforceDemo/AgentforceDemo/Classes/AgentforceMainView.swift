/*
 Copyright (c) 2019-present, salesforce.com, inc. All rights reserved.
 
 Redistribution and use of this software in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions
 and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of
 conditions and the following disclaimer in the documentation and/or other materials provided
 with the distribution.
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to
 endorse or promote products derived from this software without specific prior written
 permission of salesforce.com, inc.
 
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import SwiftUI
import AgentforceSDK
import AgentforceService

/// Minimal main view for Agentforce SDK integration
struct AgentforceMainView: View {
    @Bindable var viewModel: AgentforceViewModel
    @Bindable var settings: Settings
    
    /// Agentforce client instance for managing conversations
    let agentforceClient: AgentforceClient
    let conversation: any AgentConversation
    
    /// Initialize the main view with required dependencies
    init(viewModel: AgentforceViewModel, settings: Settings) {
        self.viewModel = viewModel
        self.settings = settings
        
        // Configure service UI settings
        let serviceUISettings = ServiceUISettings(
            downloadTranscript: true,
            endConversation: true
        )
        
        // Configure agent
        let config = ServiceAgentConfiguration(
            esDeveloperName: Settings.esDeveloperName,
            organizationId: Settings.organizationID,
            serviceApiURL: Settings.apiURL,
            serviceUISettings: serviceUISettings
        )
        
        // Initialize Agentforce client with credentials and configuration
        self.agentforceClient = AgentforceClient(
            credentialProvider: CredentialProvider(),
            mode: .serviceAgent(config),
            viewProvider: nil,        // No custom view provider
            themeManager: AgentforceDefaultThemeManager()  // Use default theme
        )
        
        // Start a conversation
        self.conversation = agentforceClient.startAgentforceConversation(forESDeveloperName: Settings.esDeveloperName)
    }
    
    var body: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                NavigationStack {
                    VStack(spacing: 30) {
                        Spacer()
                        
                        // App title
                        VStack(spacing: 8) {
                            Image(systemName: "message.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.blue)
                            
                            Text("Agentforce SDK Demo")
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text("Tap the button below to start chatting")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Start chat button
                        Button(action: {
                            viewModel.showAgentforceUI = true
                        }) {
                            HStack {
                                Image(systemName: "message.bubble.fill")
                                Text("Start Chat")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .frame(maxWidth: 200)
                            .background(Color.blue)
                            .cornerRadius(12)
                        }
                        
                        Spacer()
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .fullScreenCover(isPresented: $viewModel.showAgentforceUI) {
                    chatView
                }
            }
            
            Tab("Settings", systemImage: "gear") {
                SettingsView()
            }
        }
        .environment(settings)
    }
    
    /// Chat view wrapper
    @ViewBuilder
    private var chatView: some View {
        try! agentforceClient.createAgentforceChatView(
            conversation: conversation,
            delegate: nil,
            onContainerClose: {
                viewModel.showAgentforceUI = false
            }
        )
    }
}

#Preview {
    AgentforceMainView(
        viewModel: AgentforceViewModel(),
        settings: Settings()
    )
}

