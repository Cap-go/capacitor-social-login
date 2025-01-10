# Migration Guide from @codetrix-studio/capacitor-google-auth to @capgo/capacitor-social-login

## Installation

1. Remove the old package:
```bash
npm uninstall @codetrix-studio/capacitor-google-auth
```

2. Install the new package:
```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## Important Changes in Google Auth Setup

### Web Client ID
The plugin now uses exclusively the Web Client ID for authentication. You'll need to:
1. Create a Web Client ID in Google Cloud Console if you don't have one ([How to get the credentials](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md))
2. Use this Web Client ID in the `webClientId` field for all platforms
3. For Android, you still need to create an Android Client ID with your SHA1, but this is only for verification - the token won't be used ([Android setup guide](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md#android))

## Code Changes

### Import Changes
```diff
- import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
+ import { SocialLogin } from '@capgo/capacitor-social-login';
```

### Initialization
```diff
- GoogleAuth.initialize({
-   clientId: 'CLIENT_ID.apps.googleusercontent.com',
-   scopes: ['profile', 'email'],
-   grantOfflineAccess: true,
- });

+ await SocialLogin.initialize({
+   google: {
+     webClientId: 'WEB_CLIENT_ID.apps.googleusercontent.com', // Use Web Client ID for all platforms
+     iOSClientId: 'IOS_CLIENT_ID', // for iOS
+     mode: 'offline' // replaces grantOfflineAccess
+   }
+ });
```

### Sign In
```diff
- const user = await GoogleAuth.signIn();
+ const res = await SocialLogin.login({
+   provider: 'google',
+   options: {
+     scopes: ['email', 'profile'],
+     forceRefreshToken: true // if you need refresh token
+   }
+ });
```

## Platform Specific Changes

### Android

1. Update your `MainActivity.java` ([Full Android setup guide](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md#android)):
```diff
+ import ee.forgr.capacitor.social.login.GoogleProvider;
+ import ee.forgr.capacitor.social.login.SocialLoginPlugin;
+ import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
+ import com.getcapacitor.PluginHandle;
+ import com.getcapacitor.Plugin;
+ import android.content.Intent;
+ import android.util.Log;

- public class MainActivity extends BridgeActivity {
+ public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

+   @Override
+   public void onActivityResult(int requestCode, int resultCode, Intent data) {
+     super.onActivityResult(requestCode, resultCode, data);
+     
+     if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
+       PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
+       if (pluginHandle == null) {
+         Log.i("Google Activity Result", "SocialLogin login handle is null");
+         return;
+       }
+       Plugin plugin = pluginHandle.getInstance();
+       if (!(plugin instanceof SocialLoginPlugin)) {
+         Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
+         return;
+       }
+       ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
+     }
+   }

+   public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
```

### iOS

1. No major changes needed in AppDelegate.swift ([iOS setup guide](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md#ios))

2. Update your configuration in `capacitor.config.json`:
```diff
{
  "plugins": {
-   "GoogleAuth": {
-     "scopes": ["profile", "email"],
-     "serverClientId": "xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
-     "forceCodeForRefreshToken": true
-   }
+   "SocialLogin": {
+     "google": {
+       "webClientId": "xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
+       "iOSClientId": "your-ios-client-id",
+       "mode": "offline"
+     }
+   }
  }
}
```

### Web

1. Remove the Google Sign-In meta tags from your `index.html` if you were using them:
```diff
- <meta name="google-signin-client_id" content="{your client id here}" />
- <meta name="google-signin-scope" content="profile email" />
```

## Response Type Changes

The response object structure has changed. Here's how to handle the new response:

```typescript
interface GoogleLoginResponse {
  provider: 'google';
  result: {
    accessToken: {
      token: string;
      expires: string;
      // ... other token fields
    } | null;
    idToken: string | null;
    profile: {
      email: string | null;
      familyName: string | null;
      givenName: string | null;
      id: string | null;
      name: string | null;
      imageUrl: string | null;
    };
  };
}
```

## Additional Features

The new plugin offers additional social login providers:
- [Apple Sign-In](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_apple.md)
- [Facebook Login](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_facebook.md)

Check the [main documentation](https://github.com/Cap-go/capacitor-social-login) for setting up these additional providers. 
