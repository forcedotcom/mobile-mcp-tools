import { LightningElement } from 'lwc';
import { getBiometricsService } from 'lightning/mobileCapabilities';

export default class BiometricsAuthenticateUser extends LightningElement {
  biometricsService;
  statusMessage = '';
  isLoading = false;
  isError = false;

  connectedCallback() {
    this.biometricsService = getBiometricsService();
  }

  get isButtonDisabled() {
    return !this.biometricsService || !this.biometricsService.isAvailable() || this.isLoading;
  }

  get statusClass() {
    return this.isError ? 'slds-text-color_error' : 'slds-text-color_success';
  }

  async handleAuthenticateClick() {
    this.isLoading = true;
    this.statusMessage = '';
    this.isError = false;

    try {
      if (!this.biometricsService || !this.biometricsService.isAvailable()) {
        throw new Error('Biometric authentication is not available on this device.');
      }

      const options = {
        permissionRequestBody: 'Please authenticate to verify your identity',
        permissionRequestTitle: 'Authentication Required',
        additionalSupportedPolicies: ['PIN_CODE'],
      };

      const isDeviceOwner = await this.biometricsService.checkUserIsDeviceOwner(options);

      if (isDeviceOwner) {
        this.statusMessage = 'Authentication successful! You are the device owner.';
      } else {
        this.isError = true;
        this.statusMessage = 'Authentication failed. You are not the device owner.';
      }
    } catch (error) {
      this.isError = true;
      if (error.code && error.message) {
        this.statusMessage = `Error: ${error.message} (Code: ${error.code})`;
      } else {
        this.statusMessage = `Error: ${error.message || error}`;
      }
    } finally {
      this.isLoading = false;
    }
  }
}
