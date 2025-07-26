import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';

export default class OfflineBadWith3Issues extends LightningElement {

    @api
    userName;

    // Demo no-wire-config-references-non-local-property-reactive-value
    @wire(getRecord, { recordId: `${USER_ID}`, fields: ['User.Name'] })
    onGetUser({ error, data }) {
        if (data) {
            this.userName = data.fields.Name.value;
        } else if (error) {
            this.userName = undefined;
        }
    }

    @api
    accountName;

    // no-private-wire-config-property
    accountId = '0015j0000000000'; 

    @wire(getRecord, { recordId: `${accountId}`, fields: ['Account.Name'] })
    onGetAccount({ error, data }) {
        if (data) {
            this.accountName = data.fields.Name.value;
        } else if (error) {
            this.accountName = undefined;
        }
    }
}