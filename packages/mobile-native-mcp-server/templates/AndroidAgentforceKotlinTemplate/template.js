/*
 * Copyright (c) 2019-present, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Customize template (inject app name, package name, organization etc)
 *
 * @return result map with
 *   workspace
 *   bootconfigFile
 */
function prepare(config, replaceInFiles, moveFile, removeFile) {

    var path = require('path');

    // Values in template
    var templateAppName = 'AndroidAgentforceKotlinTemplate';
    var templatePackageName = 'com.salesforce.agentforcedemo';

    // Template properties for enhanced in-app chat deployment
    var templateDeveloperName = 'PLACEHOLDER_ES_DEVELOPER_NAME';
    var templateOrganizationID = 'PLACEHOLDER_ORGANIZATION_ID';
    var templateApiURL = 'PLACEHOLDER_API_URL';
    var templateAgentID = 'PLACEHOLDER_AGENT_ID';

    // Key files
    var templatePackageJsonFile = 'package.json';
    var templateSettingsGradle = 'settings.gradle.kts';
    var templateBuildGradleFile = path.join('app', 'build.gradle.kts');
    var templateStringsXmlFile = path.join('app', 'src', 'main', 'res', 'values', 'strings.xml');
    var templateSettingsFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'Settings.kt');
    var templateMainActivityFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'MainActivity.kt');
    var templateMainApplicationFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'MainApplication.kt');
    var templateAgentforceViewModelFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'AgentforceViewModel.kt');
    var templateCredentialProviderFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'CredentialProvider.kt');
    var templateThemeFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'ui', 'theme', 'Theme.kt');
    var templateNavigationFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'navigation', 'Navigation.kt');
    var templateHomeScreenFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'screens', 'HomeScreen.kt');
    var templateChatScreenFile = path.join('app', 'src', 'main', 'java', 'com', 'salesforce', 'agentforcedemo', 'screens', 'ChatScreen.kt');

    // All Kotlin source files for package name replacement
    var kotlinSourceFiles = [
        templateMainActivityFile,
        templateMainApplicationFile,
        templateAgentforceViewModelFile,
        templateCredentialProviderFile,
        templateSettingsFile,
        templateThemeFile,
        templateNavigationFile,
        templateHomeScreenFile,
        templateChatScreenFile
    ];

    //
    // Replace in files
    //

    // app name
    replaceInFiles(templateAppName, config.appname, [templatePackageJsonFile, templateSettingsGradle, templateStringsXmlFile]);

    // package name
    replaceInFiles(templatePackageName, config.packagename, [templateBuildGradleFile, templateStringsXmlFile].concat(kotlinSourceFiles));

    // Enhanced in-app chat deployment properties
    // Helper function to extract value from either simple value or metadata object
    function getTemplatePropertyValue(prop) {
        if (!prop) return null;
        return typeof prop === 'object' && prop.value !== undefined ? prop.value : prop;
    }

    // Extract template properties from config
    // Supports: config.templateProperties or config.templatePrerequisites.templateProperties
    var templateProperties = config.templateProperties ||
        (config.templatePrerequisites && config.templatePrerequisites.templateProperties);

    // Inject template properties into Settings.kt
    if (templateProperties) {
        var developerName = getTemplatePropertyValue(templateProperties.developerName);
        if (developerName) {
            replaceInFiles(templateDeveloperName, developerName, [templateSettingsFile]);
        }

        var organizationId = getTemplatePropertyValue(templateProperties.organizationId);
        if (organizationId) {
            replaceInFiles(templateOrganizationID, organizationId, [templateSettingsFile]);
        }

        var apiURL = getTemplatePropertyValue(templateProperties.apiURL);
        if (apiURL) {
            replaceInFiles(templateApiURL, apiURL, [templateSettingsFile]);
        }

        var agentId = getTemplatePropertyValue(templateProperties.agentId);
        if (agentId) {
            replaceInFiles(templateAgentID, agentId, [templateSettingsFile]);
        }
    }

    //
    // Rename/move files - move Kotlin files to new package directory
    //
    var tmpPathMainActivityFile = path.join('app', 'src', 'MainActivity.kt');
    var tmpPathMainApplicationFile = path.join('app', 'src', 'MainApplication.kt');
    var tmpPathAgentforceViewModelFile = path.join('app', 'src', 'AgentforceViewModel.kt');
    var tmpPathCredentialProviderFile = path.join('app', 'src', 'CredentialProvider.kt');
    var tmpPathSettingsFile = path.join('app', 'src', 'Settings.kt');
    var tmpPathThemeFile = path.join('app', 'src', 'Theme.kt');
    var tmpPathNavigationFile = path.join('app', 'src', 'Navigation.kt');
    var tmpPathHomeScreenFile = path.join('app', 'src', 'HomeScreen.kt');
    var tmpPathChatScreenFile = path.join('app', 'src', 'ChatScreen.kt');

    moveFile(templateMainActivityFile, tmpPathMainActivityFile);
    moveFile(templateMainApplicationFile, tmpPathMainApplicationFile);
    moveFile(templateAgentforceViewModelFile, tmpPathAgentforceViewModelFile);
    moveFile(templateCredentialProviderFile, tmpPathCredentialProviderFile);
    moveFile(templateSettingsFile, tmpPathSettingsFile);
    moveFile(templateThemeFile, tmpPathThemeFile);
    moveFile(templateNavigationFile, tmpPathNavigationFile);
    moveFile(templateHomeScreenFile, tmpPathHomeScreenFile);
    moveFile(templateChatScreenFile, tmpPathChatScreenFile);

    removeFile(path.join('app', 'src', 'main', 'java', 'com'));

    var newPackagePath = ['app', 'src', 'main', 'java'].concat(config.packagename.split('.'));
    moveFile(tmpPathMainActivityFile, path.join.apply(null, newPackagePath.concat(['MainActivity.kt'])));
    moveFile(tmpPathMainApplicationFile, path.join.apply(null, newPackagePath.concat(['MainApplication.kt'])));
    moveFile(tmpPathAgentforceViewModelFile, path.join.apply(null, newPackagePath.concat(['AgentforceViewModel.kt'])));
    moveFile(tmpPathCredentialProviderFile, path.join.apply(null, newPackagePath.concat(['CredentialProvider.kt'])));
    moveFile(tmpPathSettingsFile, path.join.apply(null, newPackagePath.concat(['Settings.kt'])));
    moveFile(tmpPathThemeFile, path.join.apply(null, newPackagePath.concat(['ui', 'theme', 'Theme.kt'])));
    moveFile(tmpPathNavigationFile, path.join.apply(null, newPackagePath.concat(['navigation', 'Navigation.kt'])));
    moveFile(tmpPathHomeScreenFile, path.join.apply(null, newPackagePath.concat(['screens', 'HomeScreen.kt'])));
    moveFile(tmpPathChatScreenFile, path.join.apply(null, newPackagePath.concat(['screens', 'ChatScreen.kt'])));

    //
    // Run install.js
    //
    require('./install');

    // Return paths of workspace and file with oauth config (not used for this template)
    return {
        workspacePath: '',
        bootconfigFile: ''
    };
}

//
// Exports
//
module.exports = {
    appType: 'native_kotlin',
    prepare: prepare
};
