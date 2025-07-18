import { LightningElement } from 'lwc';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';

export default class BarcodearcodeScannerUsingFrontCamera extends LightningElement {
  barcodeScanner;
  scannedBarcodes = [];
  scanButtonDisabled = false;
  errorMessage;

  connectedCallback() {
    this.barcodeScanner = getBarcodeScanner();

    if (!this.barcodeScanner.isAvailable()) {
      this.scanButtonDisabled = true;
      this.errorMessage = 'Barcode Scanner is not available on this device.';
    }
  }

  handleBeginScan() {
    this.scannedBarcodes = [];
    this.errorMessage = null;

    if (this.barcodeScanner.isAvailable()) {
      const scanOptions = {
        barcodeTypes: [
          this.barcodeScanner.barcodeTypes.QR,
          this.barcodeScanner.barcodeTypes.CODE_128,
          this.barcodeScanner.barcodeTypes.EAN_13,
        ],
        instructionText: 'Scan a barcode',
        successText: 'Scan successful!',
        cameraFacing: 'FRONT', // Use front-facing camera
        previewBarcodeData: true, // Show barcode data in preview
        showSuccessCheckMark: true,
        vibrateOnSuccess: true,
        scannerSize: 'FULLSCREEN',
      };

      this.barcodeScanner
        .scan(scanOptions)
        .then(results => {
          this.handleScanResults(results);
        })
        .catch(error => {
          this.handleScanError(error);
        })
        .finally(() => {
          this.scanButtonDisabled = false;
        });
    } else {
      this.errorMessage = 'Barcode Scanner is not available on this device.';
    }
  }

  handleScanResults(results) {
    if (results.length > 0) {
      this.scannedBarcodes = results.map(result => ({
        type: result.type,
        value: result.value,
      }));
    } else {
      this.errorMessage = 'No barcodes were scanned.';
    }
  }

  handleScanError(error) {
    if (error.code === 'USER_DISMISSED') {
      this.errorMessage = 'Scanning was canceled.';
    } else if (error.code === 'USER_DENIED_PERMISSION') {
      this.errorMessage = 'Camera permission was denied. Please enable it in settings.';
    } else {
      this.errorMessage = 'Error during scanning: ' + error.message;
    }
  }
}
