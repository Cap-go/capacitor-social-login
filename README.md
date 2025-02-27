# @capgo/capacitor-social-login
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin"> ➡️ Get Instant updates for your App with Capgo 🚀</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin"> Fix your annoying bug now, Hire a Capacitor expert 💪</a></h2>
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

## Install

```bash
npm install @capgo/capacitor-social-login
npx cap sync
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

Docs: [How to setup facebook login](./docs/setup_facebook.md)

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

### Android configuration

Directly call the `initialize` method with the `google` provider

```typescript
await SocialLogin.initialize({
  google: {
    webClientId: 'your-client-id', // the web client id for Android and Web
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

Call the `initialize` method with the `google` provider

```typescript
await SocialLogin.initialize({
  google: {
    iOSClientId: 'your-client-id', // the iOS client id
    iOSServerClientId: 'your-server-client-id', // the iOS server client id (required in mode offline)
  },
});
const res = await SocialLogin.login({
  provider: 'google',
  options: {
    scopes: ['email', 'profile'],
  },
});
```

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`login(...)`](#login)
* [`logout(...)`](#logout)
* [`isLoggedIn(...)`](#isloggedin)
* [`getAuthorizationCode(...)`](#getauthorizationcode)
* [`refresh(...)`](#refresh)
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
login<T extends "apple" | "google" | "facebook">(options: Extract<LoginOptions, { provider: T; }>) => Promise<{ provider: T; result: ProviderResponseMap[T]; }>
```

Login with the selected provider

| Param         | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`options`** | <code><a href="#extract">Extract</a>&lt;{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; }, { provider: T; }&gt; \| <a href="#extract">Extract</a>&lt;{ provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; }, { provider: T; }&gt;</code> |

**Returns:** <code>Promise&lt;{ provider: T; result: ProviderResponseMap[T]; }&gt;</code>

--------------------


### logout(...)

```typescript
logout(options: { provider: 'apple' | 'google' | 'facebook'; }) => Promise<void>
```

Logout

| Param         | Type                                                          |
| ------------- | ------------------------------------------------------------- |
| **`options`** | <code>{ provider: 'apple' \| 'google' \| 'facebook'; }</code> |

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

Get the current access token

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


### Interfaces


#### InitializeOptions

| Prop           | Type                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`facebook`** | <code>{ appId: string; clientToken: string; }</code>                                                                   |
| **`google`**   | <code>{ iOSClientId?: string; iOSServerClientId?: string; webClientId?: string; mode?: 'online' \| 'offline'; }</code> |
| **`apple`**    | <code>{ clientId?: string; redirectUrl?: string; }</code>                                                              |


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

| Prop              | Type                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **`accessToken`** | <code><a href="#accesstoken">AccessToken</a> \| null</code>                                                  |
| **`idToken`**     | <code>string \| null</code>                                                                                  |
| **`profile`**     | <code>{ user: string; email: string \| null; givenName: string \| null; familyName: string \| null; }</code> |


#### FacebookLoginOptions

| Prop               | Type                  | Description      | Default            |
| ------------------ | --------------------- | ---------------- | ------------------ |
| **`permissions`**  | <code>string[]</code> | Permissions      |                    |
| **`limitedLogin`** | <code>boolean</code>  | Is Limited Login | <code>false</code> |
| **`nonce`**        | <code>string</code>   | Nonce            |                    |


#### GoogleLoginOptions

| Prop                    | Type                  | Description                                                                                          | Default            |
| ----------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- | ------------------ |
| **`scopes`**            | <code>string[]</code> | Specifies the scopes required for accessing Google APIs The default is defined in the configuration. |                    |
| **`nonce`**             | <code>string</code>   | Nonce                                                                                                |                    |
| **`forceRefreshToken`** | <code>boolean</code>  | Force refresh token (only for Android)                                                               | <code>false</code> |
| **`disableOneTap`**     | <code>boolean</code>  | Disable one-tap login (web only)                                                                     | <code>false</code> |


#### AppleProviderOptions

| Prop         | Type                  | Description |
| ------------ | --------------------- | ----------- |
| **`scopes`** | <code>string[]</code> | Scopes      |
| **`nonce`**  | <code>string</code>   | Nonce       |
| **`state`**  | <code>string</code>   | State       |


#### isLoggedInOptions

| Prop           | Type                                           | Description |
| -------------- | ---------------------------------------------- | ----------- |
| **`provider`** | <code>'apple' \| 'google' \| 'facebook'</code> | Provider    |


#### AuthorizationCode

| Prop              | Type                | Description  |
| ----------------- | ------------------- | ------------ |
| **`jwt`**         | <code>string</code> | Jwt          |
| **`accessToken`** | <code>string</code> | Access Token |


#### AuthorizationCodeOptions

| Prop           | Type                                           | Description |
| -------------- | ---------------------------------------------- | ----------- |
| **`provider`** | <code>'apple' \| 'google' \| 'facebook'</code> | Provider    |


### Type Aliases


#### ProviderResponseMap

<code>{ facebook: <a href="#facebookloginresponse">FacebookLoginResponse</a>; google: <a href="#googleloginresponse">GoogleLoginResponse</a>; apple: <a href="#appleproviderresponse">AppleProviderResponse</a>; }</code>


#### GoogleLoginResponse

<code><a href="#googleloginresponseonline">GoogleLoginResponseOnline</a> | <a href="#googleloginresponseoffline">GoogleLoginResponseOffline</a></code>


#### LoginOptions

<code>{ provider: 'facebook'; options: <a href="#facebookloginoptions">FacebookLoginOptions</a>; } | { provider: 'google'; options: <a href="#googleloginoptions">GoogleLoginOptions</a>; } | { provider: 'apple'; options: <a href="#appleprovideroptions">AppleProviderOptions</a>; }</code>


#### Extract

<a href="#extract">Extract</a> from T those types that are assignable to U

<code>T extends U ? T : never</code>

</docgen-api>

### Credits

This plugin implementation of google is based on [CapacitorGoogleAuth](https://github.com/CodetrixStudio/CapacitorGoogleAuth) with a lot of rework, the current maintainer is unreachable, we are thankful for his work and are now going forward on our own!
Thanks to [reslear](https://github.com/reslear) for helping to tranfer users to this plugin from the old one and all the work.
