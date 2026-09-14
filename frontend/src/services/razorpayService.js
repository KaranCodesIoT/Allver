// frontend/src/services/razorpayService.js
// Standard Razorpay Web Checkout Integration Service
// Reuses the exact same backend endpoints and verification architecture as the mobile app.

import { API_BASE_URL, BACKEND_URL } from '../config/api';

/**
 * Ensures the Razorpay checkout.js script is loaded in the browser DOM.
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[RazorpayService] Failed to load Razorpay checkout.js script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Step 1: Create Authoritative Razorpay Order on the backend.
 * Never supplies key secret; receives public keyId, amountInPaise, orderId, gatewayOrderId.
 */
export const createPaymentOrder = async ({ jobId, amount, description, token }) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const payload = {
    jobId,
    amount: Number(amount),
    description: description || `Payment for milestone ${jobId}`
  };

  // Try authoritative /create-order
  let res = await fetch(`${API_BASE_URL}/payment/create-order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  let data = await res.json();

  // Fallback to /create if session mismatch or backwards compatibility needed
  if (!res.ok || !data.success) {
    console.warn('[RazorpayService] /create-order non-success, attempting /create fallback:', data.message);
    const fallbackRes = await fetch(`${API_BASE_URL}/payment/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const fallbackData = await fallbackRes.json();
    if (fallbackData.success && (fallbackData.payment || fallbackData.orderId)) {
      data = {
        success: true,
        orderId: fallbackData.payment?.orderId || fallbackData.orderId,
        gatewayOrderId: fallbackData.payment?.paymentId || fallbackData.gatewayOrderId,
        amountInPaise: fallbackData.payment?.amountInPaise || (fallbackData.payment?.amount ? Math.round(fallbackData.payment.amount * 100) : Math.round(Number(amount) * 100)),
        currency: 'INR',
        keyId: fallbackData.payment?.keyId || fallbackData.keyId
      };
    } else {
      throw new Error(data.message || fallbackData.message || 'Unable to initiate payment order on gateway.');
    }
  }

  return {
    orderId: data.orderId,
    gatewayOrderId: data.gatewayOrderId,
    amountInPaise: data.amountInPaise,
    currency: data.currency || 'INR',
    keyId: data.keyId
  };
};

/**
 * Step 2: Open Razorpay Web Standard Checkout Modal.
 */
export const openRazorpayCheckout = async ({
  keyId,
  orderId,
  gatewayOrderId,
  amountInPaise,
  currency = 'INR',
  prefill = {},
  description = 'Milestone Payment',
  onSuccess,
  onDismiss,
  onError
}) => {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
  }

  const options = {
    key: keyId,
    amount: amountInPaise,
    currency: currency || 'INR',
    name: 'Allver',
    description,
    image: '/allver-logo.png',
    order_id: gatewayOrderId,
    prefill: {
      name: prefill.name || 'Customer',
      email: prefill.email || '',
      contact: prefill.contact || prefill.phone || ''
    },
    theme: {
      color: '#059669' // Allver emerald brand
    },
    modal: {
      ondismiss: function () {
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      }
    },
    handler: function (response) {
      if (typeof onSuccess === 'function') {
        onSuccess({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          orderId
        });
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      console.error('[RazorpayService] Payment Failed:', resp.error);
      if (typeof onError === 'function') {
        onError(resp.error?.description || 'Payment was unsuccessful.');
      }
    });
    rzp.open();
  } catch (err) {
    console.error('[RazorpayService] Error opening checkout modal:', err);
    if (typeof onError === 'function') {
      onError(err.message || 'Error opening payment gateway');
    }
  }
};

/**
 * Step 3: Cryptographically verify and confirm payment with backend.
 */
export const verifyPayment = async ({
  orderId,
  gatewayOrderId,
  gatewayPaymentId,
  gatewaySignature,
  jobId,
  token
}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const payload = {
    orderId,
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    jobId
  };

  let res = await fetch(`${API_BASE_URL}/payment/verify-payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  let data = await res.json();

  if (!res.ok || !data.success) {
    console.warn('[RazorpayService] /verify-payment error, attempting /verify fallback:', data.message);
    const fallbackRes = await fetch(`${API_BASE_URL}/payment/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        orderId,
        gatewayOrderId,
        paymentId: gatewayPaymentId,
        gatewaySignature,
        jobId
      })
    });
    data = await fallbackRes.json();
  }

  const isConfirmed = data.success && (
    data.status === 'PAID' || 
    data.verification?.status === 'PAID' || 
    data.verification?.verified
  );

  return {
    success: isConfirmed,
    status: isConfirmed ? 'PAID' : (data.status || 'FAILED'),
    message: data.message || (isConfirmed ? 'Payment verified successfully' : 'Payment verification failed'),
    orderId: data.orderId || orderId,
    jobId: data.jobId || jobId
  };
};

/**
 * Generates authorized receipt download URL for a settled job.
 */
export const getReceiptDownloadUrl = (jobId, token) => {
  return `${BACKEND_URL}/api/payment/receipt/${jobId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};
