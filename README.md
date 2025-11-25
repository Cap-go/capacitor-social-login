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

This plugin implement social auth for:
- Google (with credential manager)
- Apple (with 0auth on android)
- Facebook ( with latest SDK)

We plan in the future to keep adding others social login and make this plugin the all in one solution.

This plugin is the only one who implement all 3 majors social login on WEB, IOS and Android

## Documentation

Best experience to read the doc here:

https://capgo.app/docs/plugins/social-login/getting-started/


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
      }
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
but your declaration on Play Console says your app doesn't use advertising ID. You must update your advertising 
ID declaration.
```

**Root Cause**: The Facebook SDK automatically includes the `com.google.android.gms.permission.AD_ID` permission, even when you're only using Google and Apple sign-in.

**Solutions**:

#### Solution 1: Remove AD_ID Permission (Recommended)
If you're not using Facebook login, add this to your app's `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
```

Make sure you have the tools namespace declared:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

#### Solution 2: Update Google Play Console Declaration
In Google Play Console → App content → Data safety:
1. Select "Yes, my app collects or shares user data"
2. Under "Data types" → "Device or other IDs" → Select "Advertising ID"
3. Specify usage purpose (usually "App functionality" and/or "Analytics")

#### Solution 3: Conditional Facebook Dependencies (Advanced)
For advanced users who want to completely exclude Facebook from builds, you can use Gradle's conditional dependencies, but this requires custom build configuration.

**Verification**: After implementing Solution 1, run:
```bash
./gradlew :app:dependencies --configuration debugRuntimeClasspath | grep facebook
```

The Facebook dependencies should still be present (for compatibility), but the AD_ID permission should be removed from your final APK.

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

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`login(...)`](#login)
* [`logout(...)`](#logout)
* [`isLoggedIn(...)`](#isloggedin)
* [`getAuthorizationCode(...)`](#getauthorizationcode)
* [`refresh(...)`](#refresh)
* [`providerSpecificCall(...)`](#providerspecificcall)
* [`getPluginVersion()`](#getpluginversion)
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
login<T extends "apple" | "google" | "facebook" | "twitter">(options: Extract<LoginOptions, { provider: T; }>) => Promise<{ provider: T; result: ProviderResponseMap[T]; }>
```

Login with the selected provider

| Param         | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`** | <code><a href="#extract">Extract</a>&lt;{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'twitter'; options: <a href="#twitterloginoptions">TwitterLoginOptions</a>; }, { provider: T; }&gt;</code> |

**Returns:** <code>Promise&lt;{ provider: T; result: ProviderResponseMap[T]; }&gt;</code>

--------------------


### logout(...)

```typescript
logout(options: { provider: 'apple' | 'google' | 'facebook' | 'twitter'; }) => Promise<void>
```

Logout

| Param         | Type                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| **`options`** | <code>{ provider: 'apple' \| 'google' \| 'facebook' \| 'twitter'; }</code> |

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


### Interfaces


#### InitializeOptions

| Prop           | Type                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`twitter`**  | <code>{ clientId: string; redirectUrl: string; defaultScopes?: string[]; forceLogin?: boolean; audience?: string; }</code>                                          |
| **`facebook`** | <code>{ appId: string; clientToken?: string; locale?: string; }</code>                                                                                              |
| **`google`**   | <code>{ iOSClientId?: string; iOSServerClientId?: string; webClientId?: string; mode?: 'online' \| 'offline'; hostedDomain?: string; redirectUrl?: string; }</code> |
| **`apple`**    | <code>{ clientId?: string; redirectUrl?: string; useProperTokenExchange?: boolean; useBroadcastChannel?: boolean; }</code>                                          |


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


#### isLoggedInOptions

| Prop           | Type                                                        | Description |
| -------------- | ----------------------------------------------------------- | ----------- |
| **`provider`** | <code>'apple' \| 'google' \| 'facebook' \| 'twitter'</code> | Provider    |


#### AuthorizationCode

| Prop              | Type                | Description  |
| ----------------- | ------------------- | ------------ |
| **`jwt`**         | <code>string</code> | Jwt          |
| **`accessToken`** | <code>string</code> | Access Token |


#### AuthorizationCodeOptions

| Prop           | Type                                                        | Description |
| -------------- | ----------------------------------------------------------- | ----------- |
| **`provider`** | <code>'apple' \| 'google' \| 'facebook' \| 'twitter'</code> | Provider    |


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


### Type Aliases


#### ProviderResponseMap

<code>{ facebook: <a href="#facebookloginresponse">FacebookLoginResponse</a>; google: <a href="#googleloginresponse">GoogleLoginResponse</a>; apple: <a href="#appleproviderresponse">AppleProviderResponse</a>; twitter: <a href="#twitterloginresponse">TwitterLoginResponse</a>; }</code>


#### GoogleLoginResponse

<code><a href="#googleloginresponseonline">GoogleLoginResponseOnline</a> | <a href="#googleloginresponseoffline">GoogleLoginResponseOffline</a></code>


#### LoginOptions

<code>{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; } | { provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; } | { provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; } | { provider: 'twitter'; options: <a href="#twitterloginoptions">TwitterLoginOptions</a>; }</code>


#### Extract

<a href="#extract">Extract</a> from T those types that are assignable to U

<code>T extends U ? T : never</code>


#### ProviderSpecificCallResponseMap

<code>{ 'facebook#getProfile': <a href="#facebookgetprofileresponse">FacebookGetProfileResponse</a>; 'facebook#requestTracking': <a href="#facebookrequesttrackingresponse">FacebookRequestTrackingResponse</a>; }</code>


#### ProviderSpecificCall

<code>'facebook#getProfile' | 'facebook#requestTracking'</code>


#### ProviderSpecificCallOptionsMap

<code>{ 'facebook#getProfile': <a href="#facebookgetprofileoptions">FacebookGetProfileOptions</a>; 'facebook#requestTracking': <a href="#facebookrequesttrackingoptions">FacebookRequestTrackingOptions</a>; }</code>


#### FacebookRequestTrackingOptions

<code><a href="#record">Record</a>&lt;string, never&gt;</code>


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>

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
