import { LightningElement } from 'lwc';
import { getAppReviewService } from 'lightning/mobileCapabilities';

export default class AppReviewServicePerInstallation extends LightningElement {
  appReviewService;
  showReviewPrompt = false;
  showSuccessMessage = false;
  showErrorMessage = false;
  errorMessage = '';

  connectedCallback() {
    // Get the AppReviewService when component is connected to the DOM
    this.appReviewService = getAppReviewService();

    // Check if the service is available and show prompt if appropriate
    if (this.appReviewService.isAvailable()) {
      this.showReviewPrompt = true;
    } else {
      this.showErrorMessage = true;
      this.errorMessage = 'App review functionality is not available on this device.';
    }
  }

  handleReviewRequest() {
    if (this.appReviewService.isAvailable()) {
      const options = {
        ignoreIfAlreadyRequestedForCurrentAppVersion: true,
      };

      this.appReviewService
        .requestAppReview(options)
        .then(() => {
          this.showReviewPrompt = false;
          this.showSuccessMessage = true;
          // Hide success message after 5 seconds
          setTimeout(() => {
            this.showSuccessMessage = false;
          }, 5000);
        })
        .catch(error => {
          this.showReviewPrompt = false;
          this.showErrorMessage = true;

          // Handle specific error codes
          switch (error.code) {
            case 'ALREADY_REQUESTED_FOR_CURRENT_APP_VERSION':
              this.errorMessage =
                'You have already been prompted to review this version of the app.';
              break;
            case 'IN_APP_REVIEW_ERROR':
              this.errorMessage = 'The app review service encountered an error.';
              break;
            case 'SERVICE_NOT_ENABLED':
              this.errorMessage = 'The app review service is not enabled.';
              break;
            default:
              this.errorMessage = error.message || 'An unknown error occurred.';
          }

          // Hide error message after 5 seconds
          setTimeout(() => {
            this.showErrorMessage = false;
          }, 5000);
        });
    }
  }

  handleDismiss() {
    this.showReviewPrompt = false;
  }
}
