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

import UIKit
import SwiftUI

/**
 * SceneDelegate manages the window and view hierarchy for the iOS scene.
 * 
 * This delegate class handles the lifecycle of individual UI scenes in the app,
 * including window setup, authentication state changes, and root view controller
 * management. It bridges between UIKit scene management and SwiftUI content.
 * 
 * ## Key Responsibilities
 * - Initialize and configure the app window
 * - Handle authentication state changes
 * - Manage root view controller transitions
 * - Set up Salesforce data stores and synchronization
 * - Process URL opening requests within scenes
 * 
 * ## Architecture Integration
 * The SceneDelegate coordinates between:
 * - Salesforce Mobile SDK authentication
 * - SwiftUI-based main interface (AgentforceLander)
 * - UIKit-based initial loading screen
 * - MobileSync data management
 * 
 * ## Authentication Flow
 * 1. Scene connects and registers for auth change notifications
 * 2. App enters foreground and checks authentication status
 * 3. If authenticated, sets up main SwiftUI interface
 * 4. If not authenticated, triggers login flow
 * 5. On auth change, resets view state and updates interface
 */
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    /// The main application window for this scene
    public var window: UIWindow?
    public var settings: Settings?

    func scene(_ scene: UIScene, willConnectTo _: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        window = UIWindow(frame: windowScene.coordinateSpace.bounds)
        window?.windowScene = windowScene

        initializeAppViewState()

    }

    // MARK: - Private methods

    func initializeAppViewState() {
        if !Thread.isMainThread {
            DispatchQueue.main.async {
                self.initializeAppViewState()
            }
            return
        }
        
        let landingViewModel = AgentforceViewModel()

        if settings == nil {
            settings = Settings()
        }

        window?.rootViewController = UIHostingController(rootView: AgentforceMainView(viewModel: landingViewModel, settings: settings!))
        window?.makeKeyAndVisible()
    }

    func setupRootViewController(userActivity _: NSUserActivity?, chat _: Bool = false) {
        let landingViewModel = AgentforceViewModel()

        if settings == nil {
            settings = Settings()
        }

        window?.rootViewController = UIHostingController(rootView: AgentforceMainView(viewModel: landingViewModel, settings: settings!))
        window?.tintColor = UIColor(named: "AccentColor")
    }

    func resetViewState(_ postResetBlock: @escaping () -> Void) {
        if let rootViewController = window?.rootViewController {
            if let _ = rootViewController.presentedViewController {
                rootViewController.dismiss(animated: false, completion: postResetBlock)
                return
            }
            window?.rootViewController = nil
        }
        postResetBlock()
    }

    func handleIntent() {
        setupRootViewController(userActivity: nil, chat: true)
    }
}
