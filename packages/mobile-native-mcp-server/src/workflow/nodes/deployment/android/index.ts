/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

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
  createAndroidEmulator,
  type CreateAndroidEmulatorResult,
  installAndroidApp,
  type InstallAndroidAppResult,
  startAndroidEmulator,
  type StartAndroidEmulatorResult,
  launchAndroidApp,
  type LaunchAndroidAppResult,
} from './androidEmulatorUtils.js';

// Android project utilities
export { readApplicationIdFromGradle, readLaunchActivityFromManifest } from './androidUtils.js';

// Android deployment nodes
export { AndroidCreateEmulatorNode } from './androidCreateEmulatorNode.js';
export { AndroidSelectEmulatorNode } from './androidSelectEmulatorNode.js';
export { AndroidStartEmulatorNode } from './androidStartEmulatorNode.js';
export { AndroidInstallAppNode } from './androidInstallAppNode.js';
export { AndroidLaunchAppNode } from './androidLaunchAppNode.js';

// Android deployment routers
export { CheckEmulatorFoundRouter } from './checkEmulatorFoundRouter.js';
export { CheckEmulatorCreatedRouter } from './checkEmulatorCreatedRouter.js';

// Generic fatal error router (used by Android)
export { CheckFatalErrorsRouter } from './checkFatalErrorsRouter.js';
