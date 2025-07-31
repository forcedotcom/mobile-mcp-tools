import { LightningElement, wire, track } from 'lwc';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import FAMILY_FIELD from '@salesforce/schema/Product2.Family';

export default class ProductCatalogBrowser extends LightningElement {
  recordTypeId = '012000000000000AAA';
  @track selectedFamily;

  @wire(getPicklistValues, {
    recordTypeId: '$recordTypeId',
    fieldApiName: FAMILY_FIELD,
    defaultValue: '$productFamilyLabel',
  })
  familyPicklistValues;

  get familyOptions() {
    return this.familyPicklistValues?.data?.values || [];
  }

  get hasOptions() {
    return this.familyOptions.length > 0;
  }
}
