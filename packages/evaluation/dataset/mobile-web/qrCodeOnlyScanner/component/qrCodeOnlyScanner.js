import { LightningElement } from 'lwc';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';

export default class QrCodeOnlyScanner extends LightningElement {
  barcodeScanner;
  scannedValue;
  error;
  isAvailable = false;

  connectedCallback() {
    this.barcodeScanner = getBarcodeScanner();
    this.isAvailable = this.barcodeScanner.isAvailable();
  }

  async handleScanClick() {
    this.scannedValue = null;
    this.error = null;

    try {
      if (this.isAvailable) {
        const scanOptions = {
          barcodeTypes: [this.barcodeScanner.barcodeTypes.QR],
          instructionText: 'Scan a QR code',
          successText: 'Scan complete',
        };

        const result = await this.barcodeScanner.scan(scanOptions);

        if (result && result.length > 0) {
          this.scannedValue = result[0].value;
        } else {
          this.error = 'No QR code was scanned.';
        }
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      // Clean up by dismissing the scanner if it's still visible
      if (this.barcodeScanner) {
        this.barcodeScanner.dismiss();
      }
    }
  }

  handleError(error) {
    if (error.code) {
      switch (error.code) {
        case 'USER_DISMISSED':
          this.error = 'Scanning was canceled by the user.';
          break;
        case 'USER_DENIED_PERMISSION':
          this.error = 'Camera permission was denied. Please enable camera access in settings.';
          break;
        case 'USER_DISABLED_PERMISSION':
          this.error = 'Camera permission is disabled. Please enable camera access in settings.';
          break;
        case 'SERVICE_NOT_ENABLED':
          this.error = 'Barcode scanning is not enabled on this device.';
          break;
        default:
          this.error = error.message || 'An unexpected error occurred during scanning.';
      }
    } else {
      this.error = error.message || 'An unexpected error occurred during scanning.';
    }

    console.error('BarcodeScanner error: ', error);
  }
}
