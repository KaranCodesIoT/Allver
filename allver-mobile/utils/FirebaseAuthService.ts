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
  message?: string;
  error?: any;
}

export interface VerifyOtpResult {
  success: boolean;
  idToken?: string;
  phoneNumber?: string;
  uid?: string;
  message?: string;
  error?: any;
}

/**
 * Sends a real SMS OTP via Firebase Authentication.
 */
export async function sendFirebaseOtp(phoneNumber: string): Promise<SendOtpResult> {
  const formattedPhone = formatIndianPhoneNumber(phoneNumber);
  console.log('[FirebaseAuthService] Sending OTP to:', formattedPhone);

  if (!formattedPhone || formattedPhone.length < 12) {
    return { success: false, message: 'Please enter a valid 10-digit mobile number.' };
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
        if (!(window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible'
          });
        }
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
        return { success: true, confirmation };
      }

      return { success: false, message: 'Web recaptcha window is not available.' };
    }
  } catch (err: any) {
    console.error('[FirebaseAuthService Error] sendFirebaseOtp:', err);
    return {
      success: false,
      message: err.message || 'Failed to send OTP. Please check your phone number and try again.',
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
    return { success: false, message: 'Please enter the complete 6-digit OTP.' };
  }

  if (!confirmation || typeof confirmation.confirm !== 'function') {
    return { success: false, message: 'Session expired. Please request a new OTP.' };
  }

  try {
    const userCredential = await confirmation.confirm(cleanCode);
    const user = userCredential.user;
    
    if (!user) {
      return { success: false, message: 'Failed to retrieve user session from Firebase.' };
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
    console.error('[FirebaseAuthService Error] verifyFirebaseOtp:', err);
    let errorMsg = 'Incorrect OTP. Please try again.';
    if (err.code === 'auth/invalid-verification-code' || err.message?.includes('invalid-verification-code')) {
      errorMsg = 'Invalid OTP code. Please enter the correct 6-digit code.';
    } else if (err.code === 'auth/session-expired' || err.message?.includes('session-expired')) {
      errorMsg = 'OTP has expired. Please tap "Resend OTP" to request a new code.';
    }
    return {
      success: false,
      message: errorMsg,
      error: err,
    };
  }
}
