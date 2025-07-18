import { LightningElement } from 'lwc';
import { getNfcService } from 'lightning/mobileCapabilities';

export default class NfcServiceWriteSimpleText extends LightningElement {
  message = '';
  error;
  successMessage;
  nfcService;

  connectedCallback() {
    this.nfcService = getNfcService();
  }

  get isNfcUnavailable() {
    return !this.nfcService || !this.nfcService.isAvailable();
  }

  handleMessageChange(event) {
    this.message = event.target.value;
    this.clearMessages();
  }

  async handleWriteClick() {
    this.clearMessages();

    if (this.isNfcUnavailable) {
      this.error =
        'NFC is not available on this device. Please use a supported mobile device like a Samsung Galaxy S series or iPhone.';
      return;
    }

    if (!this.message) {
      this.error = 'Please enter a message to write to the NFC tag.';
      return;
    }

    try {
      const options = {
        instructionText: 'Hold your device near the NFC tag to write.',
        successText: 'Message written successfully!',
      };

      // Create the text record to write
      const textRecord = await this.nfcService.createTextRecord({
        text: this.message,
        langId: 'en', // English language code
      });

      // Write the record to the NFC tag
      await this.nfcService.write([textRecord], options);

      this.successMessage = 'Message successfully written to NFC tag!';
    } catch (error) {
      let errorMessage = 'An error occurred while writing to the NFC tag.';

      if (error.code) {
        switch (error.code) {
          case 'NFC_NOT_SUPPORTED':
            errorMessage = 'This device does not support NFC capabilities.';
            break;
          case 'NFC_NOT_ENABLED':
            errorMessage =
              'NFC is turned off on this device. Please enable NFC in your device settings.';
            break;
          case 'USER_DISMISSED':
            errorMessage = 'The operation was cancelled by the user.';
            break;
          case 'TAG_EMPTY':
            errorMessage = 'The NFC tag contains no data or is not writable.';
            break;
          default:
            errorMessage = `Error: ${error.message || error.code}`;
        }
      }

      this.error = errorMessage;
    }
  }

  clearMessages() {
    this.error = undefined;
    this.successMessage = undefined;
  }
}
