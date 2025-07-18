import { LightningElement, api } from 'lwc';
import { getLocationService } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
import LOCATION_OBJECT from '@salesforce/schema/LocationLog__c';
import LATITUDE_FIELD from '@salesforce/schema/LocationLog__c.Latitude__c';
import LONGITUDE_FIELD from '@salesforce/schema/LocationLog__c.Longitude__c';
import TIMESTAMP_FIELD from '@salesforce/schema/LocationLog__c.Timestamp__c';
import ID_FIELD from '@salesforce/schema/LocationLog__c.Id';

// Default interval in milliseconds (5 minutes)
const DEFAULT_INTERVAL = 300000;

export default class LocationServicePollingLocation extends LightningElement {
  locationService;
  intervalId;
  isTracking = false;
  locationLogId;

  @api
  trackingInterval = DEFAULT_INTERVAL;

  get isStartTrackingDisabled() {
    return this.isTracking || !this.isLocationAvailable;
  }
  get isStopTrackingDisabled() {
    return !this.isTracking;
  }

  connectedCallback() {
    this.locationService = getLocationService();
  }

  get isLocationAvailable() {
    return this.locationService && this.locationService.isAvailable();
  }

  get trackingStatus() {
    return this.isTracking ? 'Tracking Active' : 'Tracking Inactive';
  }

  handleIntervalChange(event) {
    const newInterval = parseInt(event.target.value, 10) * 60000;
    if (!isNaN(newInterval) && newInterval > 0) {
      this.trackingInterval = newInterval;
    }
  }

  startTracking() {
    if (!this.isLocationAvailable) {
      this.showError('Location services are not available on this device.');
      return;
    }

    this.isTracking = true;

    // Get initial position immediately
    this.getCurrentLocation();

    // Then set up periodic updates
    this.intervalId = setInterval(() => {
      if (this.isTracking) {
        this.getCurrentLocation();
      }
    }, this.trackingInterval);

    this.showToast('Success', 'Location tracking started', 'success');
  }

  stopTracking() {
    this.isTracking = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.showToast('Success', 'Location tracking stopped', 'success');
  }

  getCurrentLocation() {
    const options = {
      enableHighAccuracy: true,
    };

    this.locationService
      .getCurrentPosition(options)
      .then(result => {
        this.handleLocationSuccess(result);
      })
      .catch(error => {
        this.handleLocationError(error);
      });
  }

  handleLocationSuccess(result) {
    const locationData = {
      [LATITUDE_FIELD.fieldApiName]: result.coords.latitude,
      [LONGITUDE_FIELD.fieldApiName]: result.coords.longitude,
      [TIMESTAMP_FIELD.fieldApiName]: new Date(result.timestamp).toISOString(),
    };

    const fields = locationData;

    // Create a new record if we don't have one, otherwise update existing
    const recordInput = this.locationLogId
      ? { fields: { ...fields, [ID_FIELD.fieldApiName]: this.locationLogId } }
      : { apiName: LOCATION_OBJECT.objectApiName, fields };

    if (reco)
      updateRecord(recordInput)
        .then(record => {
          if (!this.locationLogId && record.id) {
            this.locationLogId = record.id;
          }
          this.showToast('Success', 'Location logged successfully', 'success');
        })
        .catch(error => {
          this.showError('Error saving location: ' + error.body.message);
        });
  }

  handleLocationError(error) {
    let errorMessage = 'Error getting location: ';
    switch (error.code) {
      case 'USER_DENIED_PERMISSION':
        errorMessage += 'Permission denied by user';
        break;
      case 'USER_DISABLED_PERMISSION':
        errorMessage += 'Location services disabled in settings';
        break;
      case 'SERVICE_NOT_ENABLED':
        errorMessage += 'Location services not enabled';
        break;
      default:
        errorMessage += error.message || 'Unknown error';
    }

    this.showError(errorMessage);
    this.stopTracking();
  }

  showToast(title, message, variant) {
    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant,
      })
    );
  }

  showError(message) {
    this.showToast('Error', message, 'error');
  }

  disconnectedCallback() {
    this.stopTracking();
  }
}
