/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckOrgListRouter } from '../../../src/workflow/nodes/checkOrgListRouter.js';
import { createTestState } from '../../utils/stateBuilders.js';

describe('CheckOrgListRouter', () => {
  const orgsFoundNodeName = 'selectOrg';
  const noOrgsFoundNodeName = 'completion';
  const failureNodeName = 'failure';
  let router: CheckOrgListRouter;

  beforeEach(() => {
    router = new CheckOrgListRouter(orgsFoundNodeName, noOrgsFoundNodeName, failureNodeName);
  });

  describe('Constructor', () => {
    it('should initialize with provided node names', () => {
      expect(router).toBeDefined();
    });
  });

  describe('execute() - Fatal errors', () => {
    it('should route to failure when workflowFatalErrorMessages exist', () => {
      const state = createTestState({
        workflowFatalErrorMessages: ['Some error occurred'],
        orgList: [{ username: 'user@example.com', alias: 'myOrg' }],
      });

      const result = router.execute(state);

      expect(result).toBe(failureNodeName);
    });

    it('should prioritize fatal errors over org list', () => {
      const state = createTestState({
        workflowFatalErrorMessages: ['Error'],
        orgList: [{ username: 'user@example.com' }],
      });

      const result = router.execute(state);

      expect(result).toBe(failureNodeName);
    });
  });

  describe('execute() - Orgs found', () => {
    it('should route to orgsFound when orgList has items', () => {
      const state = createTestState({
        orgList: [{ username: 'user@example.com', alias: 'myOrg' }],
      });

      const result = router.execute(state);

      expect(result).toBe(orgsFoundNodeName);
    });

    it('should route to orgsFound when multiple orgs exist', () => {
      const state = createTestState({
        orgList: [
          { username: 'user1@example.com', alias: 'org1' },
          { username: 'user2@example.com', alias: 'org2' },
        ],
      });

      const result = router.execute(state);

      expect(result).toBe(orgsFoundNodeName);
    });
  });

  describe('execute() - No orgs found', () => {
    it('should route to noOrgsFound when orgList is empty', () => {
      const state = createTestState({
        orgList: [],
      });

      const result = router.execute(state);

      expect(result).toBe(noOrgsFoundNodeName);
    });

    it('should route to noOrgsFound when orgList is undefined', () => {
      const state = createTestState({
        orgList: undefined,
      });

      const result = router.execute(state);

      expect(result).toBe(noOrgsFoundNodeName);
    });
  });

  describe('execute() - Edge cases', () => {
    it('should not modify input state', () => {
      const state = createTestState({
        orgList: [{ username: 'user@example.com' }],
      });

      const originalOrgList = state.orgList;
      router.execute(state);

      expect(state.orgList).toBe(originalOrgList);
    });

    it('should produce consistent results for same state', () => {
      const state = createTestState({
        orgList: [{ username: 'user@example.com' }],
      });

      const result1 = router.execute(state);
      const result2 = router.execute(state);

      expect(result1).toBe(result2);
    });

    it('should handle empty workflowFatalErrorMessages as no errors', () => {
      const state = createTestState({
        workflowFatalErrorMessages: [],
        orgList: [{ username: 'user@example.com' }],
      });

      const result = router.execute(state);

      expect(result).toBe(orgsFoundNodeName);
    });
  });
});
