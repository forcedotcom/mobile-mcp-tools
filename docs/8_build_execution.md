# 8. Build Execution and Validation

The build and validation process is managed by a series of components that work together to execute the native build, report progress, and handle failures gracefully. This document outlines the workflow.

## Workflow Overview

The process begins with the `BuildValidationNode` and flows through a service to an executor tool that handles the platform-specific build commands.

1.  **`BuildValidationNode`**: This is the entry point in the workflow graph for building the mobile application. Its primary responsibility is to orchestrate the build process by calling the `BuildValidationService`. Upon completion, it updates the workflow's shared state with the build result, including a path to the build output log if the build fails.

2.  **`BuildValidationService`**: This service acts as an intermediary. It receives the request from the node and invokes the `sfmobile-native-build-executor` tool, which is responsible for the actual build execution.

3.  **`sfmobile-native-build-executor`**: This tool orchestrates the build process. It uses a strategy pattern to delegate the actual build logic to a platform-specific build strategy. Based on the target platform, it selects either the `IOSBuildStrategy` or the `AndroidBuildStrategy` to execute the build.

4.  **Build Strategies (`IOSBuildStrategy` & `AndroidBuildStrategy`)**: These classes contain the detailed, platform-specific logic for building the application. They are responsible for:
    *   Spawning the appropriate native build command (`xcodebuild` for iOS or `./gradlew` for Android).
    *   Streaming all `stdout` and `stderr` from the build process into a dedicated log file in a temporary directory.
    *   Returning the path to the log file if the build fails, allowing the `BuildRecoveryNode` to analyze the failure.

## Progress Reporting

Throughout the build process, the selected build strategy sends real-time progress updates to the client. This is achieved by sending `notifications/progress` messages that include:

-   A descriptive message about the current build phase (e.g., "Compiling Swift files," "Packaging application").
-   A progress value indicating the current completion percentage.

This provides clear, real-time feedback on the build's status.
