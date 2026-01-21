//
//  CustomThemeManager.swift
//  AgentforceDemo
//
//  Created by Alex Sikora on 10/7/25.
//  Copyright © 2025 AgentforceDemoOrganizationName. All rights reserved.
//
import AgentforceSDK
import SwiftUI

class CustomThemeManager: AgentforceThemeManager {
    var colorScheme: ColorScheme = .light
    var overrideColorSchemeWithSystem: Bool {
        // Return true for system-adaptive themes, false for fixed themes
        return false
    }
    // MARK: - Theme Components
    var colors: AgentforceTheme.Colors {
        return CustomLightColors()
    }
    
    // MARK: - Protocol Requirements (not currently used by UI)
    var fonts: AgentforceTheme.Fonts {
        return AgentforceDefaultThemeManager().fonts
    }
    var dimensions: AgentforceTheme.Dimensions {
        return AgentforceDefaultThemeManager().dimensions // Use default implementation
    }
    
    var shapes: AgentforceTheme.Shapes {
        return AgentforceDefaultThemeManager().shapes // Use default implementation
    }
    
    // MARK: - AgentforceAgentNameCustomizable
    var customAgentNames: [AgentNameType : String?] {
        return [:]
    }
    
    // MARK: - AgentforceAvatarCustomizable
    var avatarConfiguration: [AvatarType : String?] {
        return [:]
    }
}

class CustomLightColors: AgentforceTheme.Colors {
    var surface1: Color
    var surface2: Color
    var onSurface1: Color
    var onSurface2: Color
    var onSurface3: Color
    var surfaceContainer1: Color
    var surfaceContainer2: Color
    var surfaceContainer3: Color
    var border1: Color
    var border2: Color
    var borderInverse2: Color
    var borderDisabled1: Color
    var accent1: Color
    var accent2: Color
    var accent3: Color
    var accent4: Color
    var accent5: Color
    var accent6: Color
    var accent7: Color
    var accentContainer1: Color
    var onAccent1: Color
    var error1: Color
    var errorContainer1: Color
    var onError1: Color
    var borderError1: Color
    var successContainer1: Color
    var onSuccess1: Color
    var borderSuccess1: Color
    var disabledContainer1: Color
    var disabledContainer2: Color
    var onDisabled1: Color
    var onDisabled2: Color
    var brandBase50: Color
    var errorBase50: Color
    var feedbackWarning1: Color
    var feedbackWarningContainer1: Color
    var info1: Color
    var infoContainer1: Color
    var foregroundColor: Color
    var backgroundColor: Color
    var borderAgentforce1: Color
    
    init() {
        // Turtle Green - Main turtle skin color
        let turtleGreen = Color(red: 0.44, green: 0.66, blue: 0.36) // #70A85C
        let turtleGreenDark = Color(red: 0.30, green: 0.50, blue: 0.25) // #4D8040
        let turtleGreenLight = Color(red: 0.58, green: 0.76, blue: 0.50) // #94C280
        
        // Plastron Yellow - Belly/chest color
        let plastronYellow = Color(red: 0.96, green: 0.87, blue: 0.64) // #F5DEA3
        let plastronYellowDark = Color(red: 0.90, green: 0.78, blue: 0.50) // #E5C780
        
        // Shell Brown - Turtle shell color
        let shellBrown = Color(red: 0.45, green: 0.32, blue: 0.20) // #735233
        let shellBrownDark = Color(red: 0.35, green: 0.24, blue: 0.15) // #593D26
        
        // Bandana Colors - Each turtle's signature color
        let leonardoBlue = Color(red: 0.20, green: 0.45, blue: 0.80) // #3373CC - Leonardo
        let raphaelRed = Color(red: 0.85, green: 0.20, blue: 0.20) // #D93333 - Raphael
        let michelangeloOrange = Color(red: 0.95, green: 0.55, blue: 0.20) // #F28C33 - Michelangelo
        let donatelloPurple = Color(red: 0.60, green: 0.30, blue: 0.75) // #994DBF - Donatello
        
        // Sewer/Shadow colors
        let sewerGray = Color(red: 0.25, green: 0.27, blue: 0.28) // #404547
        let shadowGreen = Color(red: 0.15, green: 0.25, blue: 0.13) // #264021
        
        // Surface colors - Using turtle green variations and plastron
        self.surface1 = plastronYellow
        self.surface2 = turtleGreenLight
        self.onSurface1 = shadowGreen
        self.onSurface2 = sewerGray
        self.onSurface3 = shellBrownDark
        
        // Surface containers - Mix of turtle colors
        self.surfaceContainer1 = turtleGreen
        self.surfaceContainer2 = plastronYellowDark
        self.surfaceContainer3 = turtleGreenDark
        
        // Borders - Shell and darker greens
        self.border1 = shellBrown
        self.border2 = turtleGreenDark
        self.borderInverse2 = plastronYellow
        self.borderDisabled1 = Color(red: 0.70, green: 0.70, blue: 0.70)
        
        // Accents - The four turtle bandana colors!
        self.accent1 = leonardoBlue // Leonardo - Leader
        self.accent2 = raphaelRed // Raphael - Tough guy
        self.accent3 = michelangeloOrange // Michelangelo - Party dude
        self.accent4 = donatelloPurple // Donatello - Tech genius
        self.accent5 = turtleGreen // Turtle power!
        self.accent6 = turtleGreenLight // Additional accent
        self.accent7 = shellBrown // Shell accent
        self.accentContainer1 = turtleGreenLight
        self.onAccent1 = .white
        
        // Error states - Using Raphael's red (he's the hot-headed one!)
        self.error1 = raphaelRed
        self.errorContainer1 = Color(red: 0.98, green: 0.85, blue: 0.85) // Light red
        self.onError1 = .white
        self.borderError1 = Color(red: 0.70, green: 0.15, blue: 0.15)
        
        // Success states - Turtle green (Cowabunga!)
        self.successContainer1 = turtleGreenLight
        self.onSuccess1 = shadowGreen
        self.borderSuccess1 = turtleGreenDark
        
        // Disabled states
        self.disabledContainer1 = Color(red: 0.85, green: 0.85, blue: 0.85)
        self.disabledContainer2 = Color(red: 0.75, green: 0.75, blue: 0.75)
        self.onDisabled1 = Color(red: 0.60, green: 0.60, blue: 0.60)
        self.onDisabled2 = Color(red: 0.50, green: 0.50, blue: 0.50)
        
        // Brand colors
        self.brandBase50 = turtleGreen
        self.errorBase50 = raphaelRed
        
        // Feedback colors
        self.feedbackWarning1 = michelangeloOrange // Orange like Mikey's bandana
        self.feedbackWarningContainer1 = Color(red: 0.99, green: 0.92, blue: 0.85)
        
        // Info colors - Using Leonardo's blue (he's the smart leader)
        self.info1 = leonardoBlue
        self.infoContainer1 = Color(red: 0.85, green: 0.92, blue: 0.98)
        
        // Foreground and Background
        self.foregroundColor = shadowGreen
        self.backgroundColor = plastronYellow
        
        self.borderAgentforce1 = leonardoBlue
    }
}
