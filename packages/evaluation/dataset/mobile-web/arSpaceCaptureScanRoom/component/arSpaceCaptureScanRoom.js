import { LightningElement } from 'lwc';
import { getARSpaceCapture } from 'lightning/mobileCapabilities';

export default class ArSpaceCaptureScanRoom extends LightningElement {
  arSpaceCapture;
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Scan data
  walls = [];
  doors = [];
  windows = [];
  openings = [];

  connectedCallback() {
    // Initialize the ARSpaceCapture service
    this.arSpaceCapture = getARSpaceCapture();
  }

  get isServiceAvailable() {
    return this.arSpaceCapture && this.arSpaceCapture.isAvailable();
  }

  get hasScanData() {
    return (
      this.walls.length > 0 ||
      this.doors.length > 0 ||
      this.windows.length > 0 ||
      this.openings.length > 0
    );
  }

  async handleScanRoom() {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    // Reset previous scan data
    this.walls = [];
    this.doors = [];
    this.windows = [];
    this.openings = [];

    try {
      const options = {
        permissionRationaleText: 'This app needs camera access to scan your room',
        presentWithAnimation: true,
      };

      const result = await this.arSpaceCapture.scanRoom(options);
      this.processScanResult(result);
    } catch (error) {
      this.handleScanError(error);
    } finally {
      this.isLoading = false;
    }
  }

  processScanResult(result) {
    if (result && result.capturedRooms && result.capturedRooms.length > 0) {
      const room = result.capturedRooms[0];

      // Process walls (simplified for 2D visualization)
      if (room.walls && room.walls.length > 0) {
        this.walls = room.walls.map((wall, index) => {
          // Simplified coordinates for 2D visualization
          return {
            id: `wall-${index}`,
            x1: 100 + index * 80,
            y1: 100,
            x2: 100 + index * 80,
            y2: 300,
          };
        });
      }

      // Process doors (simplified for 2D visualization)
      if (room.doors && room.doors.length > 0) {
        this.doors = room.doors.map((door, index) => {
          return {
            id: `door-${index}`,
            x: 150 + index * 100,
            y: 280,
            width: 30,
            height: 40,
          };
        });
      }

      // Process windows (simplified for 2D visualization)
      if (room.windows && room.windows.length > 0) {
        this.windows = room.windows.map((window, index) => {
          return {
            id: `window-${index}`,
            x: 120 + index * 70,
            y: 150,
            width: 40,
            height: 30,
          };
        });
      }

      // Process openings (simplified for 2D visualization)
      if (room.openings && room.openings.length > 0) {
        this.openings = room.openings.map((opening, index) => {
          return {
            id: `opening-${index}`,
            x: 200 + index * 90,
            y: 200,
            width: 50,
            height: 20,
          };
        });
      }
    }
  }

  handleScanError(error) {
    this.hasError = true;

    switch (error.code) {
      case 'USER_DISMISSED':
        this.errorMessage = 'Scan was cancelled by the user.';
        break;
      case 'USER_DENIED_PERMISSION':
        this.errorMessage =
          'Camera permission was denied. Please enable camera access in settings.';
        break;
      case 'AR_NOT_SUPPORTED':
        this.errorMessage = 'AR capabilities are not available on this device.';
        break;
      case 'SERVICE_NOT_ENABLED':
        this.errorMessage = 'AR Space Capture service is not enabled.';
        break;
      case 'UNKNOWN_REASON':
        this.errorMessage = `An unknown error occurred: ${error.message}`;
        break;
      default:
        this.errorMessage = 'An unexpected error occurred during scanning.';
    }
  }
}
