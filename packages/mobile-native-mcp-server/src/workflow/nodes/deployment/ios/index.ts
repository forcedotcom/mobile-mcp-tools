/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// iOS simulator utilities
export {
  SimulatorDeviceSchema,
  SimctlDevicesOutputSchema,
  type SimulatorDevice,
  type SimulatorDeviceWithRuntime,
  type FetchSimulatorDevicesResult,
  fetchSimulatorDevices,
  parseSimctlDevicesJson,
  parseIOSVersionToNumber,
  extractIOSVersion,
  findSimulatorByName,
  selectBestSimulator,
  verifySimulatorResponsive,
  waitForSimulatorReady,
  openSimulatorApp,
  readBundleIdFromProject,
  bootIOSSimulator,
  type BootIOSSimulatorResult,
  installIOSApp,
  type InstallIOSAppResult,
  launchIOSApp,
  type LaunchIOSAppResult,
} from './simulatorUtils.js';

// iOS deployment nodes
export { iOSSelectSimulatorNode } from './iOSSelectSimulatorNode.js';
export { iOSBootSimulatorNode } from './iOSBootSimulatorNode.js';
export { iOSInstallAppNode } from './iOSInstallAppNode.js';
export { iOSLaunchAppNode } from './iOSLaunchAppNode.js';
