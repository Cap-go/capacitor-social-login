# @capgo/capacitor-social-login

All social logins in one plugin
WIP: it will be done soon

## Install

```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`login(...)`](#login)
* [`logout(...)`](#logout)
* [`isLoggedIn(...)`](#isloggedin)
* [`getAuthorizationCode(...)`](#getauthorizationcode)
* [`refresh(...)`](#refresh)
* [`addListener('loginResult', ...)`](#addlistenerloginresult-)
* [Interfaces](#interfaces)

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
login(options: LoginOptions) => Promise<LoginResult>
```

Login with the selected provider

| Param         | Type                                                  |
| ------------- | ----------------------------------------------------- |
| **`options`** | <code><a href="#loginoptions">LoginOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#loginresult">LoginResult</a>&gt;</code>

--------------------


### logout(...)

```typescript
logout(options: { provider: 'apple'; }) => Promise<void>
```

Logout

| Param         | Type                                |
| ------------- | ----------------------------------- |
| **`options`** | <code>{ provider: 'apple'; }</code> |

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


### addListener('loginResult', ...)

```typescript
addListener(eventName: "loginResult", listenerFunc: (result: LoginListenerEvent) => void) => Promise<PluginListenerHandle>
```

| Param              | Type                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'loginResult'</code>                                                             |
| **`listenerFunc`** | <code>(result: <a href="#loginlistenerevent">LoginListenerEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### Interfaces


#### InitializeOptions

| Prop           | Type                                                    |
| -------------- | ------------------------------------------------------- |
| **`facebook`** | <code>{ appId: string; }</code>                         |
| **`google`**   | <code>{ clientId: string; }</code>                      |
| **`apple`**    | <code>{ clientId: string; redirectUrl: string; }</code> |


#### LoginResult

| Prop           | Type                                                                                                                                                                                            | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                                                                                     | Provider    |
| **`result`**   | <code><a href="#facebookloginresponse">FacebookLoginResponse</a> \| <a href="#googleloginresponse">GoogleLoginResponse</a> \| <a href="#appleproviderresponse">AppleProviderResponse</a></code> | Payload     |


#### FacebookLoginResponse

| Prop              | Type                                                        |
| ----------------- | ----------------------------------------------------------- |
| **`accessToken`** | <code><a href="#accesstoken">AccessToken</a> \| null</code> |
| **`profile`**     | <code>{ fields: readonly string[]; }</code>                 |


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
| **`userId`**              | <code>string</code>   |


#### GoogleLoginResponse

| Prop              | Type                                                        |
| ----------------- | ----------------------------------------------------------- |
| **`accessToken`** | <code><a href="#accesstoken">AccessToken</a> \| null</code> |
| **`profile`**     | <code>{ fields: readonly string[]; }</code>                 |


#### AppleProviderResponse

| Prop                    | Type                        |
| ----------------------- | --------------------------- |
| **`user`**              | <code>string \| null</code> |
| **`email`**             | <code>string \| null</code> |
| **`givenName`**         | <code>string \| null</code> |
| **`familyName`**        | <code>string \| null</code> |
| **`identityToken`**     | <code>string</code>         |
| **`authorizationCode`** | <code>string</code>         |


#### LoginOptions

| Prop           | Type                                                                                                                                                                                      | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                                                                               | Provider    |
| **`options`**  | <code><a href="#facebookloginoptions">FacebookLoginOptions</a> \| <a href="#googleloginoptions">GoogleLoginOptions</a> \| <a href="#appleprovideroptions">AppleProviderOptions</a></code> | Options     |


#### FacebookLoginOptions

| Prop              | Type                  | Description |
| ----------------- | --------------------- | ----------- |
| **`permissions`** | <code>string[]</code> | Permissions |


#### GoogleLoginOptions

| Prop                     | Type                  | Description                                                                                                                              | Default            | Since |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| **`scopes`**             | <code>string[]</code> | Specifies the scopes required for accessing Google APIs The default is defined in the configuration.                                     |                    |       |
| **`grantOfflineAccess`** | <code>boolean</code>  | Set if your application needs to refresh access tokens when the user is not present at the browser. In response use `serverAuthCode` key | <code>false</code> | 3.1.0 |


#### AppleProviderOptions

| Prop              | Type                  | Description  |
| ----------------- | --------------------- | ------------ |
| **`scopes`**      | <code>string[]</code> | Scopes       |
| **`redirectURI`** | <code>string</code>   | Redirect URI |
| **`nonce`**       | <code>string</code>   | Nonce        |
| **`state`**       | <code>string</code>   | State        |


#### isLoggedInOptions

| Prop           | Type                 | Description |
| -------------- | -------------------- | ----------- |
| **`provider`** | <code>'apple'</code> | Provider    |


#### AuthorizationCode

| Prop      | Type                | Description |
| --------- | ------------------- | ----------- |
| **`jwt`** | <code>string</code> | Jwt         |


#### AuthorizationCodeOptions

| Prop           | Type                 | Description |
| -------------- | -------------------- | ----------- |
| **`provider`** | <code>'apple'</code> | Provider    |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### LoginListenerEvent

| Prop           | Type                 | Description |
| -------------- | -------------------- | ----------- |
| **`provider`** | <code>'apple'</code> | Provider    |
| **`status`**   | <code>string</code>  | status      |

</docgen-api>
