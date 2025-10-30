/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

/**
 * Shared utility class for requirements generation tools.
 * Contains common instructions and formatting for functional requirements.
 */
export class RequirementsBaseUtility {
  /**
   * Generates common guidance for requirements quality standards and output format.
   * @returns Common requirements guidance text
   */
  public generateCommonRequirementsGuidance(): string {
    return `
## Requirements Quality Standards

- **Specific and Actionable**: Each requirement should clearly define what needs to be built
- **Prioritized**: Assign high/medium/low priority based on business value and user impact
- **Categorized**: Group requirements by functional area
- **Comprehensive**: Cover all aspects needed to deliver the feature
- **Unique IDs**: Use format REQ-XXX for requirement IDs

## Categories to Consider

- **UI/UX**: User interface, navigation, user experience flows
- **Data**: Data models, API integration, data persistence, synchronization
- **Security**: Authentication, authorization, data protection, compliance
- **Performance**: App performance, loading times, memory usage, battery optimization
- **Integration**: Salesforce API integration, third-party services, external systems
- **Platform**: iOS/Android specific features, device capabilities, platform guidelines
- **Offline**: Offline functionality, data synchronization, conflict resolution
`;
  }
}
