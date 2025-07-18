import { LightningElement } from 'lwc';
import { getGeofencingService } from 'lightning/mobileCapabilities';

export default class GeofencingServiceMonitoringRegion extends LightningElement {
  // Default values (San Francisco coordinates)
  latitude = 37.7749;
  longitude = -122.4194;
  radius = 100;
  entryMessage = 'You have entered the geofenced area';
  exitMessage = 'You have exited the geofenced area';

  geofenceId = '';
  isMonitoring = false;
  isServiceUnavailable = true;
  statusMessage = 'Initializing...';
  errorMessage = '';
  notificationMessage = '';
  geofencingService;

  get isSetGeofenceDisabled() {
    return this.isServiceUnavailable || this.isMonitoring;
  }

  get isStopMonitoringDisabled() {
    return this.isServiceUnavailable || !this.isMonitoring;
  }

  connectedCallback() {
    this.initializeGeofencingService();
  }

  initializeGeofencingService() {
    this.geofencingService = getGeofencingService();

    if (this.geofencingService && this.geofencingService.isAvailable()) {
      this.isServiceUnavailable = false;
      this.statusMessage = 'Ready to set geofence';
      console.log('GeofencingService is available');
    } else {
      this.isServiceUnavailable = true;
      this.statusMessage = 'GeofencingService not available on this device';
      console.error('GeofencingService is not available');
    }
  }

  requestPermission() {
    if (!this.geofencingService || !this.geofencingService.isAvailable()) {
      this.showError('Geofencing service is not available');
      return;
    }

    // On Android, permissions are typically requested when starting to monitor
    this.showNotification('Location permission will be requested when setting the geofence');
  }

  setGeofence() {
    if (!this.geofencingService || !this.geofencingService.isAvailable()) {
      this.showError('Geofencing service is not available');
      return;
    }

    const geofence = {
      latitude: parseFloat(this.latitude),
      longitude: parseFloat(this.longitude),
      radius: parseInt(this.radius, 10),
      notifyOnEntry: true,
      notifyOnExit: true,
      message: this.entryMessage,
      triggerOnce: false,
    };

    // Validate geofence parameters
    if (isNaN(geofence.latitude) || geofence.latitude < -90 || geofence.latitude > 90) {
      this.showError('Invalid latitude. Must be between -90 and 90');
      return;
    }

    if (isNaN(geofence.longitude) || geofence.longitude < -180 || geofence.longitude > 180) {
      this.showError('Invalid longitude. Must be between -180 and 180');
      return;
    }

    if (isNaN(geofence.radius) || geofence.radius < 10) {
      this.showError('Invalid radius. Must be at least 10 meters');
      return;
    }

    this.statusMessage = 'Setting geofence...';
    this.isMonitoring = true;

    this.geofencingService
      .startMonitoringGeofence(geofence)
      .then(id => {
        this.geofenceId = id;
        this.statusMessage = 'Geofence is active';
        this.showNotification('Geofence monitoring started successfully');
        console.log('Geofence monitoring started with ID:', id);
      })
      .catch(error => {
        this.isMonitoring = false;
        this.geofenceId = '';

        if (error.code === 'USER_DENIED_PERMISSION') {
          this.showError(
            'Location permission denied. Please enable location services in app settings.'
          );
        } else if (error.code === 'LOCATION_SERVICE_DISABLED') {
          this.showError('Location services are disabled. Please enable them in device settings.');
        } else {
          this.showError(`Failed to start geofence monitoring: ${error.message}`);
        }

        this.statusMessage = 'Failed to set geofence';
        console.error('Geofence monitoring error:', error);
      });
  }

  stopMonitoring() {
    if (!this.geofencingService || !this.geofencingService.isAvailable()) {
      this.showError('Geofencing service is not available');
      return;
    }

    if (!this.geofenceId) {
      this.showError('No active geofence to stop');
      return;
    }

    this.statusMessage = 'Stopping geofence monitoring...';

    this.geofencingService
      .stopMonitoringGeofence(this.geofenceId)
      .then(() => {
        this.isMonitoring = false;
        this.geofenceId = '';
        this.statusMessage = 'Geofence monitoring stopped';
        this.showNotification('Geofence monitoring stopped successfully');
        console.log('Geofence monitoring stopped');
      })
      .catch(error => {
        this.showError(`Failed to stop geofence monitoring: ${error.message}`);
        this.statusMessage = 'Error stopping geofence';
        console.error('Error stopping geofence:', error);
      });
  }

  // Input handlers
  handleLatitudeChange(event) {
    this.latitude = event.target.value;
  }

  handleLongitudeChange(event) {
    this.longitude = event.target.value;
  }

  handleRadiusChange(event) {
    this.radius = event.target.value;
  }

  handleEntryMessageChange(event) {
    this.entryMessage = event.target.value;
  }

  handleExitMessageChange(event) {
    this.exitMessage = event.target.value;
  }

  // Helper methods
  showError(message) {
    this.errorMessage = message;
    this.hasError = true;
    setTimeout(() => {
      this.hasError = false;
    }, 5000);
  }

  showNotification(message) {
    this.notificationMessage = message;
    this.hasNotification = true;
    setTimeout(() => {
      this.hasNotification = false;
    }, 5000);
  }
}
