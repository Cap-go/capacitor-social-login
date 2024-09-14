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

| Prop                      | Type                                                                                                              | Description                                                                                                                                      | Since |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| **`facebookAppId`**       | <code>string</code>                                                                                               | Facebook App ID, provided by Facebook                                                                                                            |       |
| **`googleClientId`**      | <code>string</code>                                                                                               | The app's client ID, found and created in the Google Developers Console. Common for Android or iOS. The default is defined in the configuration. | 3.1.0 |
| **`appleClientId`**       | <code>string</code>                                                                                               | Apple Client ID, provided by Apple                                                                                                               |       |
| **`twitterClientId`**     | <code>string</code>                                                                                               | Twitter Client ID, provided by Twitter                                                                                                           |       |
| **`twitterClientSecret`** | <code>string</code>                                                                                               | Twitter Client Secret, provided by Twitter                                                                                                       |       |
| **`apple`**               | <code>{ android: { clientId: <a href="#string">String</a>; redirectUrl: <a href="#string">String</a>; }; }</code> |                                                                                                                                                  |       |


#### String

Allows manipulation and formatting of text strings and determination and location of substrings within strings.

| Prop         | Type                | Description                                                  |
| ------------ | ------------------- | ------------------------------------------------------------ |
| **`length`** | <code>number</code> | Returns the length of a <a href="#string">String</a> object. |

| Method                | Signature                                                                                                                      | Description                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **toString**          | () =&gt; string                                                                                                                | Returns a string representation of a string.                                                                                                  |
| **charAt**            | (pos: number) =&gt; string                                                                                                     | Returns the character at the specified index.                                                                                                 |
| **charCodeAt**        | (index: number) =&gt; number                                                                                                   | Returns the Unicode value of the character at the specified location.                                                                         |
| **concat**            | (...strings: string[]) =&gt; string                                                                                            | Returns a string that contains the concatenation of two or more strings.                                                                      |
| **indexOf**           | (searchString: string, position?: number \| undefined) =&gt; number                                                            | Returns the position of the first occurrence of a substring.                                                                                  |
| **lastIndexOf**       | (searchString: string, position?: number \| undefined) =&gt; number                                                            | Returns the last occurrence of a substring in the string.                                                                                     |
| **localeCompare**     | (that: string) =&gt; number                                                                                                    | Determines whether two strings are equivalent in the current locale.                                                                          |
| **match**             | (regexp: string \| <a href="#regexp">RegExp</a>) =&gt; <a href="#regexpmatcharray">RegExpMatchArray</a> \| null                | Matches a string with a regular expression, and returns an array containing the results of that search.                                       |
| **replace**           | (searchValue: string \| <a href="#regexp">RegExp</a>, replaceValue: string) =&gt; string                                       | Replaces text in a string, using a regular expression or search string.                                                                       |
| **replace**           | (searchValue: string \| <a href="#regexp">RegExp</a>, replacer: (substring: string, ...args: any[]) =&gt; string) =&gt; string | Replaces text in a string, using a regular expression or search string.                                                                       |
| **search**            | (regexp: string \| <a href="#regexp">RegExp</a>) =&gt; number                                                                  | Finds the first substring match in a regular expression search.                                                                               |
| **slice**             | (start?: number \| undefined, end?: number \| undefined) =&gt; string                                                          | Returns a section of a string.                                                                                                                |
| **split**             | (separator: string \| <a href="#regexp">RegExp</a>, limit?: number \| undefined) =&gt; string[]                                | Split a string into substrings using the specified separator and return them as an array.                                                     |
| **substring**         | (start: number, end?: number \| undefined) =&gt; string                                                                        | Returns the substring at the specified location within a <a href="#string">String</a> object.                                                 |
| **toLowerCase**       | () =&gt; string                                                                                                                | Converts all the alphabetic characters in a string to lowercase.                                                                              |
| **toLocaleLowerCase** | (locales?: string \| string[] \| undefined) =&gt; string                                                                       | Converts all alphabetic characters to lowercase, taking into account the host environment's current locale.                                   |
| **toUpperCase**       | () =&gt; string                                                                                                                | Converts all the alphabetic characters in a string to uppercase.                                                                              |
| **toLocaleUpperCase** | (locales?: string \| string[] \| undefined) =&gt; string                                                                       | Returns a string where all alphabetic characters have been converted to uppercase, taking into account the host environment's current locale. |
| **trim**              | () =&gt; string                                                                                                                | Removes the leading and trailing white space and line terminator characters from a string.                                                    |
| **substr**            | (from: number, length?: number \| undefined) =&gt; string                                                                      | Gets a substring beginning at the specified location and having the specified length.                                                         |
| **valueOf**           | () =&gt; string                                                                                                                | Returns the primitive value of the specified object.                                                                                          |


#### RegExpMatchArray

| Prop        | Type                |
| ----------- | ------------------- |
| **`index`** | <code>number</code> |
| **`input`** | <code>string</code> |


#### RegExp

| Prop             | Type                 | Description                                                                                                                                                          |
| ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`source`**     | <code>string</code>  | Returns a copy of the text of the regular expression pattern. Read-only. The regExp argument is a Regular expression object. It can be a variable name or a literal. |
| **`global`**     | <code>boolean</code> | Returns a Boolean value indicating the state of the global flag (g) used with a regular expression. Default is false. Read-only.                                     |
| **`ignoreCase`** | <code>boolean</code> | Returns a Boolean value indicating the state of the ignoreCase flag (i) used with a regular expression. Default is false. Read-only.                                 |
| **`multiline`**  | <code>boolean</code> | Returns a Boolean value indicating the state of the multiline flag (m) used with a regular expression. Default is false. Read-only.                                  |
| **`lastIndex`**  | <code>number</code>  |                                                                                                                                                                      |

| Method      | Signature                                                                     | Description                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **exec**    | (string: string) =&gt; <a href="#regexpexecarray">RegExpExecArray</a> \| null | Executes a search on a string using a regular expression pattern, and returns an array containing the results of that search. |
| **test**    | (string: string) =&gt; boolean                                                | Returns a Boolean value that indicates whether or not a pattern exists in a searched string.                                  |
| **compile** | () =&gt; this                                                                 |                                                                                                                               |


#### RegExpExecArray

| Prop        | Type                |
| ----------- | ------------------- |
| **`index`** | <code>number</code> |
| **`input`** | <code>string</code> |


#### LoginResult

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


#### LoginOptions

| Prop           | Type                                                                                                                                                                                | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                                                                         | Provider    |
| **`options`**  | <code><a href="#facebookloginoptions">FacebookLoginOptions</a> \| <a href="#googleloginoptions">GoogleLoginOptions</a> \| <a href="#appleloginoptions">AppleLoginOptions</a></code> | Options     |


#### FacebookLoginOptions

| Prop              | Type                  | Description |
| ----------------- | --------------------- | ----------- |
| **`permissions`** | <code>string[]</code> | Permissions |


#### GoogleLoginOptions

| Prop                     | Type                  | Description                                                                                                                              | Default            | Since |
| ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| **`scopes`**             | <code>string[]</code> | Specifies the scopes required for accessing Google APIs The default is defined in the configuration.                                     |                    |       |
| **`grantOfflineAccess`** | <code>boolean</code>  | Set if your application needs to refresh access tokens when the user is not present at the browser. In response use `serverAuthCode` key | <code>false</code> | 3.1.0 |


#### AppleLoginOptions

| Prop              | Type                  | Description  |
| ----------------- | --------------------- | ------------ |
| **`scopes`**      | <code>string[]</code> | Scopes       |
| **`redirectURI`** | <code>string</code>   | Redirect URI |
| **`nonce`**       | <code>string</code>   | Nonce        |
| **`state`**       | <code>string</code>   | State        |


#### CurrentUserResponse

| Prop           | Type                                                                                                                                                                                      | Description |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **`provider`** | <code>'facebook' \| 'google' \| 'apple' \| 'twitter'</code>                                                                                                                               | Provider    |
| **`result`**   | <code><a href="#facebookloginresponse">FacebookLoginResponse</a> \| <a href="#googleloginresponse">GoogleLoginResponse</a> \| <a href="#appleloginresponse">AppleLoginResponse</a></code> | Payload     |

</docgen-api>
