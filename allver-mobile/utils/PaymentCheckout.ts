import { Platform } from 'react-native';

export interface RazorpayOptions {
  description: string;
  image?: string;
  currency: string;
  key: string;
  amount: number;
  name: string;
  order_id: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Universal Razorpay Checkout launcher.
 * - On Web: Dynamically loads checkout.js and opens the standard Razorpay web modal.
 * - On Native (Android / iOS): Invokes the react-native-razorpay native SDK.
 */
export const openRazorpayCheckout = async (options: RazorpayOptions): Promise<RazorpaySuccessResponse> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const loadScript = (): Promise<void> => {
        if (typeof window === 'undefined') {
          return reject(new Error('Web window environment not available'));
        }
        if ((window as any).Razorpay) {
          return Promise.resolve();
        }
        return new Promise<void>((res, rej) => {
          const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
          if (existingScript) {
            existingScript.addEventListener('load', () => res());
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => res();
          script.onerror = () => rej(new Error('Failed to load Razorpay Web Checkout SDK'));
          document.body.appendChild(script);
        });
      };

      loadScript()
        .then(() => {
          const rzp = new (window as any).Razorpay({
            key: options.key,
            amount: options.amount,
            currency: options.currency || 'INR',
            name: options.name || 'Allver',
            description: options.description,
            image: options.image,
            order_id: options.order_id,
            prefill: options.prefill,
            theme: options.theme,
            handler: (response: any) => {
              resolve({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
            },
            modal: {
              ondismiss: () => {
                reject({ code: 0, description: 'Payment cancelled by user' });
              },
            },
          });
          rzp.open();
        })
        .catch(reject);
    });
  }

  // Native Android & iOS
  let RazorpayCheckoutModule: any;
  try {
    const rzp = require('react-native-razorpay');
    RazorpayCheckoutModule = rzp.default || rzp;
  } catch (e) {
    console.warn('[Razorpay] Could not load native module:', e);
  }

  if (!RazorpayCheckoutModule || typeof RazorpayCheckoutModule.open !== 'function') {
    throw new Error('Razorpay native module is not linked. For native mobile testing, please run with a development build (npx expo run:android).');
  }

  return RazorpayCheckoutModule.open(options);
};
