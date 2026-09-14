// backend/services/PaymentProvider.js
// Abstract Payment Provider Interface
// Standardized across Mock, Razorpay, and future gateway providers

class PaymentProvider {
  /**
   * Create a new payment order/intent at the gateway
   * @param {Object} params
   * @param {number} params.amountInPaise - Payable amount in integer paise
   * @param {string} params.currency - Currency code (default: INR)
   * @param {string} params.jobId - Associated job ID
   * @param {string} params.orderId - Internal Allver PaymentOrder ID
   * @param {string} [params.description] - Payment description
   * @param {Object} [params.notes] - Key-value metadata
   * @returns {Promise<{gatewayOrderId: string, amountInPaise: number, currency: string, metadata: object}>}
   */
  async createPayment({ amountInPaise, currency = 'INR', jobId, orderId, description, notes }) {
    throw new Error('PaymentProvider.createPayment() must be implemented');
  }

  /**
   * Verify payment status directly (legacy / mock compatibility)
   * @param {Object} params
   * @param {string} params.paymentId
   * @returns {Promise<{verified: boolean, status: string, amount: number, paidAt: Date|null}>}
   */
  async verifyPayment({ paymentId }) {
    throw new Error('PaymentProvider.verifyPayment() must be implemented');
  }

  /**
   * Cryptographically verify payment signature returned to mobile client
   * @param {Object} params
   * @param {string} params.gatewayOrderId - Gateway Order ID
   * @param {string} params.gatewayPaymentId - Gateway Payment ID
   * @param {string} params.signature - Gateway HMAC signature
   * @returns {Promise<boolean>}
   */
  async verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, signature }) {
    throw new Error('PaymentProvider.verifyPaymentSignature() must be implemented');
  }

  /**
   * Cryptographically verify webhook signature from gateway
   * @param {Object} params
   * @param {string|Buffer} params.payload - Raw payload body
   * @param {string} params.signature - Webhook signature header
   * @param {string} [params.secret] - Optional webhook secret override
   * @returns {boolean}
   */
  verifyWebhookSignature({ payload, signature, secret }) {
    throw new Error('PaymentProvider.verifyWebhookSignature() must be implemented');
  }

  /**
   * Fetch payment details directly from gateway API
   * @param {Object} params
   * @param {string} params.paymentId - Gateway payment ID
   * @returns {Promise<{paymentId: string, orderId: string, status: string, amountInPaise: number, paidAt: Date|null}>}
   */
  async fetchPayment({ paymentId }) {
    throw new Error('PaymentProvider.fetchPayment() must be implemented');
  }

  /**
   * Refund a captured payment (full or partial)
   * @param {Object} params
   * @param {string} params.paymentId - Original gateway payment ID
   * @param {number} params.amountInPaise - Amount to refund in integer paise
   * @param {string} params.reason - Reason for refund
   * @returns {Promise<{refundId: string, status: string, amountInPaise: number}>}
   */
  async refundPayment({ paymentId, amountInPaise, reason }) {
    throw new Error('PaymentProvider.refundPayment() must be implemented');
  }

  /**
   * Get provider name identifier
   * @returns {string}
   */
  getProviderName() {
    return 'abstract';
  }
}

module.exports = PaymentProvider;
