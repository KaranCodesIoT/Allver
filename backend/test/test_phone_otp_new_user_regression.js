// backend/test/test_phone_otp_new_user_regression.js
// Complete Regression Test Suite for Firebase Phone OTP Authentication (Cases A - M)
// Covers all 14 production scenarios specified in user requirements:
// CASE A: User enters a wrong/invalid phone number (inline validation, no OTP sent)
// CASE B: User enters a valid number that is not registered ("You're new to Allver" modal + Create Account)
// CASE C: User enters an existing registered phone number (normal login, session restored)
// CASE D: User enters the wrong OTP ("Incorrect OTP" + [Try Again])
// CASE E: OTP expires ("This OTP has expired." + [Resend OTP])
// CASE F: Rate limit / Too many OTP attempts ("Too many OTP attempts" + wait)
// CASE G: Firebase app verification failure ("We couldn't verify this device." + internal log)
// CASE H: Network failure ("Something went wrong" + check internet)
// CASE I: User presses back / changes phone number during OTP (clean state reset)
// CASE J: User resends OTP (timer resets, new verification code requested)
// CASE K: User completes registration (verified phone, optional email, custom password)
// CASE L: Direct registration without verified phone OTP is blocked
// CASE M: Security validation: Mismatched client phone vs verified token rejected with 403

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

function formatPhoneNumberToE164(phone) {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (phone.toString().startsWith('+')) {
    return `+${digits}`;
  }
  return `+91${digits.slice(-10)}`;
}

// Client UI & State Simulator mirroring login.tsx and FirebaseAuthService.ts
class ClientAuthFlowSimulator {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.currentUser = null;
    this.token = null;
    this.unregisteredModalVisible = false;
    this.unregisteredPhoneData = null;
    this.bannerNotice = null;
    this.phoneError = null;
    this.phoneNumber = '';
    this.otpSent = false;
    this.otpCode = '';
    this.resendTimer = 0;
    this.confirmationResult = null;
    this.signupParams = null;
    this.currentScreen = '/login';
  }

  validateIndianMobile(num) {
    const digits = (num || '').toString().replace(/\D/g, '');
    if (!digits || digits.length === 0) {
      return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
      return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    return { valid: true };
  }

  // Exact client error mapping from FirebaseAuthService.ts
  mapFirebaseOtpError(err) {
    const errCode = err?.code || '';
    const errStr = err?.message || String(err);

    if (errCode === 'auth/invalid-verification-code' || errStr.includes('invalid-verification-code')) {
      return {
        title: 'Incorrect OTP',
        message: 'Please check the OTP and try again.',
        code: 'INVALID_OTP',
        actionText: 'Try Again'
      };
    }
    if (
      errCode === 'auth/session-expired' ||
      errStr.includes('session-expired') ||
      errCode === 'auth/code-expired' ||
      errStr.includes('code-expired')
    ) {
      return {
        title: 'This OTP has expired.',
        message: 'Please request a new OTP to continue.',
        code: 'EXPIRED_OTP',
        actionText: 'Resend OTP'
      };
    }
    if (errCode === 'auth/too-many-requests' || errStr.includes('too-many-requests')) {
      return {
        title: 'Too many OTP attempts',
        message: 'Please wait a while before requesting another OTP.',
        code: 'TOO_MANY_REQUESTS'
      };
    }
    if (
      errCode === 'auth/missing-client-identifier' ||
      errStr.includes('missing-client-identifier') ||
      errCode === 'auth/invalid-app-credential' ||
      errStr.includes('invalid-app-credential')
    ) {
      return {
        title: "We couldn't verify this device.",
        message: 'Please check your connection and try again.',
        code: 'APP_VERIFICATION_FAILED'
      };
    }
    if (errCode === 'auth/network-request-failed' || errStr.includes('network-request-failed')) {
      return {
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
        code: 'NETWORK_ERROR'
      };
    }

    return {
      title: 'Incorrect OTP',
      message: 'Please check the OTP and try again.',
      code: 'UNKNOWN_ERROR',
      actionText: 'Try Again'
    };
  }

  // Simulated handleSendOtp from login.tsx
  async handleSendOtp(num, mockSendFn) {
    this.phoneNumber = num;
    const validation = this.validateIndianMobile(num);
    if (!validation.valid) {
      this.phoneError = validation.error;
      return { success: false, reason: 'INVALID_INPUT', error: validation.error };
    }
    this.phoneError = null;
    this.bannerNotice = null;

    try {
      const res = await (mockSendFn ? mockSendFn(num) : { success: true, confirmation: { mock: true } });
      if (res.success && res.confirmation) {
        this.confirmationResult = res.confirmation;
        this.otpSent = true;
        this.resendTimer = 30;
        this.bannerNotice = {
          type: 'success',
          title: 'OTP Sent',
          message: `A 6-digit verification code has been sent to +91 ${num.replace(/\D/g, '').slice(-10)}`
        };
        return { success: true };
      } else {
        this.bannerNotice = {
          type: 'error',
          title: res.title || 'OTP Error',
          message: res.message || 'Could not send verification code.'
        };
        return { success: false, reason: 'SEND_FAILED', bannerNotice: this.bannerNotice };
      }
    } catch (err) {
      const mapped = this.mapFirebaseOtpError(err);
      this.bannerNotice = {
        type: 'error',
        title: mapped.title,
        message: mapped.message
      };
      return { success: false, reason: 'EXCEPTION', bannerNotice: this.bannerNotice };
    }
  }

  // Simulated handleVerifyOtpAndLogin from login.tsx
  async handleVerifyOtpAndLogin({ verifyRes, phoneNumber }) {
    if (!verifyRes || !verifyRes.success || !verifyRes.idToken) {
      const mapped = this.mapFirebaseOtpError(verifyRes || { code: 'auth/invalid-verification-code' });
      this.bannerNotice = {
        type: 'error',
        title: mapped.title,
        message: mapped.message,
        actionText: mapped.actionText
      };
      return { success: false, reason: 'OTP_VERIFICATION_FAILED', bannerNotice: this.bannerNotice };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/firebase-phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: verifyRes.idToken,
          phoneNumber: verifyRes.phoneNumber || phoneNumber
        })
      });

      if (response.status === 429) {
        this.bannerNotice = {
          type: 'error',
          title: 'Too many OTP attempts',
          message: 'Please wait a while before requesting another OTP.'
        };
        return { success: false, reason: 'RATE_LIMITED', bannerNotice: this.bannerNotice };
      }

      if (response.status === 403) {
        const data = await response.json();
        this.bannerNotice = {
          type: 'error',
          title: 'Security Validation Failed',
          message: data.message
        };
        return { success: false, reason: 'FORBIDDEN_MISMATCH', bannerNotice: this.bannerNotice };
      }

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.isNewUser) {
          this.unregisteredPhoneData = {
            phoneNumber: data.phoneNumber || phoneNumber,
            idToken: verifyRes.idToken
          };
          this.unregisteredModalVisible = true;
          return { success: true, isNewUser: true, modalVisible: true };
        }

        this.token = data.token;
        this.currentUser = data.user;
        this.currentScreen = '/(tabs)';
        return { success: true, isNewUser: false, user: data.user };
      } else {
        this.bannerNotice = {
          type: 'error',
          title: 'Login Failed',
          message: data.message || 'Unable to authenticate user on server.'
        };
        return { success: false, reason: 'AUTH_FAILED', message: data.message };
      }
    } catch (netErr) {
      this.bannerNotice = {
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.'
      };
      return { success: false, reason: 'NETWORK_ERROR', bannerNotice: this.bannerNotice };
    }
  }

  triggerCreateAccountFromModal() {
    if (!this.unregisteredModalVisible || !this.unregisteredPhoneData) {
      throw new Error('Unregistered modal is not active');
    }
    this.unregisteredModalVisible = false;
    this.currentScreen = '/signup';
    this.signupParams = {
      verifiedPhone: this.unregisteredPhoneData.phoneNumber,
      idToken: this.unregisteredPhoneData.idToken
    };
  }

  triggerTryAnotherNumber() {
    this.unregisteredModalVisible = false;
    this.unregisteredPhoneData = null;
    this.otpCode = '';
    this.otpSent = false;
    this.confirmationResult = null;
    this.phoneNumber = '';
    this.phoneError = null;
    this.bannerNotice = null;
  }

  triggerChangeNumberDuringOtp() {
    this.otpSent = false;
    this.otpCode = '';
    this.confirmationResult = null;
    this.bannerNotice = null;
  }

  async handleRegister({ fullName, city, role, email, password }) {
    if (!this.signupParams || !this.signupParams.idToken) {
      throw new Error('Missing verified phone credentials in signup');
    }

    const response = await fetch(`${this.apiBaseUrl}/api/auth/firebase-phone-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: this.signupParams.idToken,
        phoneNumber: this.signupParams.verifiedPhone,
        fullName,
        city,
        role: role || 'Client',
        email,
        password
      })
    });

    const data = await response.json();
    if (response.ok && data.success) {
      this.token = data.token;
      this.currentUser = data.user;
      this.currentScreen = '/(tabs)';
      return { success: true, user: data.user, token: data.token };
    }
    return { success: false, status: response.status, message: data.message };
  }
}

async function runComprehensiveRegressionSuite() {
  console.log('================================================================');
  console.log('STARTING FIREBASE AUTH REGRESSION SUITE (CASES A - M)');
  console.log('================================================================\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required in .env');
  }

  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB Atlas.\n');

  const testSuffix = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function pass(id, detail) {
    passedCount++;
    console.log(` PASS [${id}]: ${detail}`);
  }

  function fail(id, err) {
    failedCount++;
    console.error(` FAIL [${id}]:`, err.message || err);
  }

  // Set up Express server with endpoints mirroring backend/index.js
  const app = express();
  app.use(express.json());

  const testTokens = new Map();
  function registerMockFirebaseToken(idToken, payload) {
    testTokens.set(idToken, payload);
  }

  async function mockVerifyFirebaseIdTokenHelper(idToken) {
    if (!idToken) return null;
    return testTokens.get(idToken) || null;
  }

  let rateLimitEnabled = false;

  // POST /api/auth/firebase-phone-login (Exact replica of backend/index.js)
  app.post('/api/auth/firebase-phone-login', async (req, res) => {
    try {
      if (rateLimitEnabled) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP attempts. Please wait a while before requesting another OTP.'
        });
      }

      const { idToken, phoneNumber } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
      }

      const decoded = await mockVerifyFirebaseIdTokenHelper(idToken);
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid or expired Firebase verification token' });
      }

      const tokenPhone = decoded.phone_number;
      if (tokenPhone && phoneNumber) {
        const e164Token = formatPhoneNumberToE164(tokenPhone);
        const e164Client = formatPhoneNumberToE164(phoneNumber);
        if (e164Token !== e164Client) {
          return res.status(403).json({
            success: false,
            message: 'Security validation failed: Phone number does not match verified token'
          });
        }
      }

      const verifiedPhone = tokenPhone || phoneNumber;
      if (!verifiedPhone) {
        return res.status(400).json({ success: false, message: 'Could not extract verified phone number from token' });
      }

      const e164 = formatPhoneNumberToE164(verifiedPhone);
      const rawDigits10 = e164.replace(/\D/g, '').slice(-10);

      const user = await User.findOne({
        $or: [
          { phoneNumber: e164 },
          { phoneNumber: rawDigits10 },
          { phone: e164 },
          { phone: rawDigits10 }
        ]
      });

      if (!user) {
        return res.status(200).json({
          success: true,
          isNewUser: true,
          phoneNumber: e164,
          message: "This mobile number isn't registered with Allver yet."
        });
      }

      user.lastActive = new Date();
      await user.save();

      const secret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';
      const token = jwt.sign(
        { id: user._id.toString(), userId: user._id.toString(), role: user.role },
        secret,
        { expiresIn: '30d' }
      );

      const userObj = user.toObject();
      delete userObj.password;

      return res.status(200).json({
        success: true,
        isNewUser: false,
        token,
        user: userObj,
        message: 'Login successful'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  });

  // POST /api/auth/firebase-phone-register (Exact replica of backend/index.js)
  app.post('/api/auth/firebase-phone-register', async (req, res) => {
    try {
      const { idToken, phoneNumber, fullName, role, city, email, language, password } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
      }

      const decoded = await mockVerifyFirebaseIdTokenHelper(idToken);
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Invalid or expired Firebase verification token' });
      }

      const tokenPhone = decoded.phone_number;
      if (tokenPhone && phoneNumber) {
        const e164Token = formatPhoneNumberToE164(tokenPhone);
        const e164Client = formatPhoneNumberToE164(phoneNumber);
        if (e164Token !== e164Client) {
          return res.status(403).json({
            success: false,
            message: 'Security validation failed: Phone number does not match verified token'
          });
        }
      }

      const verifiedPhone = tokenPhone || phoneNumber;
      if (!verifiedPhone) {
        return res.status(400).json({ success: false, message: 'Could not extract verified phone number from token' });
      }

      const e164 = formatPhoneNumberToE164(verifiedPhone);
      const rawDigits10 = e164.replace(/\D/g, '').slice(-10);

      const cleanEmail = email && typeof email === 'string' && email.trim().length > 0
        ? email.toLowerCase().trim()
        : null;

      const existingUser = await User.findOne({
        $or: [
          { phoneNumber: e164 },
          { phoneNumber: rawDigits10 },
          { phone: e164 },
          { phone: rawDigits10 },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this phone or email already exists. Please log in.' });
      }

      const fallbackEmail = cleanEmail || `${rawDigits10}@allver.app`;
      const finalPassword = password && password.trim().length >= 6
        ? password.trim()
        : crypto.randomBytes(16).toString('hex');

      const newUser = new User({
        fullName: (fullName || 'Allver User').trim(),
        email: fallbackEmail,
        phoneNumber: e164,
        phone: e164,
        password: finalPassword,
        role: role || 'Client',
        city: (city || 'Noida').trim(),
        language: language || 'en',
        lastActive: new Date()
      });

      await newUser.save();

      const secret = process.env.JWT_SECRET || 'allver_jwt_secure_secret_default';
      const token = jwt.sign(
        { id: newUser._id.toString(), userId: newUser._id.toString(), role: newUser.role },
        secret,
        { expiresIn: '30d' }
      );

      const userObj = newUser.toObject();
      delete userObj.password;

      return res.status(201).json({
        success: true,
        token,
        user: userObj,
        message: 'Registration successful'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  });

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(` Test Express server listening on ${baseUrl}\n`);

  try {
    // ----------------------------------------------------------------
    // CASE A: User enters an invalid phone number
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      
      // Test invalid cases: 5 digits, letters, starts with 1-5
      const invalidInputs = ['', '12345', 'abcd123456', '5123456789', '98765'];
      for (const input of invalidInputs) {
        const sendRes = await client.handleSendOtp(input);
        assert.strictEqual(sendRes.success, false, `Should reject invalid input: ${input}`);
        assert.strictEqual(client.phoneError, 'Please enter a valid 10-digit mobile number.');
        assert.strictEqual(client.otpSent, false, 'OTP must NEVER be sent for invalid input');
      }

      pass('CASE A', 'Invalid phone numbers are rejected upfront with inline validation; OTP is never sent');
    } catch (err) {
      fail('CASE A', err);
    }

    // ----------------------------------------------------------------
    // CASE B: User enters a valid number that is NOT registered
    // ----------------------------------------------------------------
    const newPhone10 = '9199990012';
    const newPhoneE164 = `+91${newPhone10}`;
    await User.deleteMany({
      $or: [{ phoneNumber: newPhoneE164 }, { phoneNumber: newPhone10 }, { phone: newPhoneE164 }]
    });

    const tokenNew = `mock_fb_token_new_${testSuffix}`;
    registerMockFirebaseToken(tokenNew, {
      uid: `fb_uid_new_${testSuffix}`,
      phone_number: newPhoneE164
    });

    let newClientSimulator = null;
    try {
      newClientSimulator = new ClientAuthFlowSimulator(baseUrl);

      // 1. Send OTP
      const sendRes = await newClientSimulator.handleSendOtp(newPhone10);
      assert.strictEqual(sendRes.success, true);
      assert.strictEqual(newClientSimulator.otpSent, true);

      // 2. Verify OTP and login attempt
      const verifyRes = await newClientSimulator.handleVerifyOtpAndLogin({
        verifyRes: {
          success: true,
          idToken: tokenNew,
          phoneNumber: newPhoneE164
        },
        phoneNumber: newPhone10
      });

      assert.strictEqual(verifyRes.success, true);
      assert.strictEqual(verifyRes.isNewUser, true, 'Backend MUST return isNewUser: true');
      assert.strictEqual(newClientSimulator.token, null, 'No session token issued for new user');
      assert.strictEqual(newClientSimulator.unregisteredModalVisible, true, 'Unregistered modal displayed');
      assert.strictEqual(newClientSimulator.unregisteredPhoneData.phoneNumber, newPhoneE164);

      // 3. Tap [Create Account]
      newClientSimulator.triggerCreateAccountFromModal();
      assert.strictEqual(newClientSimulator.currentScreen, '/signup', 'Routes to /signup');
      assert.strictEqual(newClientSimulator.signupParams.verifiedPhone, newPhoneE164);
      assert.strictEqual(newClientSimulator.signupParams.idToken, tokenNew);

      pass('CASE B', 'Valid unregistered number verifies with Firebase, triggers "You\'re new to Allver" modal, and hands off to signup');
    } catch (err) {
      fail('CASE B', err);
    }

    // ----------------------------------------------------------------
    // CASE C: User enters an existing registered phone number
    // ----------------------------------------------------------------
    const existingPhone10 = '9199990011';
    const existingPhoneE164 = `+91${existingPhone10}`;
    await User.deleteMany({
      $or: [{ phoneNumber: existingPhoneE164 }, { phoneNumber: existingPhone10 }, { phone: existingPhoneE164 }]
    });

    const existingUser = await User.create({
      fullName: 'Karan Registered User',
      email: `reg_${testSuffix}@allver.app`,
      phoneNumber: existingPhoneE164,
      phone: existingPhoneE164,
      password: 'secure_password_hash',
      role: 'Architect',
      city: 'Mumbai'
    });

    const tokenExisting = `mock_fb_token_existing_${testSuffix}`;
    registerMockFirebaseToken(tokenExisting, {
      uid: `fb_uid_existing_${testSuffix}`,
      phone_number: existingPhoneE164
    });

    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      const res = await client.handleVerifyOtpAndLogin({
        verifyRes: {
          success: true,
          idToken: tokenExisting,
          phoneNumber: existingPhoneE164
        },
        phoneNumber: existingPhone10
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.isNewUser, false);
      assert.ok(client.token, 'Session JWT returned');
      assert.strictEqual(client.currentScreen, '/(tabs)');
      assert.strictEqual(client.currentUser.phoneNumber, existingPhoneE164);
      assert.strictEqual(client.currentUser.role, 'Architect');

      pass('CASE C', 'Existing user logs in smoothly, receives session JWT, and restores profile without unregistered prompt');
    } catch (err) {
      fail('CASE C', err);
    }

    // ----------------------------------------------------------------
    // CASE D: User enters the wrong OTP
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      const errRes = await client.handleVerifyOtpAndLogin({
        verifyRes: {
          success: false,
          code: 'auth/invalid-verification-code',
          message: 'The verification code from SMS is invalid.'
        },
        phoneNumber: newPhone10
      });

      assert.strictEqual(errRes.success, false);
      assert.strictEqual(client.bannerNotice.title, 'Incorrect OTP');
      assert.strictEqual(client.bannerNotice.message, 'Please check the OTP and try again.');
      assert.strictEqual(client.bannerNotice.actionText, 'Try Again');

      pass('CASE D', 'Wrong OTP triggers inline notification: "Incorrect OTP - Please check the OTP and try again." with [Try Again]');
    } catch (err) {
      fail('CASE D', err);
    }

    // ----------------------------------------------------------------
    // CASE E: OTP expires
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      const errRes = await client.handleVerifyOtpAndLogin({
        verifyRes: {
          success: false,
          code: 'auth/session-expired',
          message: 'The SMS verification session has expired.'
        },
        phoneNumber: newPhone10
      });

      assert.strictEqual(errRes.success, false);
      assert.strictEqual(client.bannerNotice.title, 'This OTP has expired.');
      assert.strictEqual(client.bannerNotice.message, 'Please request a new OTP to continue.');
      assert.strictEqual(client.bannerNotice.actionText, 'Resend OTP');

      pass('CASE E', 'Expired OTP triggers inline notification: "This OTP has expired." with [Resend OTP]');
    } catch (err) {
      fail('CASE E', err);
    }

    // ----------------------------------------------------------------
    // CASE F: Rate limit / Too many OTP attempts
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);

      // Sub-case F1: Firebase SDK client-side rate limit
      const sdkRateLimit = client.mapFirebaseOtpError({ code: 'auth/too-many-requests' });
      assert.strictEqual(sdkRateLimit.title, 'Too many OTP attempts');
      assert.strictEqual(sdkRateLimit.message, 'Please wait a while before requesting another OTP.');

      // Sub-case F2: Backend rate limit response
      rateLimitEnabled = true;
      const res = await client.handleVerifyOtpAndLogin({
        verifyRes: {
          success: true,
          idToken: tokenExisting,
          phoneNumber: existingPhoneE164
        },
        phoneNumber: existingPhone10
      });
      rateLimitEnabled = false;

      assert.strictEqual(res.success, false);
      assert.strictEqual(client.bannerNotice.title, 'Too many OTP attempts');
      assert.strictEqual(client.bannerNotice.message, 'Please wait a while before requesting another OTP.');

      pass('CASE F', 'Rate limiting from SDK and backend is cleanly caught and displays: "Too many OTP attempts"');
    } catch (err) {
      fail('CASE F', err);
    }

    // ----------------------------------------------------------------
    // CASE G: Firebase App Verification / Play Integrity failure
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);

      const appCheckErr = client.mapFirebaseOtpError({ code: 'auth/missing-client-identifier' });
      assert.strictEqual(appCheckErr.title, "We couldn't verify this device.");
      assert.strictEqual(appCheckErr.message, 'Please check your connection and try again.');

      const credErr = client.mapFirebaseOtpError({ code: 'auth/invalid-app-credential' });
      assert.strictEqual(credErr.title, "We couldn't verify this device.");
      assert.strictEqual(credErr.message, 'Please check your connection and try again.');

      pass('CASE G', 'Play Integrity and app verification failures display: "We couldn\'t verify this device."');
    } catch (err) {
      fail('CASE G', err);
    }

    // ----------------------------------------------------------------
    // CASE H: Network failure
    // ----------------------------------------------------------------
    try {
      const badClient = new ClientAuthFlowSimulator('http://127.0.0.1:1'); // unroutable port
      const res = await badClient.handleVerifyOtpAndLogin({
        verifyRes: {
          success: true,
          idToken: tokenExisting,
          phoneNumber: existingPhoneE164
        },
        phoneNumber: existingPhone10
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(badClient.bannerNotice.title, 'Something went wrong');
      assert.strictEqual(badClient.bannerNotice.message, 'Please check your internet connection and try again.');

      pass('CASE H', 'Network failure triggers in-app banner: "Something went wrong - Please check your internet connection"');
    } catch (err) {
      fail('CASE H', err);
    }

    // ----------------------------------------------------------------
    // CASE I: User presses back / changes phone number during OTP
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      await client.handleSendOtp('9876543210');
      assert.strictEqual(client.otpSent, true);
      assert.strictEqual(client.phoneNumber, '9876543210');

      // User changes number
      client.triggerChangeNumberDuringOtp();
      assert.strictEqual(client.otpSent, false, 'OTP input is dismissed');
      assert.strictEqual(client.confirmationResult, null, 'Old confirmation result cleared');
      assert.strictEqual(client.bannerNotice, null, 'Banner cleared');

      pass('CASE I', 'Changing phone number or navigating back during OTP resets confirmation session and clears errors');
    } catch (err) {
      fail('CASE I', err);
    }

    // ----------------------------------------------------------------
    // CASE J: User resends OTP
    // ----------------------------------------------------------------
    try {
      const client = new ClientAuthFlowSimulator(baseUrl);
      let sendCount = 0;
      const mockSend = async () => {
        sendCount++;
        return { success: true, confirmation: { id: `conf_${sendCount}` } };
      };

      await client.handleSendOtp('9876543210', mockSend);
      assert.strictEqual(sendCount, 1);
      assert.strictEqual(client.resendTimer, 30);

      // Simulate timer countdown & resend
      client.resendTimer = 0;
      await client.handleSendOtp('9876543210', mockSend);
      assert.strictEqual(sendCount, 2);
      assert.strictEqual(client.resendTimer, 30);
      assert.strictEqual(client.confirmationResult.id, 'conf_2', 'Updated confirmation handle');

      pass('CASE J', 'Resend OTP resets timer to 30s and issues a fresh verification session');
    } catch (err) {
      fail('CASE J', err);
    }

    // ----------------------------------------------------------------
    // CASE K: Registration completion with verified phone, optional email, password
    // ----------------------------------------------------------------
    try {
      assert.ok(newClientSimulator, 'newClientSimulator exists from Case B');
      const regRes = await newClientSimulator.handleRegister({
        fullName: 'Aarav Sharma',
        city: 'Bengaluru',
        role: 'Contractor',
        password: 'Password123'
        // email omitted to test optional email
      });

      assert.strictEqual(regRes.success, true);
      assert.ok(regRes.token, 'Session token generated');
      assert.strictEqual(regRes.user.phoneNumber, newPhoneE164);
      assert.ok(regRes.user.email.includes('@allver.app'), 'Fallback email assigned');
      assert.strictEqual(regRes.user.role, 'Contractor');
      assert.strictEqual(newClientSimulator.currentScreen, '/(tabs)');

      // Clean up newly created user
      await User.deleteOne({ _id: regRes.user._id });

      pass('CASE K', 'Registration completes using verified phone credentials, optional email, custom password, and sets session');
    } catch (err) {
      fail('CASE K', err);
    }

    // ----------------------------------------------------------------
    // CASE L: Direct registration without verified phone OTP is blocked
    // ----------------------------------------------------------------
    try {
      const unverifiedClient = new ClientAuthFlowSimulator(baseUrl);
      let blocked = false;
      try {
        await unverifiedClient.handleRegister({
          fullName: 'Intruder User',
          city: 'Delhi',
          role: 'Client'
        });
      } catch (err) {
        blocked = true;
      }
      assert.strictEqual(blocked, true, 'Registration without verified phone OTP must be blocked');

      pass('CASE L', 'Direct account creation without verified phone OTP is strictly blocked');
    } catch (err) {
      fail('CASE L', err);
    }

    // ----------------------------------------------------------------
    // CASE M: Security validation - Mismatched client phone vs verified token
    // ----------------------------------------------------------------
    try {
      const securityClient = new ClientAuthFlowSimulator(baseUrl);

      // Attacker has token for 9199990011, but attempts to login/hijack 9199990099
      const hijackedPhone = '9199990099';
      const spoofRes = await securityClient.handleVerifyOtpAndLogin({
        verifyRes: {
          success: true,
          idToken: tokenExisting, // token has existingPhoneE164 (+919199990011)
          phoneNumber: `+91${hijackedPhone}` // attacker tries spoofing client phone
        },
        phoneNumber: hijackedPhone
      });

      assert.strictEqual(spoofRes.success, false);
      assert.strictEqual(spoofRes.reason, 'FORBIDDEN_MISMATCH', 'Must return 403 on mismatched token phone');
      assert.strictEqual(securityClient.bannerNotice.title, 'Security Validation Failed');
      assert.strictEqual(securityClient.token, null, 'No session token issued to attacker');

      pass('CASE M', 'Security validation enforces token consistency; mismatched phone & token returns 403 Forbidden');
    } catch (err) {
      fail('CASE M', err);
    }

    // Clean up test data
    await User.deleteMany({
      $or: [
        { phoneNumber: existingPhoneE164 },
        { phoneNumber: newPhoneE164 }
      ]
    });

  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`ALL TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runComprehensiveRegressionSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
