import { LightningElement } from 'lwc';
import { getDocumentScanner } from 'lightning/mobileCapabilities';

export default class DocumentScannerScanFromPhotoLib extends LightningElement {
  scanner;
  error;
  scannedDocument;
  isScanning = false;
  showText = false;
  showEntities = false;

  // Default options
  scriptHint = 'LATIN';
  entityExtractionLanguage = 'EN';
  extractEntities = false;

  // Available script options
  get scriptOptions() {
    return [
      { label: 'Latin', value: 'LATIN' },
      { label: 'Devanagari', value: 'DEVANAGARI' },
    ];
  }

  // Available language options for entity extraction
  get languageOptions() {
    return [
      { label: 'English', value: 'EN' },
      { label: 'Hindi', value: 'HI' },
    ];
  }

  viewExtractedText() {
    alert(this.scannedDocument.text);
  }

  viewExtractedEntities() {
    alert(JSON.stringify(this.scannedDocument.entities));
  }

  connectedCallback() {
    this.scanner = getDocumentScanner();
  }

  handleScriptChange(event) {
    this.scriptHint = event.detail.value;
  }

  handleLanguageChange(event) {
    this.entityExtractionLanguage = event.detail.value;
  }

  handleEntityExtractionChange(event) {
    this.extractEntities = event.target.checked;
  }

  scanFromLibrary() {
    this.scanDocument('PHOTO_LIBRARY');
  }

  scanFromCamera() {
    this.scanDocument('DEVICE_CAMERA');
  }

  scanDocument(source) {
    // Reset previous results
    this.resetResults();

    if (!this.scanner || !this.scanner.isAvailable()) {
      this.error = 'Document scanner not available on this device';
      return;
    }

    const options = {
      imageSource: source,
      scriptHint: this.scriptHint,
      extractEntities: this.extractEntities,
      entityExtractionLanguageCode: this.entityExtractionLanguage,
      returnImageBytes: true,
      permissionRationaleText: 'This app needs access to your photos to scan documents',
    };

    this.isScanning = true;

    this.scanner
      .scan(options)
      .then(results => {
        this.processScanResults(results);
      })
      .catch(error => {
        this.handleScanError(error);
      })
      .finally(() => {
        this.isScanning = false;
      });
  }

  processScanResults(results) {
    if (results && results.length > 0) {
      this.scannedDocument = results[0];
      this.showText = !!this.scannedDocument.text;
      this.showEntities =
        this.extractEntities &&
        this.scannedDocument.entities &&
        this.scannedDocument.entities.length > 0;
    } else {
      this.error = 'No documents were scanned';
    }
  }

  handleScanError(error) {
    switch (error.code) {
      case 'USER_DENIED_CAMERA_PERMISSION':
        this.error = 'Camera permission was denied';
        break;
      case 'USER_DENIED_PHOTO_LIBRARY_PERMISSION':
        this.error = 'Photo library access was denied';
        break;
      case 'INVALID_INPUT_IMAGE':
        this.error = 'The selected image was invalid or corrupted';
        break;
      case 'USER_DISMISSED':
        // User canceled the operation - no error to show
        break;
      default:
        this.error = error.message || 'An unknown error occurred';
    }
  }

  resetResults() {
    this.error = null;
    this.scannedDocument = null;
    this.showText = false;
    this.showEntities = false;
  }

  get hasError() {
    return !!this.error;
  }

  get hasScannedDocument() {
    return !!this.scannedDocument;
  }
}
