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
  findSimulatorByName,
  selectBestSimulator,
} from './simulatorUtils.js';

// Android emulator utilities
export {
  AndroidEmulatorDeviceSchema,
  type AndroidEmulatorDevice,
  type AndroidEmulatorDeviceWithMetadata,
  type FetchAndroidEmulatorsResult,
  fetchAndroidEmulators,
  selectBestEmulator,
  findEmulatorByName,
  hasCompatibleEmulator,
  waitForEmulatorReady,
} from './androidEmulatorUtils.js';

// iOS deployment nodes
export { iOSSelectSimulatorNode } from './iOSSelectSimulatorNode.js';
export { iOSBootSimulatorNode } from './iOSBootSimulatorNode.js';
export { iOSInstallAppNode } from './iOSInstallAppNode.js';
export { iOSLaunchAppNode } from './iOSLaunchAppNode.js';

// Android deployment nodes (same pattern as iOS - no emulator creation)
export { AndroidListDevicesNode } from './androidListDevicesNode.js';
export { AndroidStartEmulatorNode } from './androidStartEmulatorNode.js';
export { AndroidInstallAppNode } from './androidInstallAppNode.js';
export { AndroidLaunchAppNode } from './androidLaunchAppNode.js';
