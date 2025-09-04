# Mobile Web MCP Server Testing Guide

This document provides comprehensive testing instructions for all tools in the `@salesforce/mobile-web-mcp-server` package. Each tool should be tested with the provided prompts to ensure proper functionality and output quality.

## Scoring Criteria

Each test prompt should be evaluated using the following scoring system:

- **Excellent**: Tool provides complete, accurate, and well-structured output with all expected elements
- **Good**: Tool provides mostly accurate output with minor issues or missing non-critical elements
- **Needs Improvement**: Tool provides partial output with significant issues or missing critical elements
- **Broken**: Tool fails to execute, returns errors, or provides completely incorrect output

## Native Capabilities Tools

### 1. App Review Tool (`sfmobile-web-app-review`)

**Purpose**: Provides implementation guidance for app store review functionality in Lightning Web Components.

#### Test Prompts:

**Test 1.1 - Basic Implementation Request**
```
Generate a Lightning Web Component named 'mobileAppReview' that implements mobile app store review functionality for mobile devices.
```
**Expected Output**: 
- Uses proper Nimbus APIs from app review service
- Implementation examples with proper error handling
- Mobile-specific considerations and best practices

**Test 1.2 - Platform-Specific Guidance**
```
Generate a Lightning Web Component named 'crossPlatformAppReview' that implements mobile app review prompts that work differently on iOS and Android mobile platforms.
```
**Expected Output**:
- Platform-specific API differences
- Conditional implementation strategies
- Testing recommendations for both platforms

### 2. AR Space Capture Tool (`sfmobile-web-ar-space-capture`)

**Purpose**: Provides guidance for implementing AR space data capture functionality.

#### Test Prompts:

**Test 2.1 - AR Implementation Basics**
```
Generate a Lightning Web Component named 'arSpaceCapture' that implements mobile AR space capture functionality for capturing 3D room data on mobile devices.
```
**Expected Output**:
- Uses proper Nimbus APIs from AR space capture service
- 3D space capture implementation patterns
- Data handling and storage recommendations

**Test 2.2 - Performance Optimization**
```
Generate a Lightning Web Component named 'optimizedArCapture' that implements mobile AR space capture with performance optimizations for mobile web environments.
```
**Expected Output**:
- Performance optimization strategies
- Memory management recommendations
- Battery usage considerations

### 3. Barcode Scanner Tool (`sfmobile-web-barcode-scanner`)

**Purpose**: Provides implementation guidance for barcode scanning functionality.

#### Test Prompts:

**Test 3.1 - Basic Barcode Scanning**
```
Generate a Lightning Web Component named 'mobileBarcodeScanner' that implements mobile barcode scanning capability for mobile devices.
```
**Expected Output**:
- Uses proper Nimbus APIs from barcode scanner service
- Implementation examples with camera access
- Error handling for permission issues

**Test 3.2 - Multiple Barcode Formats**
```
Generate a Lightning Web Component named 'multiFormatBarcodeScanner' that supports QR codes, UPC codes, and Code 128 formats on mobile devices.
```
**Expected Output**:
- Format configuration options
- Multi-format scanning implementation
- Format-specific handling logic

### 4. Biometrics Tool (`sfmobile-web-biometrics`)

**Purpose**: Provides implementation guidance for biometric authentication.

#### Test Prompts:

**Test 4.1 - Biometric Authentication Setup**
```
Generate a Lightning Web Component named 'biometricAuth' that implements mobile biometric authentication using mobile fingerprint and face recognition. The component should handle all possible failure scenarios including hardware not available, biometrics not configured, service not enabled, and unknown errors. Include proper error messaging and fallback authentication methods.
```
**Expected Output**:
- Uses proper Nimbus APIs from biometrics service (getBiometricsService, isBiometricsReady, checkUserIsDeviceOwner)
- Handles BiometricsServiceFailureCode scenarios: HARDWARE_NOT_AVAILABLE, NOT_CONFIGURED, SERVICE_NOT_ENABLED, UNKNOWN_REASON
- Implements PIN_CODE policy as fallback when biometrics unavailable
- Provides user-friendly error messages for each failure scenario

**Test 4.2 - Security Best Practices**
```
Generate a Lightning Web Component named 'secureBiometricAuth' that implements biometric authentication with mobile security best practices. Include custom permission request titles and bodies, support for PIN_CODE policy, and proper handling of biometric readiness checks before attempting authentication.
```
**Expected Output**:
- Implements BiometricsServiceOptions with permissionRequestBody and permissionRequestTitle
- Uses isBiometricsReady() before attempting authentication
- Handles additionalSupportedPolicies including PIN_CODE fallback
- Provides secure error handling without exposing sensitive information

### 5. Calendar Tool (`sfmobile-web-calendar`)

**Purpose**: Provides guidance for accessing and managing device calendar functionality.

#### Test Prompts:

**Test 5.1 - Calendar Integration**
```
Generate a Lightning Web Component named 'mobileCalendarIntegration' that integrates mobile device calendar functionality to read and create calendar events. Handle permission denials, calendar not found errors, and service not enabled scenarios. Include support for recurring events, alarms, and attendees.
```
**Expected Output**:
- Uses proper Nimbus APIs from calendar service (getCalendarService, getCalendars, getEvents, addEvent)
- Handles CalendarServiceFailureCode scenarios: USER_DENIED_PERMISSION, NOT_FOUND, SERVICE_NOT_ENABLED, UNKNOWN_REASON
- Implements CalendarEvent with recurrenceRules, alarms, and attendees
- Supports read-only calendar detection via allowsContentModifications

**Test 5.2 - Event Synchronization**
```
Generate a Lightning Web Component named 'calendarEventSync' that synchronizes events between the LWC and mobile device calendar while handling conflicts. Support updating and removing recurring events with proper span handling (ThisEvent vs ThisAndFollowingEvents).
```
**Expected Output**:
- Implements updateEvent and removeEvent with Span options
- Handles recurring event modifications with RecurrenceRule support
- Manages calendar permissions with permissionRationaleText
- Provides conflict resolution for calendar availability and event status

### 6. Contacts Tool (`sfmobile-web-contacts`)

**Purpose**: Provides guidance for accessing and managing device contacts.

#### Test Prompts:

**Test 6.1 - Contact Access Implementation**
```
Generate a Lightning Web Component named 'mobileContactAccess' that implements mobile contact access functionality to read and search mobile device contacts. Handle all permission scenarios including user dismissal, permission denial, disabled permissions, and restricted access. Include proper Android permission rationale messaging.
```
**Expected Output**:
- Uses proper Nimbus APIs from contacts service (getContactsService, getContacts)
- Handles ContactsServiceFailureCode scenarios: USER_DISMISSED, USER_DENIED_PERMISSION, USER_DISABLED_PERMISSION, USER_RESTRICTED_PERMISSION, SERVICE_NOT_ENABLED, UNKNOWN_REASON
- Implements ContactsServiceOptions with permissionRationaleText for Android
- Processes complete Contact structure with name, phoneNumbers, emails, addresses, organizations

**Test 6.2 - Contact Creation and Updates**
```
Generate a Lightning Web Component named 'contactManager' that creates and updates contacts on the mobile device from a mobile LWC application. Handle save operation failures and validate all contact fields including complex structures like addresses and organizations.
```
**Expected Output**:
- Uses putContact API with proper Contact structure validation
- Handles SAVE_OPERATION_FAILED error scenarios
- Validates ContactName, ContactAddress, ContactOrganization, and ContactLabeledValue structures
- Implements proper error recovery for failed contact save operations

### 7. Document Scanner Tool (`sfmobile-web-document-scanner`)

**Purpose**: Provides implementation guidance for document scanning functionality.

#### Test Prompts:

**Test 7.1 - Document Scanning Setup**
```
Generate a Lightning Web Component named 'mobileDocumentScanner' that implements mobile camera-based document capture and processing.
```
**Expected Output**:
- Uses proper Nimbus APIs from document scanner service
- Image capture and processing workflows
- OCR integration recommendations

**Test 7.2 - Multi-page Document Handling**
```
Generate a Lightning Web Component named 'multiPageDocumentScanner' that implements mobile multi-page document scanning with automatic edge detection and image enhancement.
```
**Expected Output**:
- Multi-page scanning workflows
- Image processing techniques
- Quality optimization methods

### 8. Geofencing Tool (`sfmobile-web-geofencing`)

**Purpose**: Provides guidance for implementing location-based geofencing functionality.

#### Test Prompts:

**Test 8.1 - Geofencing Implementation**
```
Generate a Lightning Web Component named 'mobileGeofencing' that implements mobile geofencing to trigger actions when users enter or exit specific locations.
```
**Expected Output**:
- Uses proper Nimbus APIs from geofencing service
- Location monitoring implementation
- Event handling for enter/exit triggers

**Test 8.2 - Battery Optimization**
```
Generate a Lightning Web Component named 'batteryOptimizedGeofencing' that implements mobile geofencing while minimizing battery drain on mobile devices.
```
**Expected Output**:
- Power-efficient monitoring strategies
- Background processing considerations
- Location accuracy vs. battery trade-offs

### 9. Location Tool (`sfmobile-web-location`)

**Purpose**: Provides guidance for accessing device location services.

#### Test Prompts:

**Test 9.1 - Location Services Setup**
```
Generate a Lightning Web Component named 'mobileLocationServices' that implements mobile location services to get the user's current position and track location changes. Handle location service disabled scenarios, permission denials, and provide high accuracy options with proper battery considerations.
```
**Expected Output**:
- Uses proper Nimbus APIs from location service (getLocationService, getCurrentPosition, startWatchingPosition)
- Handles LocationServiceFailureCode scenarios: LOCATION_SERVICE_DISABLED, USER_DENIED_PERMISSION, USER_DISABLED_PERMISSION, SERVICE_NOT_ENABLED, UNKNOWN_REASON
- Implements LocationServiceOptions with enableHighAccuracy and permissionRationaleText
- Processes complete LocationResult with Coordinates including accuracy, altitude, speed, and heading data

**Test 9.2 - Location History and Tracking**
```
Generate a Lightning Web Component named 'locationHistoryTracker' that implements mobile location history tracking with configurable update intervals and accuracy requirements. Include proper subscription management with startWatchingPosition and stopWatchingPosition, handling callback failures gracefully.
```
**Expected Output**:
- Implements location subscription management with watchId tracking
- Handles callback-based LocationServiceFailure scenarios in startWatchingPosition
- Manages high accuracy vs battery life trade-offs with enableHighAccuracy option
- Provides proper cleanup with stopWatchingPosition to prevent memory leaks

### 10. NFC Tool (`sfmobile-web-nfc`)

**Purpose**: Provides implementation guidance for NFC functionality.

#### Test Prompts:

**Test 10.1 - NFC Implementation**
```
Generate a Lightning Web Component named 'mobileNfcReader' that implements mobile NFC functionality for reading NFC tags and peer-to-peer communication.
```
**Expected Output**:
- Uses proper Nimbus APIs from NFC service
- Tag reading and writing implementation
- P2P communication examples

**Test 10.2 - NFC Payment Integration**
```
Generate a Lightning Web Component named 'nfcPaymentProcessor' that integrates mobile NFC-based payment functionality while ensuring security and compliance.
```
**Expected Output**:
- Secure NFC payment implementation
- Compliance requirements
- Security best practices

### 11. Payments Tool (`sfmobile-web-payments`)

**Purpose**: Provides guidance for implementing mobile payment processing.

#### Test Prompts:

**Test 11.1 - Payment Processing Setup**
```
Generate a Lightning Web Component named 'mobilePaymentProcessor' that implements mobile payment processing to handle credit card payments and digital wallets.
```
**Expected Output**:
- Uses proper Nimbus APIs from payments service
- Payment flow implementation
- Security and PCI compliance guidance

**Test 11.2 - Multiple Payment Methods**
```
Generate a Lightning Web Component named 'multiPaymentMethodProcessor' that supports multiple mobile payment methods including Apple Pay, Google Pay, and traditional card payments.
```
**Expected Output**:
- Multi-payment method integration
- Platform-specific implementations
- Fallback mechanisms

## Mobile Offline Tools

### 13. Offline Guidance Tool (`sfmobile-web-offline-guidance`)

**Purpose**: Provides expert instructions for offline compatibility analysis and implementation.

#### Test Prompts:

**Test 13.1 - Conditional Rendering Violation Analysis**
```
Analyze this Lightning Web Component for mobile offline compatibility issues with conditional rendering:

**Component: accountStatusDisplay.html**
```html
<template>
    <div class="account-container">
        <div lwc:if={account.isActive}>
            <h2>Active Account</h2>
            <p lwc:if={account.hasBalance}>Balance: {account.balance}</p>
            <p lwc:elseif={account.isPending}>Status: Pending Payment</p>
            <p lwc:else>No balance information available</p>
        </div>
        <div lwc:elseif={account.isSuspended}>
            <h2>Suspended Account</h2>
            <lightning-icon icon-name="warning" size="small"></lightning-icon>
        </div>
        <div lwc:else>
            <h2>Inactive Account</h2>
        </div>
    </div>
</template>
```

**Test 13.2 - GraphQL Wire Violation Analysis**
Analyze this Lightning Web Component for mobile offline compatibility issues:

**Component: contactDataViewer.js**
```javascript
import { LightningElement, api, wire } from 'lwc';
import { gql, graphql } from 'lightning/uiGraphQLApi';

export default class ContactDataViewer extends LightningElement {
    @api recordId;
    
    @wire(graphql, {
        query: gql`
            query getContactWithAccounts($recordId: ID!) {
                uiapi {
                    query {
                        Contact(where: { Id: { eq: $recordId } }) {
                            edges {
                                node {
                                    Id
                                    Name { value }
                                    Email { value }
                                    Account {
                                        Name { value }
                                        Industry { value }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `,
        variables: '$variables'
    })
    contactData;
    
    get variables() {
        return { recordId: this.recordId };
    }
}
```
**Expected Output**:
- Expert analysis identifying inline GraphQL query violations
- Specific extraction guidance for the query to separate getter method
- Recommended refactoring approach maintaining functionality
- Grounding about offline data priming requirements
