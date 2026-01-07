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
    var templateAppName = 'AgentforceDemo';
    var templatePackageName = 'com.salesforce.AgentforceDemo';
    var templateOrganization = 'AgentforceDemoOrganizationName';

    // Template properties for enhanced in-app chat deployment
    var templateAgentID = 'PLACEHOLDER_AGENT_ID';
    var templateDeveloperName = 'PLACEHOLDER_ES_DEVELOPER_NAME';
    var templateOrganizationID = 'PLACEHOLDER_ORGANIZATION_ID';
    var templateApiURL = 'PLACEHOLDER_API_URL';

    // Key files
    var templatePodfile = 'Podfile';
    var templateProjectDir = templateAppName + '.xcodeproj';
    var templateProjectFile = path.join(templateProjectDir, 'project.pbxproj');
    var templatePackageJsonFile = 'package.json';
    var templateSchemeFile = path.join(templateAppName + '.xcodeproj', 'xcshareddata', 'xcschemes', templateAppName + '.xcscheme');
    var templateEntitlementsFile = path.join(templateAppName, templateAppName + '.entitlements');
    var templateSettingsFile = path.join(templateAppName, 'Classes', 'Settings.swift');

    //
    // Replace in files
    //

    // package name
    replaceInFiles(templatePackageName, config.packagename, [templateProjectFile, templateEntitlementsFile]);

    // app name
    replaceInFiles(templateAppName, config.appname, [templatePodfile, templatePackageJsonFile, templateProjectFile, templateSchemeFile, templateEntitlementsFile]);

    // org name
    replaceInFiles(templateOrganization, config.organization, [templateProjectFile]);

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

    // Inject template properties into Settings.swift
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

        var agentID = getTemplatePropertyValue(templateProperties.agentID);
        if (agentID) {
            replaceInFiles(templateAgentID, agentID, [templateSettingsFile]);
        }
    }

    //
    // Rename/move files
    //
    moveFile(templateSchemeFile, path.join(templateAppName + '.xcodeproj', 'xcshareddata', 'xcschemes', config.appname + '.xcscheme'));
    moveFile(templateEntitlementsFile, path.join(templateAppName, config.appname + '.entitlements'));
    moveFile(templateProjectDir, config.appname + '.xcodeproj');
    moveFile(templateAppName, config.appname);

    //
    // Run install.js
    //
    require('./install');

    // Return paths of workspace and file with oauth config
    return {
        workspacePath: config.appname + ".xcworkspace",
        bootconfigFile: path.join(config.appname, 'bootconfig.plist')
    };

}

//
// Exports
//
module.exports = {
    appType: 'native_swift',
    prepare: prepare
};
