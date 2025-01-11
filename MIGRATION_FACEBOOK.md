# Migration Guide from @capacitor-community/facebook-login to @capgo/capacitor-social-login

## Installation

1. Remove the old package:
```bash
npm uninstall @capacitor-community/facebook-login
```

2. Install the new package:
```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## Code Changes

### Import Changes
```diff
- import { FacebookLogin } from '@capacitor-community/facebook-login';
+ import { SocialLogin } from '@capgo/capacitor-social-login';
```

### Initialization
```diff
- // Old package required no explicit initialization in code
- // Configuration was done only in native platforms

+ // New package requires explicit initialization
+ await SocialLogin.initialize({
+   facebook: {
+     appId: 'YOUR_FACEBOOK_APP_ID',        // Required for web and Android
+     clientToken: 'YOUR_CLIENT_TOKEN'       // Required for Android
+   }
+ });
```

### Login
```diff
- const FACEBOOK_PERMISSIONS = ['email', 'public_profile'];
- const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS });

+ const result = await SocialLogin.login({
+   provider: 'facebook',
+   options: {
+     permissions: ['email', 'public_profile'],
+     limitedLogin: false,
+     nonce: 'optional_nonce'
+   }
+ });
```

### Response Type Changes

The response object structure has changed. Here's how to handle the new response:

```typescript
// Old response type
interface FacebookLoginResponse {
  accessToken: {
    applicationId: string;
    userId: string;
    token: string;
    expires: string;
  };
  recentlyGrantedPermissions: string[];
  recentlyDeniedPermissions: string[];
}

// New response type
interface FacebookLoginResponse {
  provider: 'facebook';
  result: {
    accessToken: {
      token: string;
      applicationId?: string;
      expires?: string;
      userId?: string;
      permissions?: string[];
      declinedPermissions?: string[];
    } | null;
    idToken: string | null;
    profile: {
      userID: string;
      email: string | null;
      friendIDs: string[];
      birthday: string | null;
      ageRange: { min?: number; max?: number } | null;
      gender: string | null;
      location: { id: string; name: string } | null;
      hometown: { id: string; name: string } | null;
      profileURL: string | null;
      name: string | null;
      imageURL: string | null;
    };
  };
}
```

### Checking Login Status
```diff
- const result = await FacebookLogin.getCurrentAccessToken();
- const isLoggedIn = result && result.accessToken;

+ const status = await SocialLogin.isLoggedIn({
+   provider: 'facebook'
+ });
+ const isLoggedIn = status.isLoggedIn;
```

### Logout
```diff
- await FacebookLogin.logout();

+ await SocialLogin.logout({
+   provider: 'facebook'
+ });
```

## Platform Specific Changes

### Android Setup

1. The Android setup remains similar, but configuration is now done through the plugin's initialize method:

```diff
- // AndroidManifest.xml changes remain the same
- // strings.xml become irrelevant
+ // Additionally initialize in your code:
+ await SocialLogin.initialize({
+   facebook: {
+     appId: 'your-app-id',
+     clientToken: 'your-client-token'  // New requirement
+   }
+ });
```

### iOS Setup

1. The iOS setup in `AppDelegate.swift` remains the same:

```swift
import FBSDKCoreKit

// In application:didFinishLaunchingWithOptions:
FBSDKCoreKit.ApplicationDelegate.shared.application(
    application,
    didFinishLaunchingWithOptions: launchOptions
)

// In application:openURL:options:
ApplicationDelegate.shared.application(
    app,
    open: url,
    sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String,
    annotation: options[UIApplication.OpenURLOptionsKey.annotation]
)
```

2. The `Info.plist` configuration remains the same:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>fb[APP_ID]</string>
        </array>
    </dict>
</array>
<key>FacebookAppID</key>
<string>[APP_ID]</string>
<key>FacebookClientToken</key>
<string>[CLIENT_TOKEN]</string>
<key>FacebookDisplayName</key>
<string>[APP_NAME]</string>
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>fbapi</string>
    <string>fbauth</string>
    <string>fb-messenger-share-api</string>
    <string>fbauth2</string>
    <string>fbshareextension</string>
</array>
```

## Breaking Changes

1. Explicit initialization is now required
2. Response object structure has changed significantly
3. Client token is now required for Android
4. Different method names and parameter structures
5. Error handling and error types have changed

For more detailed setup instructions, please refer to the [official documentation](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_facebook.md). 