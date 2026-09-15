import { Platform } from 'react-native';

export function formatIndianPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) {
    return cleaned;
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  return cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
}

export interface SendOtpResult {
  success: boolean;
  confirmation?: any;
  title?: string;
  message?: string;
  code?: string;
  error?: any;
}

export interface VerifyOtpResult {
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  uid?: string;
  title?: string;
  message?: string;
  code?: string;
  error?: any;
}

/**
 * Sends a real SMS OTP via Firebase Authentication.
 */
export async function sendFirebaseOtp(phoneNumber: string): Promise<SendOtpResult> {
  const formattedPhone = formatIndianPhoneNumber(phoneNumber);
  console.log('[FirebaseAuthService] Sending OTP to:', formattedPhone);

  const rawDigits = phoneNumber.replace(/\D/g, '');
  if (!rawDigits || rawDigits.length !== 10) {
    return {
      success: false,
      title: 'Invalid Mobile Number',
      message: 'Please enter a valid 10-digit mobile number.',
      code: 'INVALID_PHONE',
    };
  }

  try {
    if (Platform.OS !== 'web') {
      // Native Android / iOS using @react-native-firebase/auth
      const auth = require('@react-native-firebase/auth').default;
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      console.log('[FirebaseAuthService] Native OTP confirmation object created.');
      return { success: true, confirmation };
    } else {
      // Web fallback using firebase JS SDK
      const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = require('firebase/auth');
      const { initializeApp, getApps } = require('firebase/app');
      
      const firebaseConfig = {
        apiKey: "AIzaSyCGYTbKMrm04MqY4NDQEq1RhU7Bvj8gJZ0",
        authDomain: "allver-f9cbf.firebaseapp.com",
        projectId: "allver-f9cbf",
        storageBucket: "allver-f9cbf.firebasestorage.app",
        messagingSenderId: "218434531138",
        appId: "1:218434531138:web:a6db413cbf2b801a6b0c6f"
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);

      if (typeof window !== 'undefined') {
        let verifier = (window as any).recaptchaVerifier;

        if (!verifier) {
          const oldContainer = document.getElementById('recaptcha-container');
          if (oldContainer) {
            oldContainer.remove();
          }

          const container = document.createElement('div');
          container.id = 'recaptcha-container';
          document.body.appendChild(container);

          verifier = new RecaptchaVerifier(auth, container, {
            size: 'invisible',
            callback: () => {
              console.log('[FirebaseAuthService] reCAPTCHA solved successfully.');
            }
          });
          (window as any).recaptchaVerifier = verifier;
        }

        try {
          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
          return { success: true, confirmation };
        } catch (phoneAuthErr: any) {
          try {
            verifier.clear();
          } catch (e) {}
          (window as any).recaptchaVerifier = null;
          const container = document.getElementById('recaptcha-container');
          if (container) {
            container.remove();
          }
          throw phoneAuthErr;
        }
      }

      return {
        success: false,
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
        code: 'WEB_RECAPTCHA_UNAVAILABLE',
      };
    }
  } catch (err: any) {
    console.error('[FirebaseAuthService Technical Error] sendFirebaseOtp:', err);
    let title = 'Something went wrong';
    let message = 'Please check your internet connection and try again.';
    let code = 'UNKNOWN_ERROR';
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);

    if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
      title = 'Too many OTP attempts';
      message = 'Please wait a while before requesting another OTP.';
      code = 'TOO_MANY_REQUESTS';
    } else if (
      errCode === 'auth/missing-client-identifier' ||
      errStr.includes('missing-client-identifier') ||
      errCode === 'auth/invalid-app-credential' ||
      errStr.includes('invalid-app-credential')
    ) {
      title = "We couldn't verify this device.";
      message = 'Please check your connection and try again.';
      code = 'APP_VERIFICATION_FAILED';
    } else if (errCode === 'auth/quota-exceeded' || errStr.includes('quota-exceeded')) {
      title = 'Too many OTP attempts';
      message = 'SMS limit reached for today. Please wait a while before trying again.';
      code = 'QUOTA_EXCEEDED';
    } else if (errCode === 'auth/invalid-phone-number' || errStr.includes('invalid-phone-number')) {
      title = 'Invalid Mobile Number';
      message = 'Please enter a valid 10-digit mobile number.';
      code = 'INVALID_PHONE';
    } else if (errStr.includes('network') || errCode === 'auth/network-request-failed') {
      title = 'Something went wrong';
      message = 'Please check your internet connection and try again.';
      code = 'NETWORK_ERROR';
    }

    return {
      success: false,
      title,
      message,
      code,
      error: err,
    };
  }
}

/**
 * Confirms the 6-digit OTP and extracts the secure Firebase ID Token.
 */
export async function verifyFirebaseOtp(confirmation: any, otpCode: string): Promise<VerifyOtpResult> {
  const cleanCode = otpCode.trim();
  console.log('[FirebaseAuthService] Verifying OTP code of length:', cleanCode.length);

  if (!cleanCode || cleanCode.length < 6) {
    return {
      success: false,
      title: 'Incorrect OTP',
      message: 'Please enter the complete 6-digit OTP.',
      code: 'INVALID_CODE_LENGTH',
    };
  }

  if (!confirmation || typeof confirmation.confirm !== 'function') {
    return {
      success: false,
      title: 'This OTP has expired.',
      message: 'This OTP has expired.',
      code: 'EXPIRED_OTP',
    };
  }

  try {
    const userCredential = await confirmation.confirm(cleanCode);
    const user = userCredential.user;
    
    if (!user) {
      return {
        success: false,
        title: 'Something went wrong',
        message: 'Failed to retrieve user session from Firebase.',
        code: 'USER_NOT_FOUND',
      };
    }

    // Retrieve fresh Firebase ID token to send to backend for server-side verification
    const idToken = await user.getIdToken(true);
    const phoneNumber = user.phoneNumber || '';
    const uid = user.uid;

    console.log('[FirebaseAuthService] OTP verified successfully. ID token length:', idToken?.length);
    return {
      success: true,
      idToken,
      phoneNumber,
      uid,
    };
  } catch (err: any) {
    console.error('[FirebaseAuthService Technical Error] verifyFirebaseOtp:', err);
    let title = 'Incorrect OTP';
    let message = 'Please check the OTP and try again.';
    let code = 'INVALID_OTP';
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);

    if (errCode === 'auth/invalid-verification-code' || errStr.includes('invalid-verification-code')) {
      title = 'Incorrect OTP';
      message = 'Please check the OTP and try again.';
      code = 'INVALID_OTP';
    } else if (errCode === 'auth/session-expired' || errStr.includes('session-expired') || errStr.includes('code-expired')) {
      title = 'This OTP has expired.';
      message = 'This OTP has expired.';
      code = 'EXPIRED_OTP';
    } else if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
      title = 'Too many OTP attempts';
      message = 'Please wait a while before requesting another OTP.';
      code = 'TOO_MANY_REQUESTS';
    } else if (
      errCode === 'auth/missing-client-identifier' ||
      errStr.includes('missing-client-identifier') ||
      errCode === 'auth/invalid-app-credential' ||
      errStr.includes('invalid-app-credential')
    ) {
      title = "We couldn't verify this device.";
      message = 'Please check your connection and try again.';
      code = 'APP_VERIFICATION_FAILED';
    } else if (errStr.includes('network') || errCode === 'auth/network-request-failed') {
      title = 'Something went wrong';
      message = 'Please check your internet connection and try again.';
      code = 'NETWORK_ERROR';
    }

    return {
      success: false,
      title,
      message,
      code,
      error: err,
    };
  }
}
