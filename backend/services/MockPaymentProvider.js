// backend/services/MockPaymentProvider.js
// Enhanced Mock Payment Provider for automated tests & local development
// Supports cryptographic HMAC signatures, paise precision, and webhook event generation

const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');

class MockPaymentProvider extends PaymentProvider {
  constructor(options = {}) {
    super();
    this.payments = new Map(); // In-memory store for mock payments
    this.orders = new Map();
    this.refunds = new Map();
    this.failRate = options.failRate || 0;
    this.secret = options.secret || 'mock_webhook_secret_for_tests_123';
    this.keySecret = options.keySecret || 'mock_key_secret_for_tests_456';
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }

  async createPayment({ amount, amountInPaise, currency = 'INR', jobId, orderId, description, notes = {} }) {
    const finalPaise = amountInPaise || (amount ? Math.round(Number(amount) * 100) : 0);
    if (!finalPaise || finalPaise <= 0) {
      throw new Error('Invalid payment amount: must be positive integer paise');
    }

    const gatewayOrderId = this._generateId('mock_order');
    const paymentId = this._generateId('mock_pay');
    const order = {
      paymentId,
      gatewayOrderId,
      orderId,
      jobId,
      amountInPaise: finalPaise,
      amount: finalPaise / 100,
      currency,
      status: 'CREATED',
      notes,
      createdAt: new Date()
    };

    this.orders.set(gatewayOrderId, order);
    this.payments.set(paymentId, order);

    return {
      paymentId,
      gatewayOrderId,
      amount: finalPaise / 100,
      amountInPaise: finalPaise,
      currency,
      status: 'CREATED',
      metadata: { provider: 'mock', jobId, orderId }
    };
  }

  async verifyPayment({ paymentId }) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return { verified: false, status: 'NOT_FOUND', amount: 0, paidAt: null };
    }

    payment.status = 'PAID';
    payment.paidAt = new Date();

    return {
      verified: true,
      status: 'PAID',
      amount: payment.amount || (payment.amountInPaise / 100),
      paidAt: payment.paidAt
    };
  }

  /**
   * Helper for tests: simulate customer completing payment on mock gateway UI
   */
  simulateClientPaymentSuccess(gatewayOrderId) {
    const order = this.orders.get(gatewayOrderId);
    if (!order) {
      throw new Error(`Order ${gatewayOrderId} not found`);
    }

    const gatewayPaymentId = this._generateId('mock_pay');
    const signature = this.generatePaymentSignature(gatewayOrderId, gatewayPaymentId);

    const payment = {
      paymentId: gatewayPaymentId,
      orderId: gatewayOrderId,
      amountInPaise: order.amountInPaise,
      currency: order.currency,
      status: 'captured',
      paidAt: new Date(),
      signature
    };

    this.payments.set(gatewayPaymentId, payment);
    order.status = 'paid';

    return {
      gatewayOrderId,
      gatewayPaymentId,
      signature,
      amountInPaise: order.amountInPaise
    };
  }

  /**
   * Helper for tests: generate client signature using HMAC-SHA256
   */
  generatePaymentSignature(gatewayOrderId, gatewayPaymentId) {
    return crypto.createHmac('sha256', this.keySecret)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');
  }

  async verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, signature }) {
    if (!gatewayOrderId || !gatewayPaymentId || !signature) return false;
    const expected = this.generatePaymentSignature(gatewayOrderId, gatewayPaymentId);
    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const sigBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== sigBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, sigBuf);
    } catch {
      return false;
    }
  }

  /**
   * Helper for tests: generate webhook signature using HMAC-SHA256
   */
  generateWebhookSignature(payload, secret = this.secret) {
    const rawPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return crypto.createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');
  }

  verifyWebhookSignature({ payload, signature, secret }) {
    const webhookSecret = secret || this.secret;
    if (!signature || !webhookSecret) return false;
    const expected = this.generateWebhookSignature(payload, webhookSecret);
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
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        paymentId,
        orderId: null,
        status: 'not_found',
        amountInPaise: 0,
        paidAt: null
      };
    }

    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      amountInPaise: payment.amountInPaise,
      currency: payment.currency,
      paidAt: payment.paidAt
    };
  }

  async refundPayment({ paymentId, amountInPaise, reason }) {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const refundId = this._generateId('mock_rfnd');
    const refundAmount = amountInPaise || payment.amountInPaise;

    const refund = {
      refundId,
      paymentId,
      amountInPaise: refundAmount,
      reason: reason || 'Refund requested',
      status: 'processed',
      createdAt: new Date()
    };

    this.refunds.set(refundId, refund);
    payment.status = refundAmount >= payment.amountInPaise ? 'refunded' : 'partially_refunded';

    return {
      refundId,
      paymentId,
      status: 'processed',
      amountInPaise: refundAmount
    };
  }

  getProviderName() {
    return 'mock';
  }
}

module.exports = MockPaymentProvider;
