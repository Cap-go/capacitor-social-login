# Google Sign-In Setup

Full setup guide: https://capgo.app/docs/plugins/social-login/

## Android quick reference (Credential Manager)

This plugin uses **Google Credential Manager** on Android. You need OAuth clients in the **same** Google Cloud project:

1. **Web application** client → pass its ID as `webClientId` in `SocialLogin.initialize()`.
2. **Android** client(s) → register package name + SHA-1 for each signing key (debug, release, Play App Signing). Never use the Android client ID as `webClientId`.

### Logcat diagnostics

After `SocialLogin.initialize()` and on failed login, filter Logcat for `GoogleProvider` or `CapgoSocialLogin`. The plugin logs:

- `package` — must match your Android OAuth client
- `signingSha1` — must be registered on that Android OAuth client
- masked `webClientId` — must be the **Web** client ID

### `[28444] Developer console is not set up correctly`

See the **Android troubleshooting** section in [README.md](../README.md#android-troubleshooting-credential-manager-sha-1-and-firebase) for the full checklist. In short: wrong `webClientId` type, missing SHA-1 for the installed APK, package name mismatch, missing Play App Signing SHA-1, or OAuth consent screen test users.

Config changes in Google Cloud can take several hours to take effect.
