/**
 * Configuration for a single OAuth2 provider instance
 */
export interface OAuth2ProviderConfig {
  /**
   * The OAuth 2.0 client identifier (App ID / Client ID)
   * @example 'your-client-id'
   */
  appId?: string;
  /**
   * Alias for `appId` to match common OAuth/OIDC naming (`clientId`).
   * If both are provided, `appId` takes precedence.
   * @example 'your-client-id'
   */
  clientId?: string;
  /**
   * OpenID Connect issuer URL (enables discovery via `/.well-known/openid-configuration`).
   * When set, you may omit explicit endpoints like `authorizationBaseUrl` and `accessTokenEndpoint`.
   *
   * @example 'https://accounts.example.com'
   */
  issuerUrl?: string;
  /**
   * The base URL of the authorization endpoint
   * @example 'https://accounts.example.com/oauth2/authorize'
   */
  authorizationBaseUrl?: string;
  /**
   * Alias for `authorizationBaseUrl` (to match common OAuth/OIDC naming).
   * @example 'https://accounts.example.com/oauth2/authorize'
   */
  authorizationEndpoint?: string;
  /**
   * The URL to exchange the authorization code for tokens
   * Required for authorization code flow
   * @example 'https://accounts.example.com/oauth2/token'
   */
  accessTokenEndpoint?: string;
  /**
   * Alias for `accessTokenEndpoint` (to match common OAuth/OIDC naming).
   * @example 'https://accounts.example.com/oauth2/token'
   */
  tokenEndpoint?: string;
  /**
   * Redirect URL that receives the OAuth callback
   * @example 'myapp://oauth/callback'
   */
  redirectUrl: string;
  /**
   * Optional URL to fetch user profile/resource data after authentication
   * The access token will be sent as Bearer token in the Authorization header
   * @example 'https://api.example.com/userinfo'
   */
  resourceUrl?: string;
  /**
   * The OAuth response type
   * - 'code': Authorization Code flow (recommended, requires accessTokenEndpoint)
   * - 'token': Implicit flow (less secure, tokens returned directly)
   * @default 'code'
   */
  responseType?: 'code' | 'token';
  /**
   * Enable PKCE (Proof Key for Code Exchange)
   * Strongly recommended for public clients (mobile/web apps)
   * @default true
   */
  pkceEnabled?: boolean;
  /**
   * Default scopes to request during authorization
   * @example 'openid profile email'
   * @example ['openid','profile','email']
   */
  scope?: string | string[];
  /**
   * Additional parameters to include in the authorization request
   * @example { prompt: 'consent', login_hint: 'user@example.com' }
   */
  additionalParameters?: Record<string, string>;
  /**
   * Convenience option for OIDC `login_hint`.
   * Equivalent to passing `additionalParameters.login_hint`.
   */
  loginHint?: string;
  /**
   * Convenience option for OAuth/OIDC `prompt`.
   * Equivalent to passing `additionalParameters.prompt`.
   */
  prompt?: string;
  /**
   * Additional parameters to include in token requests (code exchange / refresh).
   * Useful for providers that require non-standard parameters.
   */
  additionalTokenParameters?: Record<string, string>;
  /**
   * Additional headers to include when fetching the resource URL
   * @example { 'X-Custom-Header': 'value' }
   */
  additionalResourceHeaders?: Record<string, string>;
  /**
   * Custom logout URL for ending the session
   * @example 'https://accounts.example.com/logout'
   */
  logoutUrl?: string;
  /**
   * Alias for `logoutUrl` to match OIDC naming (`endSessionEndpoint`).
   * @example 'https://accounts.example.com/logout'
   */
  endSessionEndpoint?: string;
  /**
   * OIDC post logout redirect URL (sent as `post_logout_redirect_uri` when building the end-session URL).
   * @example 'myapp://logout/callback'
   */
  postLogoutRedirectUrl?: string;
  /**
   * Additional parameters to include in logout / end-session URL.
   */
  additionalLogoutParameters?: Record<string, string>;
  /**
   * iOS-only: Whether to prefer an ephemeral browser session for ASWebAuthenticationSession.
   * Defaults to true to match existing behavior in this plugin.
   */
  iosPrefersEphemeralWebBrowserSession?: boolean;
  /**
   * Alias for `iosPrefersEphemeralWebBrowserSession` (to match Capawesome OAuth naming).
   */
  iosPrefersEphemeralSession?: boolean;
  /**
   * Enable debug logging
   * @default false
   */
  logsEnabled?: boolean;
}

export interface InitializeOptions {
  /**
   * OAuth2 provider configurations.
   * Supports multiple providers by using a Record with provider IDs as keys.
   * @example
   * {
   *   github: { appId: '...', authorizationBaseUrl: 'https://github.com/login/oauth/authorize', ... },
   *   azure: { appId: '...', authorizationBaseUrl: 'https://login.microsoftonline.com/.../oauth2/v2.0/authorize', ... }
   * }
   */
  oauth2?: Record<string, OAuth2ProviderConfig>;
  twitter?: {
    /**
     * The OAuth 2.0 client identifier issued by X (Twitter) Developer Portal
     * @example 'Y2xpZW50SWQ'
     */
    clientId: string;
    /**
     * Redirect URL that is registered inside the X Developer Portal.
     * The plugin uses this URL on every platform to receive the authorization code.
     * @example 'myapp://auth/x'
     */
    redirectUrl: string;
    /**
     * Default scopes appended to every login request when no custom scopes are provided.
     * @description Defaults to the minimum required scopes for Log in with X.
     * @default ['tweet.read','users.read']
     */
    defaultScopes?: string[];
    /**
     * Force the consent screen to show on every login attempt.
     * Mirrors X's `force_login=true` flag.
     * @default false
     */
    forceLogin?: boolean;
    /**
     * Optional audience value when your application has been approved for multi-tenant access.
     */
    audience?: string;
  };
  facebook?: {
    /**
     * Facebook App ID, provided by Facebook for web, in mobile it's set in the native files
     * @description For business integrations, use your Business App ID from Facebook Developer Console.
     * Business apps can access additional permissions like Instagram API, Pages API, and business management features.
     * @see docs/facebook_business_login.md for business app setup guide
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
   * @description Select permissions to login with. Supports both consumer and business permissions.
   *
   * **Consumer Permissions:**
   * - `email` - User's email address
   * - `public_profile` - User's public profile info
   * - `user_friends` - List of friends who also use your app
   *
   * **Business Permissions** (require business app configuration and may need App Review):
   * - `instagram_basic` - Instagram Basic Display API access
   * - `instagram_manage_insights` - Instagram Insights data
   * - `instagram_manage_comments` - Manage Instagram comments
   * - `instagram_content_publish` - Publish to Instagram
   * - `pages_show_list` - List of Pages managed by user
   * - `pages_read_engagement` - Read Page engagement metrics
   * - `pages_manage_posts` - Manage Page posts
   * - `pages_messaging` - Page messaging features
   * - `business_management` - Manage business assets
   * - `catalog_management` - Manage product catalogs
   * - `ads_management` - Manage advertising accounts
   *
   * @example ['email', 'public_profile'] // Consumer permissions
   * @example ['email', 'instagram_basic', 'pages_show_list'] // Business permissions
   * @see https://developers.facebook.com/docs/permissions/reference
   * @see docs/facebook_business_login.md for complete business integration guide
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

export interface TwitterLoginOptions {
  /**
   * Additional scopes to request during login.
   * If omitted the plugin falls back to the default scopes configured during initialization.
   * @example ['tweet.read','users.read','offline.access']
   */
  scopes?: string[];
  /**
   * Provide a custom OAuth state value.
   * When not provided the plugin generates a cryptographically random value.
   */
  state?: string;
  /**
   * Provide a pre-computed PKCE code verifier (mostly used for testing).
   * When omitted the plugin generates a secure verifier automatically.
   */
  codeVerifier?: string;
  /**
   * Override the redirect URI for a single login call.
   * Useful when the same app supports multiple callback URLs per platform.
   */
  redirectUrl?: string;
  /**
   * Force the consent screen on every attempt, maps to `force_login=true`.
   */
  forceLogin?: boolean;
}

export interface OAuth2LoginOptions {
  /**
   * The provider ID as configured in initialize()
   * This is required to identify which OAuth2 provider to use
   * @example 'github', 'azure', 'keycloak'
   */
  providerId: string;
  /**
   * Override the scopes for this login request
   * If not provided, uses the scopes from initialization
   */
  scope?: string;
  /**
   * Custom state parameter for CSRF protection
   * If not provided, a random value is generated
   */
  state?: string;
  /**
   * Override PKCE code verifier (for testing purposes)
   * If not provided, a secure random verifier is generated
   */
  codeVerifier?: string;
  /**
   * Override redirect URL for this login request
   */
  redirectUrl?: string;
  /**
   * Additional parameters to add to the authorization URL
   */
  additionalParameters?: Record<string, string>;
  /**
   * Convenience option for OIDC `login_hint`.
   * Equivalent to passing `additionalParameters.login_hint`.
   */
  loginHint?: string;
  /**
   * Convenience option for OAuth/OIDC `prompt`.
   * Equivalent to passing `additionalParameters.prompt`.
   */
  prompt?: string;
  /**
   * Web-only: Use a full-page redirect instead of a popup window.
   * When using `redirect`, the promise returned by `login()` will not resolve because the page navigates away.
   * Call `handleRedirectCallback()` after the redirect to complete the flow.
   *
   * @default 'popup'
   */
  flow?: 'popup' | 'redirect';
}

export interface OAuth2LoginResponse {
  /**
   * The provider ID that was used for this login
   */
  providerId: string;
  /**
   * The access token received from the OAuth provider
   */
  accessToken: AccessToken | null;
  /**
   * The ID token (JWT) if provided by the OAuth server (e.g., OpenID Connect)
   */
  idToken: string | null;
  /**
   * The refresh token if provided (requires appropriate scope like offline_access)
   */
  refreshToken: string | null;
  /**
   * Resource data fetched from resourceUrl if configured
   * Contains the raw JSON response from the resource endpoint
   */
  resourceData: Record<string, unknown> | null;
  /**
   * The scopes that were granted
   */
  scope: string[];
  /**
   * Token type (usually 'bearer')
   */
  tokenType: string;
  /**
   * Token expiration time in seconds
   */
  expiresIn: number | null;
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
   * @note On Android, the OS caches access tokens, and if a token is invalid (e.g., user revoked app access), the plugin might return an invalid accessToken. Using getAuthorizationCode() is recommended to ensure the token is valid.
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
    }
  | {
      provider: 'twitter';
      options: TwitterLoginOptions;
    }
  | {
      provider: 'oauth2';
      options: OAuth2LoginOptions;
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
    }
  | {
      provider: 'twitter';
      result: TwitterLoginResponse;
    }
  | {
      provider: 'oauth2';
      result: OAuth2LoginResponse;
    };

export interface AccessToken {
  applicationId?: string;
  declinedPermissions?: string[];
  expires?: string;
  isExpired?: boolean;
  lastRefresh?: string;
  permissions?: string[];
  token: string;
  tokenType?: string;
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

export interface TwitterProfile {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  email?: string | null;
}

export interface TwitterLoginResponse {
  accessToken: AccessToken | null;
  refreshToken?: string | null;
  scope: string[];
  tokenType: 'bearer';
  expiresIn?: number | null;
  profile: TwitterProfile;
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
  provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2';
  /**
   * Provider ID for OAuth2 providers (required when provider is 'oauth2')
   * @description The ID used when configuring the OAuth2 provider in initialize()
   */
  providerId?: string;
}

export interface isLoggedInOptions {
  /**
   * Provider
   * @description Provider for the isLoggedIn
   */
  provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2';
  /**
   * Provider ID for OAuth2 providers (required when provider is 'oauth2')
   * @description The ID used when configuring the OAuth2 provider in initialize()
   */
  providerId?: string;
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

export interface OpenSecureWindowOptions {
  /**
   * The endpoint to open
   */
  authEndpoint: string;
  /**
   * The redirect URI to use for the openSecureWindow call.
   * This will be checked to make sure it matches the redirect URI after the window finishes the redirection.
   */
  redirectUri: string;
  /**
   * The name of the broadcast channel to listen to, relevant only for web
   */
  broadcastChannelName?: string;
}

export interface OpenSecureWindowResponse {
  /**
   * The result of the openSecureWindow call
   */
  redirectedUri: string;
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
  twitter: TwitterLoginResponse;
  oauth2: OAuth2LoginResponse;
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
  logout(options: {
    provider: 'apple' | 'google' | 'facebook' | 'twitter' | 'oauth2';
    providerId?: string;
  }): Promise<void>;
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
   *
   * **Google Offline Mode Limitation:**
   * This method is NOT supported when Google is initialized with `mode: 'offline'`.
   * It will reject with error: "refresh is not implemented when using offline mode"
   *
   * @throws Error if Google provider is in offline mode
   */
  refresh(options: LoginOptions): Promise<void>;

  /**
   * OAuth-style refresh token helper (feature parity with Capawesome OAuth).
   * Currently implemented for the built-in `oauth2` provider.
   *
   * If `refreshToken` is omitted, the plugin will attempt to use the stored refresh token (if available).
   */
  refreshToken(options: {
    provider: 'oauth2';
    providerId: string;
    refreshToken?: string;
    additionalParameters?: Record<string, string>;
  }): Promise<OAuth2LoginResponse>;

  /**
   * Web-only: handle the OAuth redirect callback and return the parsed result.
   * Use this when you use a redirect-based flow instead of popups.
   */
  handleRedirectCallback(): Promise<LoginResult | null>;

  /**
   * Decode a JWT (typically an OIDC ID token) into its claims.
   */
  decodeIdToken(options: { idToken: string }): Promise<{ claims: Record<string, any> }>;

  /**
   * Get the access token expiration date for an OAuth2 provider.
   */
  getAccessTokenExpirationDate(options: {
    provider: 'oauth2';
    providerId: string;
  }): Promise<{ expirationDate: string | null }>;

  /**
   * Check if an access token is available for an OAuth2 provider.
   */
  isAccessTokenAvailable(options: { provider: 'oauth2'; providerId: string }): Promise<{ isAvailable: boolean }>;

  /**
   * Check if an access token is expired for an OAuth2 provider.
   */
  isAccessTokenExpired(options: { provider: 'oauth2'; providerId: string }): Promise<{ isExpired: boolean }>;

  /**
   * Check if a refresh token is available for an OAuth2 provider.
   */
  isRefreshTokenAvailable(options: { provider: 'oauth2'; providerId: string }): Promise<{ isAvailable: boolean }>;

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

  /**
   * Opens a secured window for OAuth2 authentication.
   * For web, you should have the code in the redirected page to use a broadcast channel to send the redirected url to the app
   * Something like:
   * ```html
   * <html>
   * <head></head>
   * <body>
   * <script>
   *   const searchParams = new URLSearchParams(location.search)
   *   if (searchParams.has("code")) {
   *     new BroadcastChannel("my-channel-name").postMessage(location.href);
   *     window.close();
   *   }
   * </script>
   * </body>
   * </html>
   * ```
   * For mobile, you should have a redirect uri that opens the app, something like: `myapp://oauth_callback/`
   * And make sure to register it in the app's info.plist:
   * ```xml
   * <key>CFBundleURLTypes</key>
   * <array>
   *    <dict>
   *       <key>CFBundleURLSchemes</key>
   *       <array>
   *          <string>myapp</string>
   *       </array>
   *    </dict>
   * </array>
   * ```
   * And in the AndroidManifest.xml file:
   * ```xml
   * <activity>
   *    <intent-filter>
   *       <action android:name="android.intent.action.VIEW" />
   *       <category android:name="android.intent.category.DEFAULT" />
   *       <category android:name="android.intent.category.BROWSABLE" />
   *       <data android:host="oauth_callback" android:scheme="myapp" />
   *    </intent-filter>
   * </activity>
   * ```
   * @param options - the options for the openSecureWindow call
   */
  openSecureWindow(options: OpenSecureWindowOptions): Promise<OpenSecureWindowResponse>;
}
