# Migration Guide from @capacitor-community/apple-sign-in to @capgo/capacitor-social-login

## Installation

1. Remove the old package:
```bash
npm uninstall @capacitor-community/apple-sign-in
```

2. Install the new package:
```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## Code Changes

### Import Changes
```diff
- import { SignInWithApple } from '@capacitor-community/apple-sign-in';
+ import { SocialLogin } from '@capgo/capacitor-social-login';
```

### Initialization
```diff
- // No initialization needed in old package
+ await SocialLogin.initialize({
+   apple: {} // Basic iOS configuration
+ });

+ // For Android, you need additional configuration:
+ await SocialLogin.initialize({
+   apple: {
+     clientId: 'YOUR_SERVICE_ID', // Service ID from Apple Developer Portal
+     redirectUrl: 'https://your-backend.com/callback' // Your backend callback URL. Please note that this URL behaves differently than in @capacitor-community/apple-sign-in. Please refer to the documentation for more details.
+   }
+ });
```

### Sign In
```diff
- const result = await SignInWithApple.authorize({
-   clientId: 'com.your.app',
-   redirectURI: 'https://your-app.com/callback',
-   scopes: 'email name',
-   state: '12345',
-   nonce: 'nonce'
- });

+ const result = await SocialLogin.login({
+   provider: 'apple',
+   options: {
+     // Optional: Add scopes if needed
+     scopes: ['email', 'name'],
+     nonce: 'nonce'
+   }
+ });
```

### Response Type Changes

The response object structure has changed. Here's how to handle the new response:

```typescript
// Old response type
interface AppleSignInResponse {
  response: {
    user: string;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
    identityToken: string | null;
    authorizationCode: string | null;
  };
}

// New response type
interface SocialLoginResponse {
  provider: 'apple';
  result: {
    accessToken: {
      token: string;
      expiresIn?: number;
      refreshToken?: string;
    } | null;
    idToken: string | null;
    profile: {
      user: string;
      email: string | null;
      givenName: string | null;
      familyName: string | null;
    };
  };
}
```

### Checking Login Status
```diff
- // Not available in old package
+ const status = await SocialLogin.isLoggedIn({
+   provider: 'apple'
+ });
```

### Logout
```diff
- // Not available in old package
+ await SocialLogin.logout({
+   provider: 'apple'
+ });
```

## Platform Specific Changes

### iOS Setup

1. The iOS setup remains largely the same. You still need to:
   - Enable "Sign In with Apple" capability in Xcode
   - Configure your app in the Apple Developer Portal
   - No additional code changes required for iOS

### Android Setup

The new plugin provides Android support out of the box, but requires additional setup:

1. Create a Services ID in the Apple Developer Portal
2. Configure a web authentication endpoint
3. Set up your Android app to handle the OAuth flow

For detailed Android setup instructions, please refer to the [Android Setup Guide](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_apple.md#apple-login-on-android).

## Additional Features

The new plugin offers several advantages:

1. Built-in Android support through web-based authentication
2. Unified API for multiple social login providers (Google, Facebook)
3. Persistent login state management
4. TypeScript support with better type definitions
5. Active maintenance and community support

## Breaking Changes

1. The initialization step is now required
2. Response object structure has changed
3. Android implementation requires a backend service
4. Token refresh handling is different
5. Error handling and error types have changed

For more detailed setup instructions, please refer to the [official documentation](../providers/apple/general.md). 