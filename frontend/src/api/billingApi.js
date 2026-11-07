import axiosClient from './axiosClient';

const billingApi = {
  getPaymentQueue(status = 'PENDING') {
    return axiosClient.get('/api/v1/billing/queue', { params: { status } });
  },

  getInvoiceById(invoiceId) {
    return axiosClient.get(`/api/v1/billing/invoices/${invoiceId}`);
  },

  updateInvoice(invoiceId, payload) {
    return axiosClient.put(`/api/v1/billing/invoices/${invoiceId}`, payload);
  },

  voidInvoice(invoiceId, payload) {
    return axiosClient.patch(`/api/v1/billing/invoices/${invoiceId}/void`, payload);
  },

  confirmPayment(invoiceId, payload) {
    return axiosClient.post(`/api/v1/billing/invoices/${invoiceId}/payments`, payload);
  },
};

export default billingApi;
