export interface InitializeOptions {
  facebook?: {
    /**
     * Facebook App ID, provided by Facebook for web, in mobile it's set in the native files
     */
    appId: string;
    /**
     * Facebook Client Token, provided by Facebook for web, in mobile it's set in the native files
     */
    clientToken?: string;
    /**
     * Locale
     * @description The locale to use for the Facebook SDK (e.g., 'en_US', 'fr_FR', 'es_ES')
     * @default 'en_US'
     * @example 'fr_FR'
     */
    locale?: string;
  };

  google?: {
    /**
     * The app's client ID, found and created in the Google Developers Console.
     * Required for iOS platform.
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    iOSClientId?: string;
    /**
     * The app's server client ID, required for offline mode on iOS.
     * Should be the same value as webClientId.
     * Found and created in the Google Developers Console.
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    iOSServerClientId?: string;
    /**
     * The app's web client ID, found and created in the Google Developers Console.
     * Required for Android and Web platforms.
     * @example xxxxxx-xxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
     * @since 3.1.0
     */
    webClientId?: string;
    /**
     * The login mode, can be online or offline.
     *
     * **Online mode (default):**
     * - Returns user profile data and access tokens
     * - Supports all methods: login, logout, isLoggedIn, getAuthorizationCode
     *
     * **Offline mode:**
     * - Returns only serverAuthCode for backend authentication
     * - No user profile data available
     * - **Limitations:** The following methods are NOT supported in offline mode:
     *   - `logout()` - Will reject with "not implemented when using offline mode"
     *   - `isLoggedIn()` - Will reject with "not implemented when using offline mode"
     *   - `getAuthorizationCode()` - Will reject with "not implemented when using offline mode"
     * - Only `login()` method works in offline mode, returning serverAuthCode only
     * - Requires `iOSServerClientId` to be set on iOS
     *
     * @example 'offline'
     * @default 'online'
     * @since 3.1.0
     */
    mode?: 'online' | 'offline';
    /**
     * Filter visible accounts by hosted domain
     * @description filter visible accounts by hosted domain
     */
    hostedDomain?: string;
    /**
     * Google Redirect URL, should be your backend url that is configured in your google app
     */
    redirectUrl?: string;
  };
  apple?: {
    /**
     * Apple Client ID, provided by Apple for web and Android
     */
    clientId?: string;
    /**
     * Apple Redirect URL, should be your backend url that is configured in your apple app
     *
     * **Note**: Use empty string `''` for iOS to prevent redirect.
     * **Note**: Not required when using Broadcast Channel mode on Android.
     */
    redirectUrl?: string;
    /**
     * Use proper token exchange for Apple Sign-In
     * @description Controls how Apple Sign-In tokens are handled and what gets returned:
     *
     * **When `true` (Recommended for new implementations):**
     * - Exchanges authorization code for proper access tokens via Apple's token endpoint
     * - `idToken`: JWT containing user identity information (email, name, user ID)
     * - `accessToken.token`: Proper access token from Apple (short-lived, ~1 hour)
     * - `authorizationCode`: Raw authorization code for backend token exchange
     *
     * **When `false` (Default - Legacy mode):**
     * - Uses authorization code directly as access token for backward compatibility
     * - `idToken`: JWT containing user identity information (email, name, user ID)
     * - `accessToken.token`: The authorization code itself (not a real access token)
     * - `authorizationCode`: undefined
     *
     * @default false
     * @example
     * // Enable proper token exchange (recommended)
     * useProperTokenExchange: true
     * // Result: idToken=JWT, accessToken=real_token, authorizationCode=present
     *
     * // Legacy mode (backward compatibility)
     * useProperTokenExchange: false
     * // Result: idToken=JWT, accessToken=auth_code, authorizationCode=undefined
     */
    useProperTokenExchange?: boolean;
    /**
     * Use Broadcast Channel for Android Apple Sign-In (Recommended)
     * @description When enabled, Android uses Broadcast Channel API instead of URL redirects.
     * This eliminates the need for redirect URL configuration and server-side setup.
     *
     * **Benefits:**
     * - No redirect URL configuration required
     * - No backend server needed for Android
     * - Simpler setup and more reliable communication
     * - Direct client-server communication via Broadcast Channel
     *
     * **When `true`:**
     * - Uses Broadcast Channel for authentication flow
     * - `redirectUrl` is ignored
     * - Requires Broadcast Channel compatible backend or direct token handling
     *
     * **When `false` (Default - Legacy mode):**
     * - Uses traditional URL redirect flow
     * - Requires `redirectUrl` configuration
     * - Requires backend server for token exchange
     *
     * @default false
     * @since 7.10.0
     * @example
     * // Enable Broadcast Channel mode (recommended for new Android implementations)
     * useBroadcastChannel: true
     * // Result: Simplified setup, no redirect URL needed
     *
     * // Legacy mode (backward compatibility)
     * useBroadcastChannel: false
     * // Result: Traditional URL redirect flow with server-side setup
     */
    useBroadcastChannel?: boolean;
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
   * @description use limited login for Facebook iOS only. Important: This is iOS-only and doesn't affect Android.
   * Even if set to false, Facebook will automatically force it to true if App Tracking Transparency (ATT) permission is not granted.
   * Developers should always be prepared to handle both limited and full login scenarios.
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
   * Force refresh token (only for Android)
   * @description force refresh token
   * @default false
   */
  forceRefreshToken?: boolean;
  /**
   * Force account selection prompt (iOS)
   * @description forces the account selection prompt to appear on iOS
   * @default false
   */
  forcePrompt?: boolean;
  /**
   * Style
   * @description style
   * @default 'standard'
   */
  style?: 'bottom' | 'standard';
  /**
   * Filter by authorized accounts (Android only)
   * @description Only show accounts that have previously been used to sign in to the app.
   * This option is only available for the 'bottom' style.
   * Note: For Family Link supervised accounts, this should be set to false.
   * @default true
   */
  filterByAuthorizedAccounts?: boolean;
  /**
   * Auto select enabled (Android only)
   * @description Automatically select the account if only one Google account is available.
   * This option is only available for the 'bottom' style.
   * @default false
   */
  autoSelectEnabled?: boolean;
  /**
   * Prompt parameter for Google OAuth (Web only)
   * @description A space-delimited, case-sensitive list of prompts to present the user.
   * If you don't specify this parameter, the user will be prompted only the first time your project requests access.
   *
   * **Possible values:**
   * - `none`: Don't display any authentication or consent screens. Must not be specified with other values.
   * - `consent`: Prompt the user for consent.
   * - `select_account`: Prompt the user to select an account.
   *
   * **Examples:**
   * - `prompt: 'consent'` - Always show consent screen
   * - `prompt: 'select_account'` - Always show account selection
   * - `prompt: 'consent select_account'` - Show both consent and account selection
   *
   * **Note:** This parameter only affects web platform behavior. Mobile platforms use their own native prompts.
   *
   * @example 'consent'
   * @example 'select_account'
   * @example 'consent select_account'
   * @see [Google OAuth2 Prompt Parameter](https://developers.google.com/identity/protocols/oauth2/openid-connect#prompt)
   * @since 7.12.0
   */
  prompt?: 'none' | 'consent' | 'select_account' | 'consent select_account' | 'select_account consent';
}

export interface GoogleLoginResponseOnline {
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
  responseType: 'online';
}

export interface GoogleLoginResponseOffline {
  serverAuthCode: string;
  responseType: 'offline';
}

export type GoogleLoginResponse = GoogleLoginResponseOnline | GoogleLoginResponseOffline;

export interface AppleProviderOptions {
  /**
   * Scopes
   * @description An array of scopes to request during login
   * @example ["name", "email"]
   * default: ["name", "email"]
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
  /**
   * Use Broadcast Channel for authentication flow
   * @description When enabled, uses Broadcast Channel API for communication instead of URL redirects.
   * Only applicable on platforms that support Broadcast Channel (Android).
   * @default false
   */
  useBroadcastChannel?: boolean;
}

export interface AppleProviderResponse {
  /**
   * Access token from Apple
   * @description Content depends on `useProperTokenExchange` setting:
   * - When `useProperTokenExchange: true`: Real access token from Apple (~1 hour validity)
   * - When `useProperTokenExchange: false`: Contains authorization code as token (legacy mode)
   * Use `idToken` for user authentication, `accessToken` for API calls when properly exchanged.
   */
  accessToken: AccessToken | null;

  /**
   * Identity token (JWT) from Apple
   * @description Always contains the JWT with user identity information including:
   * - User ID (sub claim)
   * - Email (if user granted permission)
   * - Name components (if user granted permission)
   * - Email verification status
   * This is the primary token for user authentication and should be verified on your backend.
   */
  idToken: string | null;

  /**
   * User profile information
   * @description Basic user profile data extracted from the identity token and Apple response:
   * - `user`: Apple's user identifier (sub claim from idToken)
   * - `email`: User's email address (if permission granted)
   * - `givenName`: User's first name (if permission granted)
   * - `familyName`: User's last name (if permission granted)
   */
  profile: {
    user: string;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
  };

  /**
   * Authorization code for proper token exchange (when useProperTokenExchange is enabled)
   * @description Only present when `useProperTokenExchange` is `true`. This code should be exchanged
   * for proper access tokens on your backend using Apple's token endpoint. Use this for secure
   * server-side token validation and to obtain refresh tokens.
   * @see https://developer.apple.com/documentation/sign_in_with_apple/tokenresponse
   */
  authorizationCode?: string;
}

export type LoginOptions =
  | {
      provider: 'facebook';
      options: FacebookLoginOptions;
    }
  | {
      provider: 'google';
      options: GoogleLoginOptions;
    }
  | {
      provider: 'apple';
      options: AppleProviderOptions;
    };

export type LoginResult =
  | {
      provider: 'facebook';
      result: FacebookLoginResponse;
    }
  | {
      provider: 'google';
      result: GoogleLoginResponse;
    }
  | {
      provider: 'apple';
      result: AppleProviderResponse;
    };

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
}

export interface AuthorizationCode {
  /**
   * Jwt
   * @description A JSON web token
   */
  jwt?: string;
  /**
   * Access Token
   * @description An access token
   */
  accessToken?: string;
}

export interface AuthorizationCodeOptions {
  /**
   * Provider
   * @description Provider for the authorization code
   */
  provider: 'apple' | 'google' | 'facebook';
}

export interface isLoggedInOptions {
  /**
   * Provider
   * @description Provider for the isLoggedIn
   */
  provider: 'apple' | 'google' | 'facebook';
}

// Define the provider-specific call types
export type ProviderSpecificCall = 'facebook#getProfile' | 'facebook#requestTracking';

// Define the options and response types for each specific call
export interface FacebookGetProfileOptions {
  /**
   * Fields to retrieve from Facebook profile
   * @example ["id", "name", "email", "picture"]
   */
  fields?: string[];
}

export interface FacebookGetProfileResponse {
  /**
   * Facebook profile data
   */
  profile: {
    id: string | null;
    name: string | null;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    picture?: {
      data: {
        height: number | null;
        is_silhouette: boolean | null;
        url: string | null;
        width: number | null;
      };
    } | null;
    [key: string]: any; // For additional fields that might be requested
  };
}

export type FacebookRequestTrackingOptions = Record<string, never>;

export interface FacebookRequestTrackingResponse {
  /**
   * App tracking authorization status
   */
  status: 'authorized' | 'denied' | 'notDetermined' | 'restricted';
}

// Map call strings to their options and response types
export type ProviderSpecificCallOptionsMap = {
  'facebook#getProfile': FacebookGetProfileOptions;
  'facebook#requestTracking': FacebookRequestTrackingOptions;
};

export type ProviderSpecificCallResponseMap = {
  'facebook#getProfile': FacebookGetProfileResponse;
  'facebook#requestTracking': FacebookRequestTrackingResponse;
};

// Add a helper type to map providers to their response types
export type ProviderResponseMap = {
  facebook: FacebookLoginResponse;
  google: GoogleLoginResponse;
  apple: AppleProviderResponse;
};

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
  login<T extends LoginOptions['provider']>(
    options: Extract<LoginOptions, { provider: T }>,
  ): Promise<{ provider: T; result: ProviderResponseMap[T] }>;
  /**
   * Logout
   * @description Logout the user from the specified provider
   *
   * **Google Offline Mode Limitation:**
   * This method is NOT supported when Google is initialized with `mode: 'offline'`.
   * It will reject with error: "logout is not implemented when using offline mode"
   *
   * @throws Error if Google provider is in offline mode
   */
  logout(options: { provider: 'apple' | 'google' | 'facebook' }): Promise<void>;
  /**
   * IsLoggedIn
   * @description Check if the user is currently logged in with the specified provider
   *
   * **Google Offline Mode Limitation:**
   * This method is NOT supported when Google is initialized with `mode: 'offline'`.
   * It will reject with error: "isLoggedIn is not implemented when using offline mode"
   *
   * @throws Error if Google provider is in offline mode
   */
  isLoggedIn(options: isLoggedInOptions): Promise<{ isLoggedIn: boolean }>;

  /**
   * Get the current authorization code
   * @description Get the authorization code for server-side authentication
   *
   * **Google Offline Mode Limitation:**
   * This method is NOT supported when Google is initialized with `mode: 'offline'`.
   * It will reject with error: "getAuthorizationCode is not implemented when using offline mode"
   *
   * In offline mode, the authorization code (serverAuthCode) is already returned by the `login()` method.
   *
   * @throws Error if Google provider is in offline mode
   */
  getAuthorizationCode(options: AuthorizationCodeOptions): Promise<AuthorizationCode>;
  /**
   * Refresh the access token
   * @description refresh the access token
   */
  refresh(options: LoginOptions): Promise<void>;

  /**
   * Execute provider-specific calls
   * @description Execute a provider-specific functionality
   */
  providerSpecificCall<T extends ProviderSpecificCall>(options: {
    call: T;
    options: ProviderSpecificCallOptionsMap[T];
  }): Promise<ProviderSpecificCallResponseMap[T]>;

  /**
   * Get the native Capacitor plugin version
   *
   * @returns {Promise<{ id: string }>} an Promise with version for this device
   * @throws An error if the something went wrong
   */
  getPluginVersion(): Promise<{ version: string }>;
}
