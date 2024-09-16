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
* [`getCurrentUser()`](#getcurrentuser)
* [`refresh(...)`](#refresh)
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
login(options: LoginOptions) => Promise<void>
```

Login with the selected provider

| Param         | Type                                                  |
| ------------- | ----------------------------------------------------- |
| **`options`** | <code><a href="#loginoptions">LoginOptions</a></code> |

--------------------


### logout(...)

```typescript
logout(options: LoginOptions) => Promise<void>
```

Logout

| Param         | Type                                                  |
| ------------- | ----------------------------------------------------- |
| **`options`** | <code><a href="#loginoptions">LoginOptions</a></code> |

--------------------


### getCurrentUser()

```typescript
getCurrentUser() => Promise<CurrentUserResponse>
```

Get the current access token

**Returns:** <code>Promise&lt;<a href="#currentuserresponse">CurrentUserResponse</a>&gt;</code>

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

| Prop                      | Type                | Description                                                                                                                                      | Since |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| **`facebookAppId`**       | <code>string</code> | Facebook App ID, provided by Facebook                                                                                                            |       |
| **`googleClientId`**      | <code>string</code> | The app's client ID, found and created in the Google Developers Console. Common for Android or iOS. The default is defined in the configuration. | 3.1.0 |
| **`appleClientId`**       | <code>string</code> | Apple Client ID, provided by Apple                                                                                                               |       |
| **`twitterClientId`**     | <code>string</code> | Twitter Client ID, provided by Twitter                                                                                                           |       |
| **`twitterClientSecret`** | <code>string</code> | Twitter Client Secret, provided by Twitter                                                                                                       |       |


#### LoginOptions

| Prop           | Type                                                                                                                          | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                   | Provider    |
| **`payload`**  | <code><a href="#facebookloginoptions">FacebookLoginOptions</a> \| <a href="#googleloginoptions">GoogleLoginOptions</a></code> | Payload     |


#### FacebookLoginOptions

| Prop              | Type                  | Description |
| ----------------- | --------------------- | ----------- |
| **`permissions`** | <code>string[]</code> | Permissions |


#### GoogleLoginOptions

| Prop                     | Type                  | Description                                                                                                                              | Default            | Since |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| **`scopes`**             | <code>string[]</code> | Specifies the scopes required for accessing Google APIs The default is defined in the configuration.                                     |                    |       |
| **`grantOfflineAccess`** | <code>boolean</code>  | Set if your application needs to refresh access tokens when the user is not present at the browser. In response use `serverAuthCode` key | <code>false</code> | 3.1.0 |


#### CurrentUserResponse

| Prop           | Type                                                                                                                                                                                      | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                                                                               | Provider    |
| **`result`**   | <code><a href="#facebookloginresponse">FacebookLoginResponse</a> \| <a href="#googleloginresponse">GoogleLoginResponse</a> \| <a href="#appleloginresponse">AppleLoginResponse</a></code> | Payload     |


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


#### AppleLoginResponse

| Prop                    | Type                        |
| ----------------------- | --------------------------- |
| **`user`**              | <code>string \| null</code> |
| **`email`**             | <code>string \| null</code> |
| **`givenName`**         | <code>string \| null</code> |
| **`familyName`**        | <code>string \| null</code> |
| **`identityToken`**     | <code>string</code>         |
| **`authorizationCode`** | <code>string</code>         |

</docgen-api>
