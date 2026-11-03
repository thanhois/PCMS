
import axiosClient from './axiosClient';

const billingApi = {
  // 1. PAYMENT QUEUE
  getPaymentQueue() {
    return axiosClient.get('/api/v1/billing/queue');
  },

  // 2. INVOICE
  getInvoiceById(invoiceId) {
    return axiosClient.get(
      `/api/v1/billing/invoices/${invoiceId}`
    );
  },

  updateInvoice(invoiceId, payload) {
    return axiosClient.put(
      `/api/v1/billing/invoices/${invoiceId}`,
      payload
    );
  },

  voidInvoice(invoiceId, payload) {
    return axiosClient.patch(
      `/api/v1/billing/invoices/${invoiceId}/void`,
      payload
    );
  },

  // 3. PAYMENT
  confirmPayment(invoiceId, payload) {
    return axiosClient.post(
      `/api/v1/billing/invoices/${invoiceId}/payments`,
      payload
    );
  },
};

export default billingApi;
