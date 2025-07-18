import { LightningElement } from 'lwc';
import { getContactsService } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ContactsServiceSelectContacts extends LightningElement {
  contactsService;
  selectedContacts = [];
  isLoading = false;
  errorMessage = '';

  connectedCallback() {
    this.contactsService = getContactsService();
  }

  get isContactsAvailable() {
    return this.contactsService && this.contactsService.isAvailable();
  }

  get hasSelectedContacts() {
    return this.selectedContacts.length > 0;
  }

  async handleSelectContacts() {
    if (!this.isContactsAvailable) {
      this.showError('Contacts service is not available on this device.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const contacts = await this.contactsService.getContacts();
      this.processSelectedContacts(contacts);
    } catch (error) {
      this.handleContactError(error);
    } finally {
      this.isLoading = false;
    }
  }

  processSelectedContacts(contacts) {
    if (!contacts || contacts.length === 0) {
      this.showError('No contacts were selected or found.');
      return;
    }

    this.selectedContacts = contacts.map(contact => ({
      id: contact.id,
      name: this.formatContactName(contact.name),
      phoneNumbers: this.formatPhoneNumbers(contact.phoneNumbers),
      primaryPhone: this.getPrimaryPhone(contact.phoneNumbers),
    }));

    this.showSuccess(`Successfully selected ${contacts.length} contacts.`);
  }

  formatContactName(name) {
    if (!name) return 'Unknown';
    return [name.givenName, name.middleName, name.familyName].filter(part => part).join(' ');
  }

  formatPhoneNumbers(phoneNumbers) {
    if (!phoneNumbers || phoneNumbers.length === 0) return [];
    return phoneNumbers.map(phone => ({
      label: phone.label || 'Other',
      number: phone.value,
    }));
  }

  getPrimaryPhone(phoneNumbers) {
    if (!phoneNumbers || phoneNumbers.length === 0) return 'No phone number';

    // Try to find a work or mobile number first
    const preferred = phoneNumbers.find(
      phone => phone.label && ['work', 'mobile'].includes(phone.label.toLowerCase())
    );

    return preferred ? preferred.value : phoneNumbers[0].value;
  }

  handleContactError(error) {
    console.error('Contact selection error:', error);

    let userMessage = 'An error occurred while accessing contacts.';

    if (error.code === 'USER_DENIED_PERMISSION') {
      userMessage =
        'Permission to access contacts was denied. Please enable contacts access in Settings.';
    } else if (error.code === 'USER_DISMISSED') {
      userMessage = 'Contact selection was cancelled.';
    } else if (error.message) {
      userMessage = error.message;
    }

    this.errorMessage = userMessage;
    this.showError(userMessage);
  }

  showSuccess(message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Success',
        message: message,
        variant: 'success',
      })
    );
  }

  showError(message) {
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Error',
        message: message,
        variant: 'error',
      })
    );
  }
}
