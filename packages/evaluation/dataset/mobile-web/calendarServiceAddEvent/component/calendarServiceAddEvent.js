import { LightningElement } from 'lwc';
import { getCalendarService } from 'lightning/mobileCapabilities';
import LightningAlert from 'lightning/alert';

export default class CalendarServiceAddEvent extends LightningElement {
  eventTitle = '';
  startTime = '';
  endTime = '';
  location = '';
  notes = '';
  selectedCalendarId = '';
  calendarOptions = [];
  calendarService;

  connectedCallback() {
    this.calendarService = getCalendarService();

    if (this.calendarService.isAvailable()) {
      this.loadCalendars();
    } else {
      this.showAlert('Error', 'Calendar service is not available on this device.');
    }
  }

  async loadCalendars() {
    try {
      const options = {
        permissionRationaleText:
          'Please grant calendar access to select a calendar for your event.',
      };

      const calendars = await this.calendarService.getCalendars(options);
      this.calendarOptions = calendars.map(calendar => ({
        label: calendar.title,
        value: calendar.id,
      }));

      // Select the first calendar by default if available
      if (this.calendarOptions.length > 0) {
        this.selectedCalendarId = this.calendarOptions[0].value;
      }
    } catch (error) {
      this.showAlert('Error', `Failed to load calendars: ${error.message}`);
    }
  }

  handleTitleChange(event) {
    this.eventTitle = event.target.value;
  }

  handleStartTimeChange(event) {
    this.startTime = event.target.value;
  }

  handleEndTimeChange(event) {
    this.endTime = event.target.value;
  }

  handleCalendarChange(event) {
    this.selectedCalendarId = event.detail.value;
  }

  handleLocationChange(event) {
    this.location = event.target.value;
  }

  handleNotesChange(event) {
    this.notes = event.target.value;
  }

  get isAddDisabled() {
    return !this.eventTitle || !this.startTime || !this.endTime;
  }

  async handleAddEvent() {
    if (!this.calendarService.isAvailable()) {
      this.showAlert('Error', 'Calendar service is not available on this device.');
      return;
    }

    try {
      const startDate = new Date(this.startTime);
      const endDate = new Date(this.endTime);

      const calendarEvent = {
        title: this.eventTitle,
        startDateSecondsUTC: Math.floor(startDate.getTime() / 1000),
        endDateSecondsUTC: Math.floor(endDate.getTime() / 1000),
        availability: 'Busy',
        calendarId: this.selectedCalendarId,
        location: this.location,
        notes: this.notes,
      };

      const options = {
        permissionRationaleText: 'Please grant calendar access to add your event.',
      };

      await this.calendarService.addEvent(calendarEvent, options);

      this.showAlert('Success', 'Event was successfully added to your calendar!');
      this.resetForm();
    } catch (error) {
      this.showAlert('Error', `Failed to add event: ${error.message}`);
    }
  }

  resetForm() {
    this.eventTitle = '';
    this.startTime = '';
    this.endTime = '';
    this.location = '';
    this.notes = '';
  }

  showAlert(title, message) {
    LightningAlert.open({
      message: message,
      theme: title === 'Success' ? 'success' : 'error',
      label: title,
    });
  }
}
