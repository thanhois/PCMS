import axiosClient from './axiosClient';

const billingApi = {
  // 1. PAYMENT QUEUE
  getPaymentQueue(status = 'PENDING') {
    return axiosClient.get('/api/v1/billing/queue', { params: { status } });
  },

  // 2. ALL INVOICES
  getAllInvoices() {
    return axiosClient.get('/api/v1/billing/invoices');
  },

  // 3. UC24 - CREATE INVOICE
  getCompletedMedicalRecords() {
    return axiosClient.get('/api/v1/billing/records/completed');
  },

  createInvoicePreview(recordId) {
    return axiosClient.post(`/api/v1/billing/records/${recordId}/invoice-preview`);
  },

  // 4. INVOICE DETAIL & ACTIONS
  getInvoiceById(invoiceId) {
    return axiosClient.get(`/api/v1/billing/invoices/${invoiceId}`);
  },

  updateInvoice(invoiceId, payload) {
    return axiosClient.put(`/api/v1/billing/invoices/${invoiceId}`, payload);
  },

  voidInvoice(invoiceId, payload) {
    return axiosClient.patch(`/api/v1/billing/invoices/${invoiceId}/void`, payload);
  },

  // 5. PAYMENT
  confirmPayment(invoiceId, payload) {
    return axiosClient.post(`/api/v1/billing/invoices/${invoiceId}/payments`, payload);
  },
};

export default billingApi;
