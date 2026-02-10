# @capgo/capacitor-social-login
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_social_login"> ➡️ Get Instant updates for your App with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_social_login"> Missing a feature? We’ll build the plugin for you 💪</a></h2>
</div>

## Fork Information
This plugin is a fork of [@codetrix-studio/capacitor-google-auth](https://github.com/CodetrixStudio/CapacitorGoogleAuth). We created this fork because the original plugin is "virtually" archived with no way to reach the maintainer in any medium, and only one person (@reslear) has write rights but doesn't handle native code.

If you're currently using `@codetrix-studio/capacitor-google-auth`, we recommend migrating to this plugin. You can follow our [migration guide here](https://github.com/Cap-go/capacitor-social-login/blob/main/MIGRATION_CODETRIX.md).

## About
All social logins in one plugin

This plugin implements social auth for:
- Google (with credential manager)
- Apple (with OAuth on android)
- Facebook (with latest SDK)
- Twitter/X (OAuth 2.0)
- Generic OAuth2 (supports multiple providers: GitHub, Azure AD, Auth0, Okta, and any OAuth2-compliant server)

This plugin is the all-in-one solution for social authentication on Web, iOS, and Android.
It is our official alternative to the Appflow Social Login plugin.

## Ionic Auth Connect compatibility

This plugin is designed to be compatible with Ionic Auth Connect provider names using the built-in OAuth2 engine.
Use the Auth Connect preset wrapper (`SocialLoginAuthConnect`) to log in with `auth0`, `azure`, `cognito`, `okta`, and `onelogin`.

- Compatibility guide: https://github.com/Cap-go/capacitor-social-login/blob/main/docs/auth_connect_compatibility.md
- Migration guide: https://github.com/Cap-go/capacitor-social-login/blob/main/MIGRATION_AUTH_CONNECT.md

## Documentation

Best experience to read the doc here:

https://capgo.app/docs/plugins/social-login/getting-started/

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | ❌          |
| v5.\*.\*       | v5.\*.\*                | ❌          |

> **Note:** The major version of this plugin follows the major version of Capacitor. Use the version that matches your Capacitor installation (e.g., plugin v8 for Capacitor 8). Only the latest major version is actively maintained.

## Install

```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## Dynamic Provider Dependencies

You can configure which providers to include to reduce app size. This is especially useful if you only need specific providers.

### Configuration

Add provider configuration to your `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'MyApp',
  webDir: 'dist',
  plugins: {
    SocialLogin: {
      providers: {
        google: true,      // true = enabled (bundled), false = disabled (not bundled)
        facebook: true,   // Use false to reduce app size
        apple: true,      // Apple uses system APIs, no external deps
        twitter: false   // false = disabled (not bundled)
      },
      logLevel: 1 // Warnings and errors only
    }
  }
};

export default config;
```

### Provider Configuration

- **`true`** (default): Provider is enabled - dependencies are bundled in final APK/IPA
- **`false`**: Provider is disabled - dependencies are not bundled in final APK/IPA

### Notes

- Changes require running `npx cap sync` to take effect
- If configuration is not provided, all providers default to `true` (enabled, backward compatible)
- **Important**: Disabling a provider (`false`) will make it unavailable at runtime, regardless of whether it actually adds any dependencies. The provider will be disabled even if it uses only system APIs.
- This configuration only affects iOS and Android platforms; it does not affect the web platform.
- **Important**: Using `false` means the dependency won't be bundled, but the plugin code still compiles against it. Ensure the consuming app includes the dependency if needed.
- Apple Sign-In on Android uses OAuth flow without external SDK dependencies
- Twitter uses standard OAuth 2.0 flow without external SDK dependencies

### Example: Reduce App Size

To only include Google Sign-In and disable others:

```typescript
plugins: {
  SocialLogin: {
    providers: {
      google: true,      // Enabled
      facebook: false,   // Disabled (not bundled)
      apple: true,       // Enabled
      twitter: false     // Disabled (not bundled)
    }
  }
}
```

## Apple

[How to get the credentials](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_apple.md)
[How to setup redirect url](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/apple_redirect_url.png)

### Android configuration

For android you need a server to get the callback from the apple login. As we use the web SDK .

Call the `initialize` method with the `apple` provider

```typescript
await SocialLogin.initialize({
  apple: {
    clientId: 'your-client-id',
    redirectUrl: 'your-redirect-url',
  },
});
const res = await SocialLogin.login({
  provider: 'apple',
  options: {
    scopes: ['email', 'name'],
  },
});
```

### iOS configuration

call the `initialize` method with the `apple` provider

```typescript
await SocialLogin.initialize({
  apple: {
    clientId: 'your-client-id', // it not used at os level only in plugin to know which provider initialize
  },
});
const res = await SocialLogin.login({
  provider: 'apple',
  options: {
    scopes: ['email', 'name'],
  },
});
```

## Facebook

Docs: [How to setup facebook login](https://capgo.app/docs/plugins/social-login/facebook/)

📘 **[Complete Facebook Business Login Guide](./docs/facebook_business_login.md)** - Learn how to access Instagram, Pages, and business features

### Facebook Business Login

This plugin fully supports Facebook Business Login for accessing business-related features and permissions. Business accounts can request additional permissions beyond standard consumer login, including Instagram and Pages management.

**Supported Business Permissions:**
- `instagram_basic` - Access to Instagram Basic Display API
- `instagram_manage_insights` - Access to Instagram Insights
- `pages_show_list` - List of Pages the person manages
- `pages_read_engagement` - Read engagement data from Pages
- `pages_manage_posts` - Manage posts on Pages
- `business_management` - Manage business assets
- And many more - see [Facebook Permissions Reference](https://developers.facebook.com/docs/permissions/reference)

**Configuration Requirements:**
1. Your Facebook app must be configured as a Business app in the Facebook Developer Console
2. Business permissions may require Facebook's App Review before production use
3. Your app must comply with Facebook's Business Use Case policies

**Example - Instagram Basic Access:**
```typescript
await SocialLogin.initialize({
  facebook: {
    appId: 'your-business-app-id',
    clientToken: 'your-client-token',
  },
});

const res = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: [
      'email', 
      'public_profile',
      'instagram_basic',           // Instagram account info
      'pages_show_list',           // List of managed Pages
      'pages_read_engagement'      // Page engagement data
    ],
  },
});

// Access Instagram data through Facebook Graph API
const profile = await SocialLogin.providerSpecificCall({
  call: 'facebook#getProfile',
  options: {
    fields: ['id', 'name', 'email', 'instagram_business_account'],
  },
});
```

**Example - Pages Management:**
```typescript
const res = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: [
      'email',
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement',
    ],
  },
});

// Fetch user's managed pages with Instagram accounts
const profile = await SocialLogin.providerSpecificCall({
  call: 'facebook#getProfile',
  options: {
    fields: ['id', 'name', 'accounts{id,name,instagram_business_account}'],
  },
});
```

**Important Notes:**
- Testing: You can test business permissions with test users and development apps without App Review
- Production: Most business permissions require Facebook App Review before going live
- Rate Limits: Business APIs have different rate limits - review Facebook's documentation
- Setup: Follow [Facebook Business Integration Guide](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/business-integrations)

### Android configuration

More information can be found here: https://developers.facebook.com/docs/android/getting-started

Then call the `initialize` method with the `facebook` provider

```typescript
await SocialLogin.initialize({
  facebook: {
    appId: 'your-app-id',
    clientToken: 'your-client-token',
  },
});
const res = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: ['email', 'public_profile'],
  },
});
```

### iOS configuration

In file `ios/App/App/AppDelegate.swift` add or replace the following:

```swift
import UIKit
import Capacitor
import FBSDKCoreKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        FBSDKCoreKit.ApplicationDelegate.shared.application(
            application,
            didFinishLaunchingWithOptions: launchOptions
        )

        return true
    }

    ...

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        if (FBSDKCoreKit.ApplicationDelegate.shared.application(
            app,
            open: url,
            sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String,
            annotation: options[UIApplication.OpenURLOptionsKey.annotation]
        )) {
            return true;
        } else {
            return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        }
    }
}

```

Add the following in the `ios/App/App/info.plist` file inside of the outermost `<dict>`:

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

More information can be found here: https://developers.facebook.com/docs/facebook-login/ios


Then call the `initialize` method with the `facebook` provider

```typescript
await SocialLogin.initialize({
  facebook: {
    appId: 'your-app-id',
  },
});
const res = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: ['email', 'public_profile'],
  },
});
```

## Google

[How to get the credentials](https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md)

### Complete Configuration Example

For Google login to work properly across all platforms, you need different client IDs and must understand the requirements for each mode:

```typescript
await SocialLogin.initialize({
  google: {
    webClientId: 'YOUR_WEB_CLIENT_ID',        // Required for Android and Web
    iOSClientId: 'YOUR_IOS_CLIENT_ID',        // Required for iOS  
    iOSServerClientId: 'YOUR_WEB_CLIENT_ID',  // Required for iOS offline mode and server authorization (same as webClientId)
    mode: 'online',  // 'online' or 'offline'
  }
});
```

**Important Notes:**
- `webClientId`: Required for Android and Web platforms
- `iOSClientId`: Required for iOS platform  
- `iOSServerClientId`: Required when using `mode: 'offline'` on iOS or when you need to verify the token on the server (should be the same value as `webClientId`)
- `mode: 'offline'`: Returns only `serverAuthCode` for backend authentication, no user profile data
- `mode: 'online'`: Returns user profile data and access tokens (default)

### Android configuration

The implementation use the new library of Google who use Google account at Os level, make sure your device does have at least one google account connected

Call the `initialize` method with the `google` provider:

```typescript
await SocialLogin.initialize({
  google: {
    webClientId: 'your-web-client-id', // Required: the web client id for Android and Web
  },
});
const res = await SocialLogin.login({
  provider: 'google',
  options: {
    scopes: ['email', 'profile'],
  },
});
```

### iOS configuration

Call the `initialize` method with the `google` provider:

```typescript
await SocialLogin.initialize({
  google: {
    iOSClientId: 'your-ios-client-id',           // Required: the iOS client id
    iOSServerClientId: 'your-web-client-id',     // Required for offline mode: same as webClientId
    mode: 'online',  // 'online' for user data, 'offline' for server auth code only
  },
});
const res = await SocialLogin.login({
  provider: 'google',
  options: {
    scopes: ['email', 'profile'],
  },
});
```

**Offline Mode Behavior:**
When using `mode: 'offline'`, the login response will only contain:
```typescript
{
  provider: 'google',
  result: {
    serverAuthCode: 'auth_code_for_backend',
    responseType: 'offline'
  }
  // Note: No user profile data is returned in offline mode
}
```

### Web

Initialize method to create a script tag with Google lib. We cannot know when it's ready so be sure to do it early in web otherwise it will fail.

## OAuth2 (Generic)

The plugin supports generic OAuth2 authentication, allowing you to integrate with any OAuth2-compliant provider (GitHub, Azure AD, Auth0, Okta, custom servers, etc.). You can configure multiple OAuth2 providers simultaneously.

### Multi-Provider Configuration

```typescript
await SocialLogin.initialize({
  oauth2: {
    // GitHub OAuth2
    github: {
      appId: 'your-github-client-id',
      authorizationBaseUrl: 'https://github.com/login/oauth/authorize',
      accessTokenEndpoint: 'https://github.com/login/oauth/access_token',
      redirectUrl: 'myapp://oauth/github',
      scope: 'read:user user:email',
      pkceEnabled: true,
    },
    // Azure AD OAuth2
    azure: {
      appId: 'your-azure-client-id',
      authorizationBaseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      accessTokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      redirectUrl: 'myapp://oauth/azure',
      scope: 'openid profile email',
      pkceEnabled: true,
      resourceUrl: 'https://graph.microsoft.com/v1.0/me',
    },
    // Auth0 OAuth2
    auth0: {
      appId: 'your-auth0-client-id',
      authorizationBaseUrl: 'https://your-tenant.auth0.com/authorize',
      accessTokenEndpoint: 'https://your-tenant.auth0.com/oauth/token',
      redirectUrl: 'myapp://oauth/auth0',
      scope: 'openid profile email offline_access',
      pkceEnabled: true,
      additionalParameters: {
        audience: 'https://your-api.example.com',
      },
    },
  },
});
```

## Auth Connect Presets (Auth0, Azure AD, Cognito, Okta, OneLogin)

If you want the same provider names as Ionic Auth Connect, use the preset wrapper. It maps those providers to the existing OAuth2 engine.

```typescript
import { SocialLoginAuthConnect } from '@capgo/capacitor-social-login';

await SocialLoginAuthConnect.initialize({
  authConnect: {
    auth0: {
      domain: 'https://your-tenant.auth0.com',
      clientId: 'your-auth0-client-id',
      redirectUrl: 'myapp://oauth/auth0',
      audience: 'https://your-api.example.com',
    },
    azure: {
      tenantId: 'common',
      clientId: 'your-azure-client-id',
      redirectUrl: 'myapp://oauth/azure',
    },
    okta: {
      issuer: 'https://dev-12345.okta.com/oauth2/default',
      clientId: 'your-okta-client-id',
      redirectUrl: 'myapp://oauth/okta',
    },
  },
});

const auth0Result = await SocialLoginAuthConnect.login({
  provider: 'auth0',
});
```

Notes:
- Presets can be overridden: any `oauth2` entry with the same provider key (for example, `oauth2: { auth0: ... }`) overrides the preset for that provider.
- If your provider uses non-standard endpoints, override `authorizationBaseUrl`, `accessTokenEndpoint`, `resourceUrl`, or `logoutUrl` in the preset.

### Login with a Specific Provider

```typescript
// Login with GitHub
const githubResult = await SocialLogin.login({
  provider: 'oauth2',
  options: {
    providerId: 'github',  // Required: must match key from initialize()
  },
});

// Login with Azure AD
const azureResult = await SocialLogin.login({
  provider: 'oauth2',
  options: {
    providerId: 'azure',
    scope: 'openid profile email',  // Optional: override default scopes
  },
});

console.log('Access Token:', azureResult.result.accessToken?.token);
console.log('ID Token:', azureResult.result.idToken);
console.log('User Data:', azureResult.result.resourceData);
```

### Check Login Status

```typescript
const status = await SocialLogin.isLoggedIn({
  provider: 'oauth2',
  providerId: 'github',  // Required for OAuth2
});
console.log('Is logged in:', status.isLoggedIn);
```

### Logout

```typescript
await SocialLogin.logout({
  provider: 'oauth2',
  providerId: 'github',  // Required for OAuth2
});
```

### Refresh Token

```typescript
await SocialLogin.refresh({
  provider: 'oauth2',
  options: {
    providerId: 'github',  // Required for OAuth2
  },
});
```

### OAuth2 Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `appId` | string | Yes | OAuth2 Client ID |
| `authorizationBaseUrl` | string | Yes | Authorization endpoint URL |
| `accessTokenEndpoint` | string | No* | Token endpoint URL (*Required for code flow) |
| `redirectUrl` | string | Yes | Callback URL for OAuth redirect |
| `responseType` | 'code' \| 'token' | No | OAuth flow type (default: 'code') |
| `pkceEnabled` | boolean | No | Enable PKCE (default: true) |
| `scope` | string | No | Default scopes to request |
| `resourceUrl` | string | No | URL to fetch user profile after auth |
| `additionalParameters` | Record<string, string> | No | Extra params for authorization URL |
| `additionalResourceHeaders` | Record<string, string> | No | Extra headers for resource request |
| `logoutUrl` | string | No | URL to open on logout |
| `logsEnabled` | boolean | No | Enable debug logging (default: false) |

### Platform-Specific Notes

**iOS**: Uses `ASWebAuthenticationSession` for secure authentication.

**Android**: Uses a WebView-based authentication flow.

**Web**: Opens a popup window for OAuth flow.

### Security Recommendations

1. **Always use PKCE** (`pkceEnabled: true`) for public clients
2. **Use authorization code flow** (`responseType: 'code'`) instead of implicit flow
3. **Store tokens securely** using [@capgo/capacitor-persistent-account](https://github.com/Cap-go/capacitor-persistent-account)
4. **Use HTTPS** for all endpoints and redirect URLs in production

## Troubleshooting


### Invalid Privacy Manifest (ITMS-91056)
If you get this error on App Store Connect:

> ITMS-91056: Invalid privacy manifest - The PrivacyInfo.xcprivacy file from the following path is invalid: ...

**How to fix:**
- Make sure your app's `PrivacyInfo.xcprivacy` is valid JSON, with only Apple-documented keys/values.
- Do not include a privacy manifest in the plugin, only in your app.

### Google Play Console AD_ID Permission Error

**Problem**: After submitting your app to Google Play, you receive this error:
```
Google Api Error: Invalid request - This release includes the com.google.android.gms.permission.AD_ID permission
but your declaration on Play Console says your app doesn't use advertising ID.
```

**Root Cause**: The Facebook SDK includes `AD_ID` and other advertising-related permissions.

**Solution**: If you're not using Facebook login, set `facebook: false` in your `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,  // Completely excludes Facebook SDK and its permissions
        apple: true,
      },
    },
  },
};
```

Then run `npx cap sync`. The plugin uses stub classes instead of the real Facebook SDK, so no Facebook dependencies or permissions are included in your build.

### Google Sign-In with Family Link Supervised Accounts

**Problem**: When users try to sign in with Google accounts supervised by Family Link, login fails with:
```
NoCredentialException: No credentials available
```

**Root Cause**: Family Link supervised accounts have different authentication requirements and may not work properly with certain Google Sign-In configurations.

**Solution**: 
When implementing Google Sign-In for apps that need to support Family Link accounts, use the following configuration:

```typescript
import { SocialLogin } from '@capacitor/social-login';

// For Family Link accounts, disable filtering by authorized accounts
await SocialLogin.login({
  provider: 'google',
  options: {
    style: 'bottom', // or 'standard'
    filterByAuthorizedAccounts: false, // Important for Family Link (default is true)
    scopes: ['profile', 'email']
  }
});
```

**Key Points**:
- Set `filterByAuthorizedAccounts` to `false` to ensure Family Link accounts are visible (default is `true`)
- The plugin will automatically retry with 'standard' style if 'bottom' style fails with NoCredentialException
- These options only affect Android; iOS handles Family Link accounts normally
- The error message will suggest disabling `filterByAuthorizedAccounts` if login fails

**Note**: Other apps like Listonic work with Family Link accounts because they use similar configurations. The default settings may be too restrictive for supervised accounts.

## Where to store access tokens?

You can use the [@capgo/capacitor-persistent-account](https://github.com/Cap-go/capacitor-persistent-account) plugin for this.

This plugin stores data in secure locations for native devices.

For Android, it will store data in Android's Account Manager, which provides system-level account management.
For iOS, it will store data in the Keychain, which is Apple's secure credential storage.

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`login(...)`](#login)
* [`logout(...)`](#logout)
* [`isLoggedIn(...)`](#isloggedin)
* [`getAuthorizationCode(...)`](#getauthorizationcode)
* [`refresh(...)`](#refresh)
* [`refreshToken(...)`](#refreshtoken)
* [`handleRedirectCallback()`](#handleredirectcallback)
* [`decodeIdToken(...)`](#decodeidtoken)
* [`getAccessTokenExpirationDate(...)`](#getaccesstokenexpirationdate)
* [`isAccessTokenAvailable(...)`](#isaccesstokenavailable)
* [`isAccessTokenExpired(...)`](#isaccesstokenexpired)
* [`isRefreshTokenAvailable(...)`](#isrefreshtokenavailable)
* [`providerSpecificCall(...)`](#providerspecificcall)
* [`getPluginVersion()`](#getpluginversion)
* [`openSecureWindow(...)`](#opensecurewindow)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### initialize(...)

```typescript
initialize(options: InitializeOptions) => Promise<void>
```

Initialize the plugin

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#initializeoptions">InitializeOptions</a></code> |

--------------------


### login(...)

```typescript
login<T extends "apple" | "google" | "facebook" | "twitter" | "oauth2">(options: Extract<LoginOptions, { provider: T; }>) => Promise<{ provider: T; result: ProviderResponseMap[T]; }>
```

Login with the selected provider

| Param         | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`** | <code><a href="#extract">Extract</a>&lt;{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'twitter'; options: <a href="#twitterloginoptions">TwitterLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'oauth2'; options: <a href="#oauth2loginoptions">OAuth2LoginOptions</a>; }, { provider: T; }&gt;</code> |

**Returns:** <code>Promise&lt;{ provider: T; result: ProviderResponseMap[T]; }&gt;</code>

--------------------


### logout(...)

```typescript
logout(options: { provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2'; providerId?: string; }) => Promise<void>
```

Logout

| Param         | Type                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| **`options`** | <code>{ provider: 'apple' \| 'google' \| 'facebook' \| 'twitter' \| 'oauth2'; providerId?: string; }</code> |

--------------------


### isLoggedIn(...)

```typescript
isLoggedIn(options: isLoggedInOptions) => Promise<{ isLoggedIn: boolean; }>
```

IsLoggedIn

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#isloggedinoptions">isLoggedInOptions</a></code> |

**Returns:** <code>Promise&lt;{ isLoggedIn: boolean; }&gt;</code>

--------------------


### getAuthorizationCode(...)

```typescript
getAuthorizationCode(options: AuthorizationCodeOptions) => Promise<AuthorizationCode>
```

Get the current authorization code

| Param         | Type                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| **`options`** | <code><a href="#authorizationcodeoptions">AuthorizationCodeOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#authorizationcode">AuthorizationCode</a>&gt;</code>

--------------------


### refresh(...)

```typescript
refresh(options: LoginOptions) => Promise<void>
```

Refresh the access token

| Param         | Type                                                  |
| ------------- | ----------------------------------------------------- |
| **`options`** | <code><a href="#loginoptions">LoginOptions</a></code> |

--------------------


### refreshToken(...)

```typescript
refreshToken(options: { provider: 'oauth2'; providerId: string; refreshToken?: string; additionalParameters?: Record<string, string>; }) => Promise<OAuth2LoginResponse>
```

OAuth2 refresh-token helper (feature parity with Capawesome OAuth).

Scope:
- Only applies to the built-in `oauth2` provider (not Google/Apple/Facebook/Twitter).
- Requires a token endpoint (either `accessTokenEndpoint`/`tokenEndpoint` or `issuerUrl` discovery).

Security note:
- This does not validate JWT signatures. It only exchanges/refreshes tokens.

If `refreshToken` is omitted, the plugin will attempt to use the stored refresh token (if available).

| Param         | Type                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`** | <code>{ provider: 'oauth2'; providerId: string; refreshToken?: string; additionalParameters?: <a href="#record">Record</a>&lt;string, string&gt;; }</code> |

**Returns:** <code>Promise&lt;<a href="#oauth2loginresponse">OAuth2LoginResponse</a>&gt;</code>

--------------------


### handleRedirectCallback()

```typescript
handleRedirectCallback() => Promise<LoginResult | null>
```

Web-only: handle the OAuth redirect callback and return the parsed result.

Notes:
- This is only meaningful on Web. iOS/Android implementations will reject.
- Intended for redirect-based flows (e.g. `oauth2` with `flow: 'redirect'`) where the page navigates away.

**Returns:** <code>Promise&lt;<a href="#loginresult">LoginResult</a> | null&gt;</code>

--------------------


### decodeIdToken(...)

```typescript
decodeIdToken(options: { idToken: string; }) => Promise<{ claims: Record<string, any>; }>
```

Decode a JWT (typically an OIDC ID token) into its claims.

Security note:
- This does not validate the signature or issuer/audience. It only base64url-decodes the payload.

| Param         | Type                              |
| ------------- | --------------------------------- |
| **`options`** | <code>{ idToken: string; }</code> |

**Returns:** <code>Promise&lt;{ claims: <a href="#record">Record</a>&lt;string, any&gt;; }&gt;</code>

--------------------


### getAccessTokenExpirationDate(...)

```typescript
getAccessTokenExpirationDate(options: { accessTokenExpirationDate: number; }) => Promise<{ date: string; }>
```

Convert an access token expiration timestamp (milliseconds since epoch) to an ISO date string.

This is a pure helper (feature parity with Capawesome OAuth) and does not depend on provider state.

| Param         | Type                                                |
| ------------- | --------------------------------------------------- |
| **`options`** | <code>{ accessTokenExpirationDate: number; }</code> |

**Returns:** <code>Promise&lt;{ date: string; }&gt;</code>

--------------------


### isAccessTokenAvailable(...)

```typescript
isAccessTokenAvailable(options: { accessToken: string | null; }) => Promise<{ isAvailable: boolean; }>
```

Check if an access token is available (non-empty).

This is a pure helper (feature parity with Capawesome OAuth) and does not depend on provider state.

| Param         | Type                                          |
| ------------- | --------------------------------------------- |
| **`options`** | <code>{ accessToken: string \| null; }</code> |

**Returns:** <code>Promise&lt;{ isAvailable: boolean; }&gt;</code>

--------------------


### isAccessTokenExpired(...)

```typescript
isAccessTokenExpired(options: { accessTokenExpirationDate: number; }) => Promise<{ isExpired: boolean; }>
```

Check if an access token is expired.

This is a pure helper (feature parity with Capawesome OAuth) and does not depend on provider state.

| Param         | Type                                                |
| ------------- | --------------------------------------------------- |
| **`options`** | <code>{ accessTokenExpirationDate: number; }</code> |

**Returns:** <code>Promise&lt;{ isExpired: boolean; }&gt;</code>

--------------------


### isRefreshTokenAvailable(...)

```typescript
isRefreshTokenAvailable(options: { refreshToken: string | null; }) => Promise<{ isAvailable: boolean; }>
```

Check if a refresh token is available (non-empty).

This is a pure helper (feature parity with Capawesome OAuth) and does not depend on provider state.

| Param         | Type                                           |
| ------------- | ---------------------------------------------- |
| **`options`** | <code>{ refreshToken: string \| null; }</code> |

**Returns:** <code>Promise&lt;{ isAvailable: boolean; }&gt;</code>

--------------------


### providerSpecificCall(...)

```typescript
providerSpecificCall<T extends ProviderSpecificCall>(options: { call: T; options: ProviderSpecificCallOptionsMap[T]; }) => Promise<ProviderSpecificCallResponseMap[T]>
```

Execute provider-specific calls

| Param         | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **`options`** | <code>{ call: T; options: ProviderSpecificCallOptionsMap[T]; }</code> |

**Returns:** <code>Promise&lt;ProviderSpecificCallResponseMap[T]&gt;</code>

--------------------


### getPluginVersion()

```typescript
getPluginVersion() => Promise<{ version: string; }>
```

Get the native Capacitor plugin version

**Returns:** <code>Promise&lt;{ version: string; }&gt;</code>

--------------------


### openSecureWindow(...)

```typescript
openSecureWindow(options: OpenSecureWindowOptions) => Promise<OpenSecureWindowResponse>
```

Opens a secured window for OAuth2 authentication.
For web, you should have the code in the redirected page to use a broadcast channel to send the redirected url to the app
Something like:
```html
&lt;html&gt;
&lt;head&gt;&lt;/head&gt;
&lt;body&gt;
&lt;script&gt;
  const searchParams = new URLSearchParams(location.search)
  if (searchParams.has("code")) {
    new BroadcastChannel("my-channel-name").postMessage(location.href);
    window.close();
  }
&lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;
```
For mobile, you should have a redirect uri that opens the app, something like: `myapp://oauth_callback/`
And make sure to register it in the app's info.plist:
```xml
&lt;key&gt;CFBundleURLTypes&lt;/key&gt;
&lt;array&gt;
   &lt;dict&gt;
      &lt;key&gt;CFBundleURLSchemes&lt;/key&gt;
      &lt;array&gt;
         &lt;string&gt;myapp&lt;/string&gt;
      &lt;/array&gt;
   &lt;/dict&gt;
&lt;/array&gt;
```
And in the AndroidManifest.xml file:
```xml
&lt;activity&gt;
   &lt;intent-filter&gt;
      &lt;action android:name="android.intent.action.VIEW" /&gt;
      &lt;category android:name="android.intent.category.DEFAULT" /&gt;
      &lt;category android:name="android.intent.category.BROWSABLE" /&gt;
      &lt;data android:host="oauth_callback" android:scheme="myapp" /&gt;
   &lt;/intent-filter&gt;
&lt;/activity&gt;
```

| Param         | Type                                                                        | Description                                 |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| **`options`** | <code><a href="#opensecurewindowoptions">OpenSecureWindowOptions</a></code> | - the options for the openSecureWindow call |

**Returns:** <code>Promise&lt;<a href="#opensecurewindowresponse">OpenSecureWindowResponse</a>&gt;</code>

--------------------


### Interfaces


#### InitializeOptions

| Prop           | Type                                                                                                                                                                | Description                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **`oauth2`**   | <code><a href="#record">Record</a>&lt;string, <a href="#oauth2providerconfig">OAuth2ProviderConfig</a>&gt;</code>                                                   | OAuth2 provider configurations. Supports multiple providers by using a <a href="#record">Record</a> with provider IDs as keys. |
| **`twitter`**  | <code>{ clientId: string; redirectUrl: string; defaultScopes?: string[]; forceLogin?: boolean; audience?: string; }</code>                                          |                                                                                                                                |
| **`facebook`** | <code>{ appId: string; clientToken?: string; locale?: string; }</code>                                                                                              |                                                                                                                                |
| **`google`**   | <code>{ iOSClientId?: string; iOSServerClientId?: string; webClientId?: string; mode?: 'online' \| 'offline'; hostedDomain?: string; redirectUrl?: string; }</code> |                                                                                                                                |
| **`apple`**    | <code>{ clientId?: string; redirectUrl?: string; useProperTokenExchange?: boolean; useBroadcastChannel?: boolean; }</code>                                          |                                                                                                                                |


#### OAuth2ProviderConfig

Configuration for a single OAuth2 provider instance

| Prop                                       | Type                                                            | Description                                                                                                                                                                                                                                                                                                                                              | Default             |
| ------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **`appId`**                                | <code>string</code>                                             | The OAuth 2.0 client identifier (App ID / Client ID). Note: this configuration object is only used by the plugin's built-in `oauth2` provider (i.e. `SocialLogin.initialize({ oauth2: { ... } })`). It does not affect Google/Apple/Facebook/Twitter.                                                                                                    |                     |
| **`clientId`**                             | <code>string</code>                                             | Alias for `appId` to match common OAuth/OIDC naming (`clientId`). If both are provided, `appId` takes precedence.                                                                                                                                                                                                                                        |                     |
| **`issuerUrl`**                            | <code>string</code>                                             | OpenID Connect issuer URL (enables discovery via `/.well-known/openid-configuration`). When set, you may omit explicit endpoints like `authorizationBaseUrl` and `accessTokenEndpoint`. Notes: - Explicit endpoints (authorization/token/logout) take precedence over discovered values. - Discovery is supported for `oauth2` on Web, iOS, and Android. |                     |
| **`authorizationBaseUrl`**                 | <code>string</code>                                             | The base URL of the authorization endpoint                                                                                                                                                                                                                                                                                                               |                     |
| **`authorizationEndpoint`**                | <code>string</code>                                             | Alias for `authorizationBaseUrl` (to match common OAuth/OIDC naming).                                                                                                                                                                                                                                                                                    |                     |
| **`accessTokenEndpoint`**                  | <code>string</code>                                             | The URL to exchange the authorization code for tokens Required for authorization code flow                                                                                                                                                                                                                                                               |                     |
| **`tokenEndpoint`**                        | <code>string</code>                                             | Alias for `accessTokenEndpoint` (to match common OAuth/OIDC naming).                                                                                                                                                                                                                                                                                     |                     |
| **`redirectUrl`**                          | <code>string</code>                                             | Redirect URL that receives the OAuth callback                                                                                                                                                                                                                                                                                                            |                     |
| **`resourceUrl`**                          | <code>string</code>                                             | Optional URL to fetch user profile/resource data after authentication The access token will be sent as Bearer token in the Authorization header                                                                                                                                                                                                          |                     |
| **`responseType`**                         | <code>'code' \| 'token'</code>                                  | The OAuth response type - 'code': Authorization Code flow (recommended, requires accessTokenEndpoint) - 'token': Implicit flow (less secure, tokens returned directly)                                                                                                                                                                                   | <code>'code'</code> |
| **`pkceEnabled`**                          | <code>boolean</code>                                            | Enable PKCE (Proof Key for Code Exchange) Strongly recommended for public clients (mobile/web apps)                                                                                                                                                                                                                                                      | <code>true</code>   |
| **`scope`**                                | <code>string \| string[]</code>                                 | Default scopes to request during authorization                                                                                                                                                                                                                                                                                                           |                     |
| **`scopes`**                               | <code>string[]</code>                                           | Alias for `scope` using common naming (`scopes`). If both are provided, `scope` takes precedence.                                                                                                                                                                                                                                                        |                     |
| **`additionalParameters`**                 | <code><a href="#record">Record</a>&lt;string, string&gt;</code> | Additional parameters to include in the authorization request                                                                                                                                                                                                                                                                                            |                     |
| **`loginHint`**                            | <code>string</code>                                             | Convenience option for OIDC `login_hint`. Equivalent to passing `additionalParameters.login_hint`.                                                                                                                                                                                                                                                       |                     |
| **`prompt`**                               | <code>string</code>                                             | Convenience option for OAuth/OIDC `prompt`. Equivalent to passing `additionalParameters.prompt`.                                                                                                                                                                                                                                                         |                     |
| **`additionalTokenParameters`**            | <code><a href="#record">Record</a>&lt;string, string&gt;</code> | Additional parameters to include in token requests (code exchange / refresh). Useful for providers that require non-standard parameters.                                                                                                                                                                                                                 |                     |
| **`additionalResourceHeaders`**            | <code><a href="#record">Record</a>&lt;string, string&gt;</code> | Additional headers to include when fetching the resource URL                                                                                                                                                                                                                                                                                             |                     |
| **`logoutUrl`**                            | <code>string</code>                                             | Custom logout URL for ending the session                                                                                                                                                                                                                                                                                                                 |                     |
| **`endSessionEndpoint`**                   | <code>string</code>                                             | Alias for `logoutUrl` to match OIDC naming (`endSessionEndpoint`).                                                                                                                                                                                                                                                                                       |                     |
| **`postLogoutRedirectUrl`**                | <code>string</code>                                             | OIDC post logout redirect URL (sent as `post_logout_redirect_uri` when building the end-session URL).                                                                                                                                                                                                                                                    |                     |
| **`additionalLogoutParameters`**           | <code><a href="#record">Record</a>&lt;string, string&gt;</code> | Additional parameters to include in logout / end-session URL.                                                                                                                                                                                                                                                                                            |                     |
| **`iosPrefersEphemeralWebBrowserSession`** | <code>boolean</code>                                            | iOS-only: Whether to prefer an ephemeral browser session for ASWebAuthenticationSession. Defaults to true to match existing behavior in this plugin.                                                                                                                                                                                                     |                     |
| **`iosPrefersEphemeralSession`**           | <code>boolean</code>                                            | Alias for `iosPrefersEphemeralWebBrowserSession` (to match Capawesome OAuth naming).                                                                                                                                                                                                                                                                     |                     |
| **`logsEnabled`**                          | <code>boolean</code>                                            | Enable debug logging                                                                                                                                                                                                                                                                                                                                     | <code>false</code>  |


#### FacebookLoginResponse

| Prop              | Type                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`accessToken`** | <code><a href="#accesstoken">AccessToken</a> \| null</code>                                                                                                                                                                                                                                                                                                     |
| **`idToken`**     | <code>string \| null</code>                                                                                                                                                                                                                                                                                                                                     |
| **`profile`**     | <code>{ userID: string; email: string \| null; friendIDs: string[]; birthday: string \| null; ageRange: { min?: number; max?: number; } \| null; gender: string \| null; location: { id: string; name: string; } \| null; hometown: { id: string; name: string; } \| null; profileURL: string \| null; name: string \| null; imageURL: string \| null; }</code> |


#### AccessToken

| Prop                      | Type                  |
| ------------------------- | --------------------- |
| **`applicationId`**       | <code>string</code>   |
| **`declinedPermissions`** | <code>string[]</code> |
| **`expires`**             | <code>string</code>   |
| **`isExpired`**           | <code>boolean</code>  |
| **`lastRefresh`**         | <code>string</code>   |
| **`permissions`**         | <code>string[]</code> |
| **`token`**               | <code>string</code>   |
| **`tokenType`**           | <code>string</code>   |
| **`refreshToken`**        | <code>string</code>   |
| **`userId`**              | <code>string</code>   |


#### GoogleLoginResponseOnline

| Prop               | Type                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`accessToken`**  | <code><a href="#accesstoken">AccessToken</a> \| null</code>                                                                                                        |
| **`idToken`**      | <code>string \| null</code>                                                                                                                                        |
| **`profile`**      | <code>{ email: string \| null; familyName: string \| null; givenName: string \| null; id: string \| null; name: string \| null; imageUrl: string \| null; }</code> |
| **`responseType`** | <code>'online'</code>                                                                                                                                              |


#### GoogleLoginResponseOffline

| Prop                 | Type                   |
| -------------------- | ---------------------- |
| **`serverAuthCode`** | <code>string</code>    |
| **`responseType`**   | <code>'offline'</code> |


#### AppleProviderResponse

| Prop                    | Type                                                                                                         | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **`accessToken`**       | <code><a href="#accesstoken">AccessToken</a> \| null</code>                                                  | Access token from Apple                                                               |
| **`idToken`**           | <code>string \| null</code>                                                                                  | Identity token (JWT) from Apple                                                       |
| **`profile`**           | <code>{ user: string; email: string \| null; givenName: string \| null; familyName: string \| null; }</code> | User profile information                                                              |
| **`authorizationCode`** | <code>string</code>                                                                                          | Authorization code for proper token exchange (when useProperTokenExchange is enabled) |


#### TwitterLoginResponse

| Prop               | Type                                                        |
| ------------------ | ----------------------------------------------------------- |
| **`accessToken`**  | <code><a href="#accesstoken">AccessToken</a> \| null</code> |
| **`refreshToken`** | <code>string \| null</code>                                 |
| **`scope`**        | <code>string[]</code>                                       |
| **`tokenType`**    | <code>'bearer'</code>                                       |
| **`expiresIn`**    | <code>number \| null</code>                                 |
| **`profile`**      | <code><a href="#twitterprofile">TwitterProfile</a></code>   |


#### TwitterProfile

| Prop                  | Type                        |
| --------------------- | --------------------------- |
| **`id`**              | <code>string</code>         |
| **`username`**        | <code>string</code>         |
| **`name`**            | <code>string \| null</code> |
| **`profileImageUrl`** | <code>string \| null</code> |
| **`verified`**        | <code>boolean</code>        |
| **`email`**           | <code>string \| null</code> |


#### OAuth2LoginResponse

| Prop               | Type                                                                     | Description                                                                                                    |
| ------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **`providerId`**   | <code>string</code>                                                      | The provider ID that was used for this login                                                                   |
| **`accessToken`**  | <code><a href="#accesstoken">AccessToken</a> \| null</code>              | The access token received from the OAuth provider                                                              |
| **`idToken`**      | <code>string \| null</code>                                              | The ID token (JWT) if provided by the OAuth server (e.g., OpenID Connect)                                      |
| **`refreshToken`** | <code>string \| null</code>                                              | The refresh token if provided (requires appropriate scope like offline_access)                                 |
| **`resourceData`** | <code><a href="#record">Record</a>&lt;string, unknown&gt; \| null</code> | Resource data fetched from resourceUrl if configured Contains the raw JSON response from the resource endpoint |
| **`scope`**        | <code>string[]</code>                                                    | The scopes that were granted                                                                                   |
| **`tokenType`**    | <code>string</code>                                                      | Token type (usually 'bearer')                                                                                  |
| **`expiresIn`**    | <code>number \| null</code>                                              | Token expiration time in seconds                                                                               |


#### FacebookLoginOptions

| Prop               | Type                  | Description      | Default            |
| ------------------ | --------------------- | ---------------- | ------------------ |
| **`permissions`**  | <code>string[]</code> | Permissions      |                    |
| **`limitedLogin`** | <code>boolean</code>  | Is Limited Login | <code>false</code> |
| **`nonce`**        | <code>string</code>   | Nonce            |                    |


#### GoogleLoginOptions

| Prop                             | Type                                                                                                         | Description                                                                                          | Default                 | Since  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| **`scopes`**                     | <code>string[]</code>                                                                                        | Specifies the scopes required for accessing Google APIs The default is defined in the configuration. |                         |        |
| **`nonce`**                      | <code>string</code>                                                                                          | Nonce                                                                                                |                         |        |
| **`forceRefreshToken`**          | <code>boolean</code>                                                                                         | Force refresh token (only for Android)                                                               | <code>false</code>      |        |
| **`forcePrompt`**                | <code>boolean</code>                                                                                         | Force account selection prompt (iOS)                                                                 | <code>false</code>      |        |
| **`style`**                      | <code>'bottom' \| 'standard'</code>                                                                          | Style                                                                                                | <code>'standard'</code> |        |
| **`filterByAuthorizedAccounts`** | <code>boolean</code>                                                                                         | Filter by authorized accounts (Android only)                                                         | <code>true</code>       |        |
| **`autoSelectEnabled`**          | <code>boolean</code>                                                                                         | Auto select enabled (Android only)                                                                   | <code>false</code>      |        |
| **`prompt`**                     | <code>'none' \| 'consent' \| 'select_account' \| 'consent select_account' \| 'select_account consent'</code> | Prompt parameter for Google OAuth (Web only)                                                         |                         | 7.12.0 |


#### AppleProviderOptions

| Prop                      | Type                  | Description                                   | Default            |
| ------------------------- | --------------------- | --------------------------------------------- | ------------------ |
| **`scopes`**              | <code>string[]</code> | Scopes                                        |                    |
| **`nonce`**               | <code>string</code>   | Nonce                                         |                    |
| **`state`**               | <code>string</code>   | State                                         |                    |
| **`useBroadcastChannel`** | <code>boolean</code>  | Use Broadcast Channel for authentication flow | <code>false</code> |


#### TwitterLoginOptions

| Prop               | Type                  | Description                                                                                                                             |
| ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`scopes`**       | <code>string[]</code> | Additional scopes to request during login. If omitted the plugin falls back to the default scopes configured during initialization.     |
| **`state`**        | <code>string</code>   | Provide a custom OAuth state value. When not provided the plugin generates a cryptographically random value.                            |
| **`codeVerifier`** | <code>string</code>   | Provide a pre-computed PKCE code verifier (mostly used for testing). When omitted the plugin generates a secure verifier automatically. |
| **`redirectUrl`**  | <code>string</code>   | Override the redirect URI for a single login call. Useful when the same app supports multiple callback URLs per platform.               |
| **`forceLogin`**   | <code>boolean</code>  | Force the consent screen on every attempt, maps to `force_login=true`.                                                                  |


#### OAuth2LoginOptions

| Prop                       | Type                                                            | Description                                                                                                                                                                                                                                                                                                                | Default              |
| -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **`providerId`**           | <code>string</code>                                             | The provider ID as configured in initialize() This is required to identify which OAuth2 provider to use                                                                                                                                                                                                                    |                      |
| **`scope`**                | <code>string \| string[]</code>                                 | Override the scopes for this login request If not provided, uses the scopes from initialization                                                                                                                                                                                                                            |                      |
| **`scopes`**               | <code>string[]</code>                                           | Alias for `scope` using common naming (`scopes`). If both are provided, `scope` takes precedence.                                                                                                                                                                                                                          |                      |
| **`state`**                | <code>string</code>                                             | Custom state parameter for CSRF protection If not provided, a random value is generated                                                                                                                                                                                                                                    |                      |
| **`codeVerifier`**         | <code>string</code>                                             | Override PKCE code verifier (for testing purposes) If not provided, a secure random verifier is generated                                                                                                                                                                                                                  |                      |
| **`redirectUrl`**          | <code>string</code>                                             | Override redirect URL for this login request                                                                                                                                                                                                                                                                               |                      |
| **`additionalParameters`** | <code><a href="#record">Record</a>&lt;string, string&gt;</code> | Additional parameters to add to the authorization URL                                                                                                                                                                                                                                                                      |                      |
| **`loginHint`**            | <code>string</code>                                             | Convenience option for OIDC `login_hint`. Equivalent to passing `additionalParameters.login_hint`.                                                                                                                                                                                                                         |                      |
| **`prompt`**               | <code>string</code>                                             | Convenience option for OAuth/OIDC `prompt`. Equivalent to passing `additionalParameters.prompt`.                                                                                                                                                                                                                           |                      |
| **`flow`**                 | <code>'popup' \| 'redirect'</code>                              | Web-only (`oauth2` provider only): Use a full-page redirect instead of a popup window. When using `redirect`, the promise returned by `login()` will not resolve because the page navigates away. After the redirect lands back in your app, call `SocialLogin.handleRedirectCallback()` on that page to parse the result. | <code>'popup'</code> |


#### isLoggedInOptions

| Prop             | Type                                                                    | Description                                                           |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **`provider`**   | <code>'apple' \| 'google' \| 'facebook' \| 'twitter' \| 'oauth2'</code> | Provider                                                              |
| **`providerId`** | <code>string</code>                                                     | Provider ID for OAuth2 providers (required when provider is 'oauth2') |


#### AuthorizationCode

| Prop              | Type                | Description  |
| ----------------- | ------------------- | ------------ |
| **`jwt`**         | <code>string</code> | Jwt          |
| **`accessToken`** | <code>string</code> | Access Token |


#### AuthorizationCodeOptions

| Prop             | Type                                                                    | Description                                                           |
| ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **`provider`**   | <code>'apple' \| 'google' \| 'facebook' \| 'twitter' \| 'oauth2'</code> | Provider                                                              |
| **`providerId`** | <code>string</code>                                                     | Provider ID for OAuth2 providers (required when provider is 'oauth2') |


#### FacebookGetProfileResponse

| Prop          | Type                                                                                                                                                                                                                                                                                               | Description           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **`profile`** | <code>{ [key: string]: any; id: string \| null; name: string \| null; email: string \| null; first_name: string \| null; last_name: string \| null; picture?: { data: { height: number \| null; is_silhouette: boolean \| null; url: string \| null; width: number \| null; }; } \| null; }</code> | Facebook profile data |


#### FacebookRequestTrackingResponse

| Prop         | Type                                                                     | Description                       |
| ------------ | ------------------------------------------------------------------------ | --------------------------------- |
| **`status`** | <code>'authorized' \| 'denied' \| 'notDetermined' \| 'restricted'</code> | App tracking authorization status |


#### FacebookGetProfileOptions

| Prop         | Type                  | Description                              |
| ------------ | --------------------- | ---------------------------------------- |
| **`fields`** | <code>string[]</code> | Fields to retrieve from Facebook profile |


#### OpenSecureWindowResponse

| Prop                | Type                | Description                             |
| ------------------- | ------------------- | --------------------------------------- |
| **`redirectedUri`** | <code>string</code> | The result of the openSecureWindow call |


#### OpenSecureWindowOptions

| Prop                       | Type                | Description                                                                                                                                                     |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`authEndpoint`**         | <code>string</code> | The endpoint to open                                                                                                                                            |
| **`redirectUri`**          | <code>string</code> | The redirect URI to use for the openSecureWindow call. This will be checked to make sure it matches the redirect URI after the window finishes the redirection. |
| **`broadcastChannelName`** | <code>string</code> | The name of the broadcast channel to listen to, relevant only for web                                                                                           |


### Type Aliases


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>


#### ProviderResponseMap

<code>{ facebook: <a href="#facebookloginresponse">FacebookLoginResponse</a>; google: <a href="#googleloginresponse">GoogleLoginResponse</a>; apple: <a href="#appleproviderresponse">AppleProviderResponse</a>; twitter: <a href="#twitterloginresponse">TwitterLoginResponse</a>; oauth2: <a href="#oauth2loginresponse">OAuth2LoginResponse</a>; }</code>


#### GoogleLoginResponse

<code><a href="#googleloginresponseonline">GoogleLoginResponseOnline</a> | <a href="#googleloginresponseoffline">GoogleLoginResponseOffline</a></code>


#### LoginOptions

<code>{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; } | { provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; } | { provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; } | { provider: 'twitter'; options: <a href="#twitterloginoptions">TwitterLoginOptions</a>; } | { provider: 'oauth2'; options: <a href="#oauth2loginoptions">OAuth2LoginOptions</a>; }</code>


#### Extract

<a href="#extract">Extract</a> from T those types that are assignable to U

<code>T extends U ? T : never</code>


#### LoginResult

<code>{ provider: 'facebook'; result: <a href="#facebookloginresponse">FacebookLoginResponse</a>; } | { provider: 'google'; result: <a href="#googleloginresponse">GoogleLoginResponse</a>; } | { provider: 'apple'; result: <a href="#appleproviderresponse">AppleProviderResponse</a>; } | { provider: 'twitter'; result: <a href="#twitterloginresponse">TwitterLoginResponse</a>; } | { provider: 'oauth2'; result: <a href="#oauth2loginresponse">OAuth2LoginResponse</a>; }</code>


#### ProviderSpecificCallResponseMap

<code>{ 'facebook#getProfile': <a href="#facebookgetprofileresponse">FacebookGetProfileResponse</a>; 'facebook#requestTracking': <a href="#facebookrequesttrackingresponse">FacebookRequestTrackingResponse</a>; }</code>


#### ProviderSpecificCall

<code>'facebook#getProfile' | 'facebook#requestTracking'</code>


#### ProviderSpecificCallOptionsMap

<code>{ 'facebook#getProfile': <a href="#facebookgetprofileoptions">FacebookGetProfileOptions</a>; 'facebook#requestTracking': <a href="#facebookrequesttrackingoptions">FacebookRequestTrackingOptions</a>; }</code>


#### FacebookRequestTrackingOptions

<code><a href="#record">Record</a>&lt;string, never&gt;</code>

</docgen-api>


## Privacy Manifest for App Developers

If you use Google, Facebook, or Apple login, you must declare the data collected by their SDKs in your app's `PrivacyInfo.xcprivacy` file (not in the plugin).

Add this file in your app at: `ios/App/PrivacyInfo.xcprivacy`

### Google Sign-In Example
```json
{
  "NSPrivacyCollectedDataTypes": [
    { "NSPrivacyCollectedDataType": "EmailAddress", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "Name", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "UserID", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false }
  ]
}
```

### Facebook Login Example
```json
{
  "NSPrivacyCollectedDataTypes": [
    { "NSPrivacyCollectedDataType": "EmailAddress", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "Name", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "UserID", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "FriendsList", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false }
  ]
}
```

### Apple Sign-In Example
```json
{
  "NSPrivacyCollectedDataTypes": [
    { "NSPrivacyCollectedDataType": "EmailAddress", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false },
    { "NSPrivacyCollectedDataType": "Name", "NSPrivacyCollectedDataTypeLinked": true, "NSPrivacyCollectedDataTypeTracking": false }
  ]
}
```

- Adjust the data types to match your app's usage and the SDK documentation.
- See [Apple docs](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/) for all allowed keys and values.

## Combine facebook and google URL handler in `AppDelegate.swift`

```swift
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call

        // Return true if the URL was handled by either Facebook or Google authentication
        // https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_facebook.md#ios-setup
        // https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md#using-google-login-on-ios
        if FBSDKCoreKit.ApplicationDelegate.shared.application(
            app,
            open: url,
            sourceApplication: options[UIApplication.OpenURLOptionsKey.sourceApplication] as? String,
            annotation: options[UIApplication.OpenURLOptionsKey.annotation]
        ) || GIDSignIn.sharedInstance.handle(url) {
            return true
        }

        // If URL wasn't handled by auth services, pass it to Capacitor for processing
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }
```

### Credits

This plugin implementation of google is based on [CapacitorGoogleAuth](https://github.com/CodetrixStudio/CapacitorGoogleAuth) with a lot of rework, the current maintainer is unreachable, we are thankful for his work and are now going forward on our own!
Thanks to [reslear](https://github.com/reslear) for helping to transfer users to this plugin from the old one and all the work.
