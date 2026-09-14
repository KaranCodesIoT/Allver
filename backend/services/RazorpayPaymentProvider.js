// backend/services/RazorpayPaymentProvider.js
// Production Razorpay Payment Provider implementing PaymentProvider interface

const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');

class RazorpayPaymentProvider extends PaymentProvider {
  constructor(options = {}) {
    super();
    this.keyId = options.keyId || process.env.RAZORPAY_KEY_ID;
    this.keySecret = options.keySecret || process.env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = options.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    this.baseUrl = options.baseUrl || 'https://api.razorpay.com/v1';
  }

  _getAuthHeader() {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials not configured: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing');
    }
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${token}`;
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': this._getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMessage = data?.error?.description || `Razorpay API error (${response.status})`;
      const err = new Error(errMessage);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async createPayment({ amountInPaise, currency = 'INR', jobId, orderId, description, notes = {} }) {
    if (!amountInPaise || amountInPaise <= 0 || !Number.isInteger(amountInPaise)) {
      throw new Error('Invalid payment amount: must be positive integer paise');
    }

    const payload = {
      amount: amountInPaise,
      currency,
      receipt: orderId || `rcpt_${jobId}`,
      notes: {
        jobId,
        orderId,
        description: description || `Payment for Job ${jobId}`,
        ...notes
      }
    };

    const data = await this._request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      gatewayOrderId: data.id,
      amountInPaise: data.amount,
      currency: data.currency,
      status: data.status, // created
      metadata: {
        receipt: data.receipt,
        entity: data.entity
      }
    };
  }

  async verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, signature }) {
    if (!gatewayOrderId || !gatewayPaymentId || !signature) {
      return false;
    }
    if (!this.keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is required to verify payment signature');
    }

    const payload = `${gatewayOrderId}|${gatewayPaymentId}`;
    const expected = crypto.createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== sigBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch {
      return false;
    }
  }

  verifyWebhookSignature({ payload, signature, secret }) {
    const webhookSecret = secret || this.webhookSecret;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is required to verify webhook signature');
    }
    if (!signature) {
      return false;
    }

    const rawPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
    const expected = crypto.createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== sigBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch {
      return false;
    }
  }

  async fetchPayment({ paymentId }) {
    if (!paymentId) {
      throw new Error('paymentId is required');
    }

    const data = await this._request(`/payments/${paymentId}`, {
      method: 'GET'
    });

    return {
      paymentId: data.id,
      orderId: data.order_id,
      status: data.status, // captured, authorized, failed, refunded
      amountInPaise: data.amount,
      currency: data.currency,
      method: data.method,
      paidAt: data.captured ? new Date(data.created_at * 1000) : null,
      raw: data
    };
  }

  async refundPayment({ paymentId, amountInPaise, reason }) {
    if (!paymentId) {
      throw new Error('paymentId is required for refund');
    }

    const payload = {
      notes: { reason: reason || 'Service cancellation/refund' }
    };
    if (amountInPaise && Number.isInteger(amountInPaise)) {
      payload.amount = amountInPaise;
    }

    const data = await this._request(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      refundId: data.id,
      paymentId: data.payment_id,
      amountInPaise: data.amount,
      status: data.status,
      currency: data.currency
    };
  }

  getProviderName() {
    return 'razorpay';
  }
}

module.exports = RazorpayPaymentProvider;
