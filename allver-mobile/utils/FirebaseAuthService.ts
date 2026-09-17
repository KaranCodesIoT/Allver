import { Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';
import { saveStoredUser } from '../constants/Auth';

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
export async function linkEmailAndSendVerification(email: string): Promise<EmailVerificationResult> {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!isValidEmailFormat(cleanEmail)) {
    return {
      success: false,
      title: 'Invalid Email Address',
      message: 'Please enter a valid email address (e.g. name@example.com).',
      code: 'INVALID_EMAIL'
    };
  }

  const currentUser = getFirebaseCurrentUser();
  const currentUserExists = Boolean(currentUser);

  // Diagnostic logging of current user state before operation
  console.log('[FirebaseAuthService DIAGNOSTIC] Current user before email operation:', {
    currentUserExists,
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
    emailVerified: currentUser?.emailVerified ?? null,
    phoneNumber: currentUser?.phoneNumber || null,
    targetEmail: cleanEmail,
    platform: Platform.OS
  });

  if (!currentUser) {
    return {
      success: false,
      title: 'Login Required',
      message: 'You must be logged in with your mobile number to link an email.',
      code: 'NO_AUTH_USER'
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

  try {
    const currentAttachedEmail = (currentUser.email || '').toLowerCase().trim();

    // Check if target email is already attached and already verified
    if (currentAttachedEmail === cleanEmail && currentUser.emailVerified) {
      console.log(`[FirebaseAuthService] Email "${cleanEmail}" is already attached and verified on UID: ${currentUser.uid}.`);
      return {
        success: true,
        title: 'Already Verified',
        message: 'This email is already verified on your account.',
        email: cleanEmail,
        emailVerified: true
      };
    }

    if (currentAttachedEmail === cleanEmail && !currentUser.emailVerified) {
      // Email is already attached on the Firebase user, but unverified.
      // Send standard email verification to the attached email.
      console.log(`[FirebaseAuthService] Email "${cleanEmail}" is already attached. Triggering verification email resend for UID: ${currentUser.uid}...`);
      if (Platform.OS !== 'web') {
        if (typeof currentUser.sendEmailVerification === 'function') {
          await currentUser.sendEmailVerification();
        } else if (typeof currentUser.verifyBeforeUpdateEmail === 'function') {
          await currentUser.verifyBeforeUpdateEmail(cleanEmail);
        } else {
          await currentUser.updateEmail(cleanEmail);
          await currentUser.sendEmailVerification();
        }
      } else {
        const { sendEmailVerification, verifyBeforeUpdateEmail } = require('firebase/auth');
        try {
          await sendEmailVerification(currentUser);
        } catch (webSendErr) {
          await verifyBeforeUpdateEmail(currentUser, cleanEmail);
        }
      }
    } else {
      // Email is new or different from currently attached email (e.g. initial attachment for phone-auth user).
      // Under Firebase Email Enumeration Protection, updateEmail() throws auth/operation-not-allowed.
      // verifyBeforeUpdateEmail() sends the verification email directly to the new address and links/updates
      // the existing phone user once verified, completely preserving UID and session.
      console.log(`[FirebaseAuthService] Sending verification email for "${cleanEmail}" to existing user UID: ${currentUser.uid}...`);
      if (Platform.OS !== 'web') {
        if (typeof currentUser.verifyBeforeUpdateEmail === 'function') {
          console.log('[FirebaseAuthService] Using native currentUser.verifyBeforeUpdateEmail()...');
          await currentUser.verifyBeforeUpdateEmail(cleanEmail);
        } else {
          console.log('[FirebaseAuthService] Fallback: updateEmail then sendEmailVerification...');
          await currentUser.updateEmail(cleanEmail);
          await currentUser.sendEmailVerification();
        }
      } else {
        const { verifyBeforeUpdateEmail } = require('firebase/auth');
        console.log('[FirebaseAuthService Web] Using web verifyBeforeUpdateEmail()...');
        await verifyBeforeUpdateEmail(currentUser, cleanEmail);
      }
    }

    lastVerificationEmailSentAt = Date.now();
    console.log(`[FirebaseAuthService] Verification email successfully dispatched to ${cleanEmail} for UID: ${currentUser.uid}.`);

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
    const nativeMsg = (err as any)?.nativeErrorMessage || (err as any)?.userInfo || null;

    // Full diagnostic error log as requested
    console.error('[FirebaseAuthService DIAGNOSTIC] linkEmailAndSendVerification failed:', {
      errorCode: errCode,
      errorMessage: errStr,
      nativeErrorMessage: nativeMsg,
      currentUserExists: Boolean(currentUser),
      uid: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified ?? null,
      targetEmail: cleanEmail
    });

    let title = 'Unable to Send Verification Email';
    let message = errStr ? `An error occurred: [${errCode || 'UNKNOWN'}] ${errStr}` : 'An error occurred while sending the verification email. Please try again.';
    let code = errCode || 'UNKNOWN_ERROR';

    if (errCode === 'auth/operation-not-allowed' || errStr.includes('operation-not-allowed')) {
      title = 'Email Verification Not Allowed';
      message = 'Operation not allowed by Firebase. If this is a new project, please ensure the Email/Password provider is enabled in Firebase Console (Authentication > Sign-in method).';
      code = 'OPERATION_NOT_ALLOWED';
    } else if (errCode === 'auth/email-already-in-use' || errStr.includes('email-already-in-use')) {
      title = 'Email Already in Use';
      message = 'This email is already associated with another Allver account. Please use a different email.';
      code = 'EMAIL_ALREADY_IN_USE';
    } else if (errCode === 'auth/invalid-email' || errStr.includes('invalid-email')) {
      title = 'Invalid Email Address';
      message = 'Please enter a valid email address.';
      code = 'INVALID_EMAIL';
    } else if (errCode === 'auth/requires-recent-login' || errStr.includes('requires-recent-login')) {
      title = 'Recent Login Required';
      message = 'For your security, please log out and log in again with OTP before updating your email.';
      code = 'REQUIRES_RECENT_LOGIN';
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
 * Reloads the Firebase user from the server, checks currentUser.emailVerified,
 * and if verified, cryptographically synchronizes with the backend.
 */
export async function reloadAndCheckEmailVerification(userId?: string): Promise<EmailVerificationResult> {
  const currentUser = getFirebaseCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      title: 'Session Expired',
      message: 'No active session found. Please log in again.',
      code: 'NO_AUTH_USER'
    };
  }

  try {
    // Reload user profile from Firebase servers
    console.log('[FirebaseAuthService] Reloading Firebase user session...');
    if (Platform.OS !== 'web') {
      await currentUser.reload();
    } else {
      const { reload } = require('firebase/auth');
      await reload(currentUser);
    }

    const isVerified = Boolean(currentUser.emailVerified);
    const email = currentUser.email || '';
    console.log(`[FirebaseAuthService] User reloaded. email: "${email}", emailVerified: ${isVerified}`);

    if (!isVerified) {
      return {
        success: true,
        email,
        emailVerified: false,
        title: 'Not Verified Yet',
        message: 'Your email has not been verified yet. Please check your inbox and click the verification link.'
      };
    }

    // Cryptographic verification on backend:
    // Extract fresh ID token signed by Firebase
    const idToken = await currentUser.getIdToken(true);
    console.log('[FirebaseAuthService] Acquired fresh ID token to sync with backend...');

    try {
      const syncEndpoint = `${BACKEND_URL}/api/auth/sync-email-verification`;
      const res = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          idToken,
          userId
        })
      });

      const data = await res.json();
      console.log(`[FirebaseAuthService] Backend sync response status: ${res.status}`, data?.success);

      if (res.ok && data.success && data.user) {
        // Save updated user to local SecureStore & global memory
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
      } else if (res.status === 409) {
        return {
          success: false,
          title: 'Email Conflict',
          message: data.message || 'This email is already registered to another Allver user account.',
          code: 'EMAIL_ALREADY_IN_USE'
        };
      }
    } catch (syncErr: any) {
      console.warn('[FirebaseAuthService] Backend sync warning:', syncErr.message);
    }

    return {
      success: true,
      email,
      emailVerified: true,
      title: 'Email Verified',
      message: 'Your email is verified in Firebase.'
    };
  } catch (err: any) {
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);
    console.error('[FirebaseAuthService DIAGNOSTIC] reloadAndCheckEmailVerification failed:', {
      errorCode: errCode,
      errorMessage: errStr,
      currentUserExists: Boolean(currentUser),
      uid: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified ?? null
    });
    return {
      success: false,
      title: 'Error Checking Status',
      message: errStr ? `Could not refresh status: [${errCode || 'UNKNOWN'}] ${errStr}` : 'Could not refresh verification status. Please check your connection and try again.',
      code: errCode || 'RELOAD_FAILED',
      error: err
    };
  }
}
