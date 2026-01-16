rootProject.name = "AndroidAgentforceKotlinTemplate"

include(":app")

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        maven { url = uri("https://opensource.salesforce.com/AgentforceMobileSDK-Android/agentforce-sdk-repository") }
        maven { url = uri("https://s3.amazonaws.com/salesforce-async-messaging-experimental/public/android") }
    }
}
