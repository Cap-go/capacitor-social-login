export interface InitializeOptions {
  facebook?: {
    /**
     * Facebook App ID, provided by Facebook for web, in mobile it's set in the native files
     */
    appId: string;
    /**
     * Facebook Client Token, provided by Facebook for web, in mobile it's set in the native files
     */
    clientToken: string;
  };

  google?: {
    /**
     * The app's client ID, found and created in the Google Developers Console.
     * For iOS.
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    iOSClientId?: string;
    /**
     * The app's server client ID, found and created in the Google Developers Console.
     * For iOS.
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    iOSServerClientId?: string;
    /**
     * The app's web client ID, found and created in the Google Developers Console.
     * For Android (and web in the future).
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    webClientId?: string;
  };
  apple?: {
    /**
     * Apple Client ID, provided by Apple for web and Android
     */
    clientId?: string;
    /**
     * Apple Redirect URL, should be your backend url that is configured in your apple app, only for android
     */
    redirectUrl?: string;
  };
}

export interface FacebookLoginOptions {
  /**
   * Permissions
   * @description select permissions to login with
   */
  permissions: string[];
  /**
   * Is Limited Login
   * @description use limited login for Facebook IOS
   * @default false
   */
  limitedLogin?: boolean;
  /**
   * Nonce
   * @description A custom nonce to use for the login request
   */
  nonce?: string;
}

export interface GoogleLoginOptions {
  /**
   * Specifies the scopes required for accessing Google APIs
   * The default is defined in the configuration.
   * @example ["profile", "email"]
   * @see [Google OAuth2 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
   */
  scopes?: string[];
  /**
   * Nonce
   * @description nonce
   */
  nonce?: string;
  /**
   * Set if your application needs to refresh access tokens when the user is not present at the browser.
   * In response use `serverAuthCode` key
   *
   * @default false
   * @since 3.1.0
   * */
  grantOfflineAccess?: boolean;
}

export interface GoogleLoginResponse {
  accessToken: AccessToken | null;
  idToken: string | null;
  profile: {
    email: string | null;
    familyName: string | null;
    givenName: string | null;
    id: string | null;
    name: string | null;
    imageUrl: string | null;
  };
}

export interface AppleProviderOptions {
  /**
   * Scopes
   * @description select scopes to login with
   */
  scopes?: string[];
  /**
   * Nonce
   * @description nonce
   */
  nonce?: string;
  /**
   * State
   * @description state
   */
  state?: string;
}

export interface AppleProviderResponse {
  accessToken: AccessToken | null;
  profile: {
    user: string;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
  };
  idToken: string | null;
  authorizationCode: string | null;
}

export interface LoginOptions {
  /**
   * Provider
   * @description select provider to login with
   */
  provider: "facebook" | "google" | "apple" | "twitter";
  /**
   * Options
   * @description payload to login with
   */
  options: FacebookLoginOptions | GoogleLoginOptions | AppleProviderOptions;
}

export interface LoginResult {
  /**
   * Provider
   * @description select provider to login with
   */
  provider: "facebook" | "google" | "apple" | "twitter";
  /**
   * Payload
   * @description payload to login with
   */
  result: FacebookLoginResponse | GoogleLoginResponse | AppleProviderResponse;
}

export interface AccessToken {
  applicationId?: string;
  declinedPermissions?: string[];
  expires?: string;
  isExpired?: boolean;
  lastRefresh?: string;
  permissions?: string[];
  token: string;
  refreshToken?: string;
  userId?: string;
}

export interface FacebookLoginResponse {
  accessToken: AccessToken | null;
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
  authenticationToken: string | null;
}

export interface AuthorizationCode {
  /**
   * Jwt
   * @description A JSON web token
   */
  jwt: string;
}

export interface AuthorizationCodeOptions {
  /**
   * Provider
   * @description Provider for the authorization code
   */
  provider: "apple" | "google" | "facebook";
}

export interface isLoggedInOptions {
  /**
   * Provider
   * @description Provider for the isLoggedIn
   */
  provider: "apple" | "google" | "facebook";
}

export interface SocialLoginPlugin {
  /**
   * Initialize the plugin
   * @description initialize the plugin with the required options
   */
  initialize(options: InitializeOptions): Promise<void>;
  /**
   * Login with the selected provider
   * @description login with the selected provider
   */
  login(options: LoginOptions): Promise<LoginResult>;
  /**
   * Logout
   * @description logout the user
   */
  logout(options: { provider: "apple" | "google" | "facebook" }): Promise<void>;
  /**
   * IsLoggedIn
   * @description logout the user
   */
  isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }>;

  /**
   * Get the current access token
   * @description get the current access token
   */
  getAuthorizationCode(
    options: AuthorizationCodeOptions,
  ): Promise<AuthorizationCode>;
  /**
   * Refresh the access token
   * @description refresh the access token
   */
  refresh(options: LoginOptions): Promise<void>;
}
