import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPaymentsService } from 'lightning/mobileCapabilities';

export default class PaymentsServiceInitiatePay extends LightningElement {
  myPaymentsService;
  paymentServiceUnavailable = false;
  inputValidationClass = '';
  paymentsServiceResponse = '';
  spinnerEnabled = false;
  amountValue = '150.00';
  currencyCodeValue = 'USD';
  paymentMethodValue = '';
  merchantNameValue = 'Alliance Contracting Co.';
  merchantAccountIdValue = '8zbSG0000006hofYAA';
  payerAccountIdValue = '001SG00000bIu4sYAC';
  sourceObjectIdValue = '0a6xx0000000cuvAAA';
  supportedPaymentMethods = [];
  showPaymentMethodSelection = false;

  get paymentMethodOptions() {
    return this.supportedPaymentMethods.map(method => ({
      label: this.formatPaymentMethodLabel(method),
      value: method,
    }));
  }

  formatPaymentMethodLabel(method) {
    switch (method) {
      case 'TAP_TO_PAY':
        return 'Tap to Pay';
      case 'CREDIT_CARD_DETAILS':
        return 'Credit Card';
      case 'PAY_VIA_LINK':
        return 'Pay via Link';
      default:
        return method;
    }
  }

  connectedCallback() {
    this.myPaymentsService = getPaymentsService();
    if (!this.myPaymentsService?.isAvailable()) {
      this.paymentServiceUnavailable = true;
      this.paymentsServiceResponse = 'Payments Service is unavailable on this device.';
      return;
    }
    this.loadSupportedPaymentMethods();
  }

  loadSupportedPaymentMethods() {
    const options = {
      countryIsoCode: this.currencyCodeValue,
      merchantAccountId: this.merchantAccountIdValue,
    };

    this.showSpinner();
    this.myPaymentsService
      .getSupportedPaymentMethods(options)
      .then(result => {
        this.supportedPaymentMethods = result;
        if (result.length > 0) {
          this.showPaymentMethodSelection = true;
        } else {
          this.paymentsServiceResponse = 'No supported payment methods found.';
        }
      })
      .catch(error => this.processError(error))
      .finally(() => this.hideSpinner());
  }

  handleAmountInput(event) {
    this.amountValue = event.target.value;
  }

  handleCurrencyCodeInput(event) {
    this.currencyCodeValue = event.target.value;
  }

  handlePaymentMethodChange(event) {
    this.paymentMethodValue = event.detail.value;
  }

  handleMerchantNameInput(event) {
    this.merchantNameValue = event.target.value;
  }

  validateAmount() {
    const converted = Number(this.amountValue);
    if (!this.amountValue || isNaN(converted)) {
      this.inputValidationClass = 'slds-has-error';
      return false;
    }
    this.inputValidationClass = '';
    return true;
  }

  showSpinner() {
    this.spinnerEnabled = true;
  }

  hideSpinner() {
    this.spinnerEnabled = false;
  }

  processResult(result) {
    this.paymentsServiceResponse = JSON.stringify(result, undefined, 2);
    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Payment Successful',
        message: 'Payment was processed successfully',
        variant: 'success',
      })
    );
  }

  processError(error) {
    if (error.code === 'USER_DISMISSED') {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Payment Canceled',
          message: 'Payment was canceled by the user',
          variant: 'warning',
        })
      );
    } else {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Payment Error',
          message: `Error: ${error.message} (Code: ${error.code})`,
          variant: 'error',
          mode: 'sticky',
        })
      );
    }
  }

  handleProcessPayment() {
    if (!this.validateAmount()) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Invalid Amount',
          message: 'Please enter a valid payment amount',
          variant: 'error',
        })
      );
      return;
    }

    if (!this.paymentMethodValue) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: 'Payment Method Required',
          message: 'Please select a payment method',
          variant: 'error',
        })
      );
      return;
    }

    const options = {
      amount: Number(this.amountValue),
      currencyIsoCode: this.currencyCodeValue,
      paymentMethod: this.paymentMethodValue,
      merchantName: this.merchantNameValue,
      merchantAccountId: this.merchantAccountIdValue,
      payerAccountId: this.payerAccountIdValue,
      sourceObjectIds: [this.sourceObjectIdValue],
    };

    this.showSpinner();
    this.paymentsServiceResponse = 'Processing payment...';

    this.myPaymentsService
      .collectPayment(options)
      .then(result => this.processResult(result))
      .catch(error => this.processError(error))
      .finally(() => this.hideSpinner());
  }
}
