import { Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';
import { saveStoredUser, getToken } from '../constants/Auth';

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

// ============================================================================
// EMAIL VERIFICATION & LINKING ON EXISTING FIREBASE USER (PHONE PRESERVED)
// ============================================================================

export interface EmailVerificationResult {
  success: boolean;
  title?: string;
  message?: string;
  code?: string;
  email?: string;
  emailVerified?: boolean;
  cooldownSeconds?: number;
  user?: any;
  error?: any;
}

// Track resend cooldown timestamp in memory
let lastVerificationEmailSentAt = 0;
const RESEND_COOLDOWN_MS = 60000; // 60 seconds

/**
 * Returns the active Firebase User instance across Native & Web.
 */
export function getFirebaseCurrentUser(): any {
  try {
    if (Platform.OS !== 'web') {
      const auth = require('@react-native-firebase/auth').default;
      return auth().currentUser;
    } else {
      const { getAuth } = require('firebase/auth');
      const { getApps, initializeApp } = require('firebase/app');
      const firebaseConfig = {
        apiKey: "AIzaSyCGYTbKMrm04MqY4NDQEq1RhU7Bvj8gJZ0",
        authDomain: "allver-f9cbf.firebaseapp.com",
        projectId: "allver-f9cbf",
        storageBucket: "allver-f9cbf.firebasestorage.app",
        messagingSenderId: "218434531138",
        appId: "1:218434531138:web:a6db413cbf2b801a6b0c6f"
      };
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      return getAuth(app).currentUser;
    }
  } catch (e) {
    console.error('[FirebaseAuthService] Error retrieving Firebase current user:', e);
    return null;
  }
}

/**
 * Validates email address format.
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
}

/**
 * Links or updates the email on the EXISTING Firebase phone-authenticated user,
 * then sends the standard Firebase verification email.
 * PRESERVES the phone identity without creating a separate Firebase user.
 */
export async function linkEmailAndSendVerification(email: string, userId?: string): Promise<EmailVerificationResult> {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isValidEmailFormat(cleanEmail)) {
    return {
      success: false,
      title: 'Invalid Email Address',
      message: 'Please enter a valid email address (e.g. name@example.com).',
      code: 'INVALID_EMAIL'
    };
  }

  // Resend cooldown protection check
  const timeSinceLastSend = Date.now() - lastVerificationEmailSentAt;
  if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
    return {
      success: false,
      title: 'Please Wait',
      message: `Please wait ${remaining} seconds before requesting another email.`,
      code: 'COOLDOWN_ACTIVE',
      cooldownSeconds: remaining
    };
  }

  // 1. Primary Method: Authoritative backend dispatch via Google Identity Toolkit REST API
  // This bypasses client-side session age restrictions (auth/requires-recent-login)
  // and allows users to verify their email anytime without forced re-authentication.
  try {
    const token = await getToken();
    const endpoint = `${BACKEND_URL}/api/auth/send-email-verification`;
    console.log(`[FirebaseAuthService] Dispatching verification email for "${cleanEmail}" via backend...`);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        email: cleanEmail,
        userId
      })
    });

    const data = await resp.json();
    console.log(`[FirebaseAuthService] Backend send-email-verification response [${resp.status}]:`, data);

    if (resp.ok && data.success) {
      lastVerificationEmailSentAt = Date.now();

      if (data.emailVerified) {
        if (data.user) {
          await saveStoredUser(data.user);
          (global as any).currentUser = data.user;
        }
        return {
          success: true,
          title: 'Already Verified',
          message: data.message || 'This email address is already verified!',
          email: cleanEmail,
          emailVerified: true,
          user: data.user
        };
      }

      return {
        success: true,
        title: 'Verification Email Sent',
        message: data.message || `A verification link has been sent to ${cleanEmail}. Please check your inbox and click the link to verify.`,
        email: cleanEmail,
        emailVerified: false,
        cooldownSeconds: data.cooldownSeconds || 60
      };
    } else if (resp.status === 409) {
      return {
        success: false,
        title: 'Email Already in Use',
        message: data.message || 'This email is already associated with another Allver account. Please use a different email.',
        code: 'EMAIL_ALREADY_IN_USE'
      };
    } else if (data.message) {
      return {
        success: false,
        title: 'Unable to Send Email',
        message: data.message,
        code: 'SEND_FAILED'
      };
    }
  } catch (backendErr: any) {
    console.warn('[FirebaseAuthService] Backend verification dispatch failed, attempting Firebase client fallback:', backendErr.message);
  }

  // 2. Client-Side Fallback Method (if backend is unreachable / offline)
  const currentUser = getFirebaseCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      title: 'Connection Error',
      message: 'Could not reach server to send verification email. Please check your internet connection and try again.',
      code: 'SERVER_UNREACHABLE'
    };
  }

  try {
    const currentAttachedEmail = (currentUser.email || '').toLowerCase().trim();

    if (currentAttachedEmail === cleanEmail && currentUser.emailVerified) {
      return {
        success: true,
        title: 'Already Verified',
        message: 'This email is already verified on your account.',
        email: cleanEmail,
        emailVerified: true
      };
    }

    if (currentAttachedEmail === cleanEmail && !currentUser.emailVerified) {
      if (Platform.OS !== 'web') {
        if (typeof currentUser.sendEmailVerification === 'function') {
          await currentUser.sendEmailVerification();
        } else if (typeof currentUser.verifyBeforeUpdateEmail === 'function') {
          await currentUser.verifyBeforeUpdateEmail(cleanEmail);
        }
      } else {
        const { sendEmailVerification } = require('firebase/auth');
        await sendEmailVerification(currentUser);
      }
    } else {
      if (Platform.OS !== 'web') {
        if (typeof currentUser.verifyBeforeUpdateEmail === 'function') {
          await currentUser.verifyBeforeUpdateEmail(cleanEmail);
        }
      } else {
        const { verifyBeforeUpdateEmail } = require('firebase/auth');
        await verifyBeforeUpdateEmail(currentUser, cleanEmail);
      }
    }

    lastVerificationEmailSentAt = Date.now();
    return {
      success: true,
      title: 'Verification Email Sent',
      message: `A verification link has been sent to ${cleanEmail}. Please check your inbox and click the link to verify.`,
      email: cleanEmail,
      emailVerified: false,
      cooldownSeconds: 60
    };
  } catch (err: any) {
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);

    console.error('[FirebaseAuthService] Fallback client verification failed:', {
      errorCode: errCode,
      errorMessage: errStr,
      cleanEmail
    });

    let title = 'Unable to Send Verification Email';
    let message = 'An error occurred while sending the verification email. Please try again.';
    let code = errCode || 'UNKNOWN_ERROR';

    if (errCode === 'auth/operation-not-allowed' || errStr.includes('operation-not-allowed')) {
      title = 'Email Verification Not Allowed';
      message = 'Operation not allowed by Firebase. Please verify Email/Password provider is enabled in Firebase Console.';
      code = 'OPERATION_NOT_ALLOWED';
    } else if (errCode === 'auth/email-already-in-use' || errStr.includes('email-already-in-use')) {
      title = 'Email Already in Use';
      message = 'This email is already associated with another Allver account. Please use a different email.';
      code = 'EMAIL_ALREADY_IN_USE';
    } else if (errCode === 'auth/invalid-email' || errStr.includes('invalid-email')) {
      title = 'Invalid Email Address';
      message = 'Please enter a valid email address.';
      code = 'INVALID_EMAIL';
    } else if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
      title = 'Too Many Requests';
      message = 'Too many requests. Please wait a few moments before trying again.';
      code = 'TOO_MANY_REQUESTS';
    } else if (errStr.includes('network') || errCode === 'auth/network-request-failed') {
      title = 'Connection Error';
      message = 'Network error. Please check your internet connection and try again.';
      code = 'NETWORK_ERROR';
    }

    return {
      success: false,
      title,
      message,
      code,
      error: err
    };
  }
}

/**
 * Checks verification status for the given email address.
 * Queries the authoritative backend service and syncs verified state to local storage.
 */
export async function reloadAndCheckEmailVerification(userId?: string, targetEmail?: string): Promise<EmailVerificationResult> {
  const cleanEmail = (targetEmail || '').trim().toLowerCase();

  // 1. Primary Check: Authoritative backend endpoint
  try {
    const token = await getToken();
    const endpoint = `${BACKEND_URL}/api/auth/check-email-verification`;
    console.log(`[FirebaseAuthService] Checking verification status via backend for "${cleanEmail || 'current'}"...`);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        email: cleanEmail,
        userId
      })
    });

    const data = await resp.json();
    console.log(`[FirebaseAuthService] check-email-verification response [${resp.status}]:`, data);

    if (resp.ok && data.success) {
      if (data.emailVerified) {
        if (data.user) {
          await saveStoredUser(data.user);
          (global as any).currentUser = data.user;
        }

        // Silent refresh of native Firebase session if available
        try {
          const currentUser = getFirebaseCurrentUser();
          if (currentUser) {
            if (Platform.OS !== 'web') {
              await currentUser.reload();
            } else {
              const { reload } = require('firebase/auth');
              await reload(currentUser);
            }
          }
        } catch (e) {}

        return {
          success: true,
          email: data.email || cleanEmail,
          emailVerified: true,
          user: data.user,
          title: 'Email Verified',
          message: data.message || 'Your email address has been successfully verified!'
        };
      } else {
        return {
          success: true,
          email: data.email || cleanEmail,
          emailVerified: false,
          title: 'Verification Pending',
          message: data.message || 'Your email has not been verified yet. Please check your inbox and click the verification link.'
        };
      }
    }
  } catch (backendErr: any) {
    console.warn('[FirebaseAuthService] Backend status check error, attempting Firebase fallback:', backendErr.message);
  }

  // 2. Client-Side Fallback: Check active Firebase user session & sync
  const currentUser = getFirebaseCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      title: 'Verification Pending',
      message: 'Could not connect to verify status. Please check your connection and tap "Already verified? Check again".',
      code: 'SERVER_UNREACHABLE'
    };
  }

  try {
    if (Platform.OS !== 'web') {
      await currentUser.reload();
    } else {
      const { reload } = require('firebase/auth');
      await reload(currentUser);
    }

    const isVerified = Boolean(currentUser.emailVerified);
    const email = currentUser.email || cleanEmail;

    if (!isVerified) {
      return {
        success: true,
        email,
        emailVerified: false,
        title: 'Verification Pending',
        message: 'Your email has not been verified yet. Please check your inbox and click the verification link.'
      };
    }

    // Sync verified state to backend with ID token
    const idToken = await currentUser.getIdToken(true);
    try {
      const syncEndpoint = `${BACKEND_URL}/api/auth/sync-email-verification`;
      const res = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ idToken, userId })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        await saveStoredUser(data.user);
        (global as any).currentUser = data.user;
        return {
          success: true,
          email: data.email || email,
          emailVerified: true,
          user: data.user,
          title: 'Email Verified',
          message: 'Your email address has been successfully verified!'
        };
      }
    } catch (syncErr: any) {
      console.warn('[FirebaseAuthService] Fallback sync error:', syncErr.message);
    }

    return {
      success: true,
      email,
      emailVerified: true,
      title: 'Email Verified',
      message: 'Your email is verified.'
    };
  } catch (err: any) {
    return {
      success: false,
      title: 'Error Checking Status',
      message: 'Could not refresh verification status. Please check your connection and try again.',
      code: 'RELOAD_FAILED',
      error: err
    };
  }
}

// ============================================================================
// GOOGLE SIGN-IN & ACCOUNT LINKING
// ============================================================================

export interface GoogleAuthResult {
  success: boolean;
  idToken?: string;
  user?: any;
  title?: string;
  message?: string;
  code?: string;
  error?: any;
}

/**
 * Performs Google Authentication via Firebase Auth.
 * Native platforms use Google credentials; Web uses standard Firebase popup.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  console.log('[FirebaseAuthService] Initiating Google Sign-In...');
  try {
    if (Platform.OS === 'web') {
      const { getAuth, signInWithPopup, GoogleAuthProvider } = require('firebase/auth');
      const { getApps, initializeApp } = require('firebase/app');

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
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const idToken = await user.getIdToken(true);

      console.log('[FirebaseAuthService] Web Google Sign-In successful. ID token acquired.');
      return {
        success: true,
        idToken,
        user
      };
    } else {
      // Native Android / iOS
      let googleIdToken: string | null = null;
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        try {
          GoogleSignin.configure({
            webClientId: '218434531138-ohla1ujvml63ad6etd8hb2cm5en6k1s0.apps.googleusercontent.com',
          });
        } catch (cErr) {}
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        googleIdToken = signInResult.data?.idToken || (signInResult as any).idToken;
      } catch (nativeErr: any) {
        console.warn('[FirebaseAuthService] Native GoogleSignin unavailable:', nativeErr?.message || nativeErr);
      }

      if (googleIdToken) {
        const auth = require('@react-native-firebase/auth').default;
        const googleCredential = auth.GoogleAuthProvider.credential(googleIdToken);
        const userCredential = await auth().signInWithCredential(googleCredential);
        const user = userCredential.user;
        const idToken = await user.getIdToken(true);

        console.log('[FirebaseAuthService] Native Google Sign-In successful. ID token acquired.');
        return {
          success: true,
          idToken,
          user
        };
      }

      // Native fallback when native GoogleSignin package is not yet compiled
      return {
        success: false,
        title: 'Google Sign-In',
        message: 'Google Sign-In requires configuration. Please configure Google Services or test via Web.',
        code: 'NATIVE_MODULE_UNAVAILABLE'
      };
    }
  } catch (err: any) {
    console.error('[FirebaseAuthService] signInWithGoogle error:', err);
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);

    if (errCode === 'auth/popup-closed-by-user' || errStr.includes('closed-by-user')) {
      return {
        success: false,
        title: 'Sign-in Cancelled',
        message: 'Google Sign-In was cancelled.',
        code: 'CANCELLED'
      };
    }

    if (errCode === 'auth/account-exists-with-different-credential') {
      return {
        success: false,
        title: 'Account Already Exists',
        message: 'An account already exists with the same email address but different sign-in credentials.',
        code: 'ACCOUNT_EXISTS'
      };
    }

    if (errCode === 'auth/operation-not-allowed' || errStr.includes('operation-not-allowed')) {
      return {
        success: false,
        title: 'Google Sign-In Disabled in Firebase',
        message: 'Google Sign-In is not enabled in your Firebase Console. Go to Firebase Console > Authentication > Sign-in method > Google and toggle Enable.',
        code: 'OPERATION_NOT_ALLOWED'
      };
    }

    if (errCode === 'auth/unauthorized-domain' || errStr.includes('unauthorized-domain')) {
      return {
        success: false,
        title: 'Unauthorized Domain',
        message: 'This domain is not authorized for OAuth in Firebase. Add it to Firebase Console > Authentication > Settings > Authorized domains.',
        code: 'UNAUTHORIZED_DOMAIN'
      };
    }

    if (errCode === 'auth/popup-blocked' || errStr.includes('popup-blocked')) {
      return {
        success: false,
        title: 'Popup Blocked',
        message: 'The Google Sign-In popup was blocked by your browser. Please allow popups for this site.',
        code: 'POPUP_BLOCKED'
      };
    }

    return {
      success: false,
      title: 'Google Sign-In Error',
      message: err.message || 'Unable to sign in with Google. Please try again.',
      code: errCode || 'GOOGLE_SIGNIN_FAILED',
      error: err
    };
  }
}

/**
 * Safely links a Google credential to the EXISTING authenticated user.
 * Preserves existing phone identity and avoids duplicate accounts.
 */
export async function linkGoogleAccount(): Promise<GoogleAuthResult> {
  try {
    const currentUser = getFirebaseCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        title: 'Sign In Required',
        message: 'Please log in before linking your Google account.',
        code: 'NO_USER'
      };
    }

    if (Platform.OS === 'web') {
      const { linkWithPopup, GoogleAuthProvider } = require('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await linkWithPopup(currentUser, provider);
      const idToken = await userCredential.user.getIdToken(true);
      return {
        success: true,
        idToken,
        user: userCredential.user
      };
    } else {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      try {
        GoogleSignin.configure({
          webClientId: '218434531138-ohla1ujvml63ad6etd8hb2cm5en6k1s0.apps.googleusercontent.com',
        });
      } catch (cErr) {}
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const googleIdToken = signInResult.data?.idToken || (signInResult as any).idToken;

      const auth = require('@react-native-firebase/auth').default;
      const googleCredential = auth.GoogleAuthProvider.credential(googleIdToken);
      const userCredential = await currentUser.linkWithCredential(googleCredential);
      const idToken = await userCredential.user.getIdToken(true);
      return {
        success: true,
        idToken,
        user: userCredential.user
      };
    }
  } catch (err: any) {
    const errCode = err?.code || '';
    if (errCode === 'auth/credential-already-in-use') {
      return {
        success: false,
        title: 'Account Already Linked',
        message: 'This Google account is already linked to another Allver user.',
        code: 'CREDENTIAL_ALREADY_IN_USE'
      };
    }
    if (errCode === 'auth/account-exists-with-different-credential') {
      return {
        success: false,
        title: 'Account Exists',
        message: 'An account already exists with this email using a different sign-in method.',
        code: 'ACCOUNT_EXISTS'
      };
    }
    return {
      success: false,
      title: 'Linking Error',
      message: err.message || 'Could not link Google account.',
      code: errCode,
      error: err
    };
  }
}

/**
 * Sends a verified Firebase Phone OTP ID Token to the backend to authoritatively
 * mark phoneVerified = true on the user profile and update local session.
 */
export async function verifyAndLinkPhoneWithBackend(
  phoneIdToken: string,
  phoneNumber: string
): Promise<{ success: boolean; user?: any; token?: string; message?: string; error?: any }> {
  try {
    const token = await getToken();
    const endpoint = `${BACKEND_URL}/api/auth/verify-phone`;
    console.log(`[FirebaseAuthService] Submitting phone verification to backend for ${phoneNumber}...`);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        phoneIdToken,
        phoneNumber
      })
    });

    const data = await resp.json();
    console.log(`[FirebaseAuthService] Backend verify-phone response [${resp.status}]:`, data);

    if (resp.ok && data.success) {
      if (data.token) {
        await saveToken(data.token);
      }
      if (data.user) {
        await saveStoredUser(data.user);
        (global as any).currentUser = data.user;
      }
      return {
        success: true,
        user: data.user,
        token: data.token,
        message: data.message || 'Phone number verified successfully!'
      };
    } else {
      return {
        success: false,
        message: data.message || 'Phone verification could not be completed.'
      };
    }
  } catch (err: any) {
    console.error('[FirebaseAuthService] verifyAndLinkPhoneWithBackend error:', err);
    return {
      success: false,
      message: 'Could not connect to verification server: ' + (err.message || err),
      error: err
    };
  }
}
