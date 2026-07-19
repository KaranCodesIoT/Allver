# Changelog

All notable changes to the Allver project will be documented in this file.

## [1.0-beta] - 2026-07-19

### Fixed
- **Splash Screen Freeze:** Resolved boot freezes by implementing a 3-second failsafe timer and non-blocking splash screen hide.
- **SecureStore Timeout:** Resolved Android system hangs by wrapping all SecureStore API reads/writes with a fallback race-timeout helper.
- **Login Blank Screen:** Fixed Xiaomi HyperOS/MIUI crashes by removing direct native imports and autolinking initialization of `react-native-callkeep`.
- **Add to Network Session:** Resolved timing race conditions on detail pages by adding asynchronous SecureStore fallbacks to resolve `currentUser._id`.
- **FCM Registration:** Isolated the Expo Push Token lookup in its own try-catch block so that failure does not block FCM token retrieval.
- **Notification Pipeline:** Added backend support in `Notification.js` to mirror and dispatch all standard notifications to FCM tokens directly via `firebase-admin` Messaging.

### Changed
- Decoupled and commented out CallKeep setup triggers from the post-login/foreground mounting flow.
- Added detailed payloads and response status console logging for push token registration.

### Planned
- Custom Android Fullscreen Intent calling architecture (Proof of Concept branch: FCM → Fullscreen Notification → Accept/Decline → Ringtone → Lock screen).
