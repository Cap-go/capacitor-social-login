import { WebPlugin } from "@capacitor/core";

import type {
  SocialLoginPlugin,
  InitializeOptions,
  LoginOptions,
  LoginResult,
  AuthorizationCode,
  GoogleLoginResponse,
  AppleProviderResponse,
  isLoggedInOptions,
  AuthorizationCodeOptions,
  FacebookLoginOptions,
  FacebookLoginResponse,
} from "./definitions";

// Add this declaration at the top of the file
declare const google: {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: any) => void;
        auto_select?: boolean;
      }): void;
      prompt(callback: (notification: any) => void): void;
    };
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        callback: (response: any) => void;
        auto_select?: boolean;
        scope: string;
      }): {
        requestAccessToken(): void;
      };
    };
  };
};

declare const AppleID: any;

declare const FB: {
  init(options: any): void;
  login(
    callback: (response: {
      status: string;
      authResponse: { accessToken: string; userID: string };
    }) => void,
    options?: { scope: string },
  ): void;
  logout(callback: () => void): void;
  api(
    path: string,
    params: { fields: string },
    callback: (response: any) => void,
  ): void;
  getLoginStatus(
    callback: (response: {
      status: string;
      authResponse?: { accessToken: string };
    }) => void,
  ): void;
};

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private googleClientId: string | null = null;
  private appleClientId: string | null = null;
  private googleScriptLoaded = false;
  private appleScriptLoaded = false;
  private appleScriptUrl =
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
  private facebookAppId: string | null = null;
  private facebookScriptLoaded = false;

  async initialize(options: InitializeOptions): Promise<void> {
    if (options.google?.webClientId) {
      this.googleClientId = options.google.webClientId;
      await this.loadGoogleScript();
    }
    if (options.apple?.clientId) {
      this.appleClientId = options.apple.clientId;
      await this.loadAppleScript();
    }
    if (options.facebook?.appId) {
      this.facebookAppId = options.facebook.appId;
      await this.loadFacebookScript();
      FB.init({
        appId: this.facebookAppId,
        version: "v17.0",
        xfbml: true,
        cookie: true,
      });
    }
    // Implement initialization for other providers if needed
  }

  async login(options: LoginOptions): Promise<LoginResult> {
    if (options.provider === "google") {
      return this.loginWithGoogle(options.options);
    } else if (options.provider === "apple") {
      return this.loginWithApple(options.options);
    } else if (options.provider === "facebook") {
      return this.loginWithFacebook(options.options as FacebookLoginOptions);
    }
    // Implement login for other providers
    throw new Error(`Login for ${options.provider} is not implemented on web`);
  }

  async logout(options: {
    provider: "apple" | "google" | "facebook";
  }): Promise<void> {
    switch (options.provider) {
      case "google":
        // Google doesn't have a specific logout method for web
        // We can revoke the token if we have it stored
        console.log(
          "Google logout: Token should be revoked on the client side if stored",
        );
        break;
      case "apple":
        // Apple doesn't provide a logout method for web
        console.log(
          "Apple logout: Session should be managed on the client side",
        );
        break;
      case "facebook":
        return new Promise<void>((resolve) => {
          FB.logout(() => resolve());
        });
      default:
        throw new Error(`Logout for ${options.provider} is not implemented`);
    }
  }

  async isLoggedIn(
    options: isLoggedInOptions,
  ): Promise<{ isLoggedIn: boolean }> {
    switch (options.provider) {
      case "google":
        // For Google, we can check if there's a valid token
        // eslint-disable-next-line no-case-declarations
        const googleUser = await this.getGoogleUser();
        return { isLoggedIn: !!googleUser };
      case "apple":
        // Apple doesn't provide a method to check login status on web
        console.log("Apple login status should be managed on the client side");
        return { isLoggedIn: false };
      case "facebook":
        return new Promise((resolve) => {
          FB.getLoginStatus((response) => {
            resolve({ isLoggedIn: response.status === "connected" });
          });
        });
      default:
        throw new Error(
          `isLoggedIn for ${options.provider} is not implemented`,
        );
    }
  }

  async getAuthorizationCode(
    options: AuthorizationCodeOptions,
  ): Promise<AuthorizationCode> {
    switch (options.provider) {
      case "google":
        // For Google, we can use the id_token as the authorization code
        // eslint-disable-next-line no-case-declarations
        const googleUser = await this.getGoogleUser();
        if (googleUser?.credential) {
          return { jwt: googleUser.credential };
        }
        throw new Error("No Google authorization code available");
      case "apple":
        // Apple authorization code should be obtained during login
        console.log("Apple authorization code should be stored during login");
        throw new Error("Apple authorization code not available");
      case "facebook":
        return new Promise((resolve, reject) => {
          FB.getLoginStatus((response) => {
            if (response.status === "connected") {
              resolve({ jwt: response.authResponse?.accessToken || "" });
            } else {
              reject(new Error("No Facebook authorization code available"));
            }
          });
        });
      default:
        throw new Error(
          `getAuthorizationCode for ${options.provider} is not implemented`,
        );
    }
  }

  async refresh(options: LoginOptions): Promise<void> {
    switch (options.provider) {
      case "google":
        // For Google, we can prompt for re-authentication
        await this.loginWithGoogle(options.options);
        break;
      case "apple":
        // Apple doesn't provide a refresh method for web
        console.log("Apple refresh not available on web");
        break;
      case "facebook":
        await this.loginWithFacebook(options.options as FacebookLoginOptions);
        break;
      default:
        throw new Error(`Refresh for ${options.provider} is not implemented`);
    }
  }

  private async loginWithGoogle(options: any): Promise<LoginResult> {
    if (!this.googleClientId) {
      throw new Error("Google Client ID not set. Call initialize() first.");
    }

    const scopes = options.scopes || ["email", "profile"];

    if (scopes.length > 0) {
      // If scopes are provided, directly use the traditional OAuth flow
      return this.fallbackToTraditionalOAuth(scopes);
    }

    return new Promise((resolve, reject) => {
      google.accounts.id.initialize({
        client_id: this.googleClientId!,
        callback: (response) => {
          console.log("google.accounts.id.initialize callback", response);
          if (response.error) {
            reject(response.error);
          } else {
            const payload = this.parseJwt(response.credential);
            const result: GoogleLoginResponse = {
              accessToken: null,
              idToken: response.credential,
              profile: {
                email: payload.email || null,
                familyName: payload.family_name || null,
                givenName: payload.given_name || null,
                id: payload.sub || null,
                name: payload.name || null,
                imageUrl: payload.picture || null,
              },
            };
            resolve({ provider: "google", result });
          }
        },
        auto_select: true,
      });

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("OneTap is not displayed or skipped");
          // Fallback to traditional OAuth if One Tap is not available
          this.fallbackToTraditionalOAuth(scopes).then(resolve).catch(reject);
        } else {
          console.log("OneTap is displayed");
        }
      });
    });
  }

  private parseJwt(token: string) {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(jsonPayload);
  }

  private async loadGoogleScript(): Promise<void> {
    if (this.googleScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        this.googleScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private async loginWithApple(options: any): Promise<LoginResult> {
    if (!this.appleClientId) {
      throw new Error("Apple Client ID not set. Call initialize() first.");
    }

    if (!this.appleScriptLoaded) {
      throw new Error("Apple Sign-In script not loaded.");
    }

    return new Promise((resolve, reject) => {
      AppleID.auth.init({
        clientId: this.appleClientId!,
        scope: options.scopes?.join(" ") || "name email",
        redirectURI: options.redirectUrl || window.location.href,
        state: options.state,
        nonce: options.nonce,
        usePopup: true,
      });

      AppleID.auth
        .signIn()
        .then((res: any) => {
          const result: AppleProviderResponse = {
            profile: {
              user: res.user?.name?.firstName
                ? `${res.user.name.firstName} ${res.user.name.lastName}`
                : "",
              email: res.user?.email || null,
              givenName: res.user?.name?.firstName || null,
              familyName: res.user?.name?.lastName || null,
            },
            accessToken: {
              token: res.authorization.code, // TODO: to fix and find the correct token
            },
            idToken: res.authorization.id_token || null,
          };
          resolve({ provider: "apple", result });
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private async loadAppleScript(): Promise<void> {
    if (this.appleScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = this.appleScriptUrl;
      script.async = true;
      script.onload = () => {
        this.appleScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private async getGoogleUser(): Promise<any> {
    return new Promise((resolve) => {
      google.accounts.id.initialize({
        client_id: this.googleClientId!,
        callback: (response) => {
          resolve(response);
        },
      });
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          resolve(null);
        }
      });
    });
  }

  private async loadFacebookScript(): Promise<void> {
    if (this.facebookScriptLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.facebookScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private async loginWithFacebook(
    options: FacebookLoginOptions,
  ): Promise<LoginResult> {
    if (!this.facebookAppId) {
      throw new Error("Facebook App ID not set. Call initialize() first.");
    }

    return new Promise((resolve, reject) => {
      FB.login(
        (response) => {
          if (response.status === "connected") {
            FB.api(
              "/me",
              { fields: "id,name,email,picture" },
              (userInfo: any) => {
                const result: FacebookLoginResponse = {
                  accessToken: {
                    token: response.authResponse.accessToken,
                    userId: response.authResponse.userID,
                  },
                  profile: {
                    userID: userInfo.id,
                    name: userInfo.name,
                    email: userInfo.email || null,
                    imageURL: userInfo.picture?.data?.url || null,
                    friendIDs: [],
                    birthday: null,
                    ageRange: null,
                    gender: null,
                    location: null,
                    hometown: null,
                    profileURL: null,
                  },
                  idToken: null,
                };
                resolve({ provider: "facebook", result });
              },
            );
          } else {
            reject(new Error("Facebook login failed"));
          }
        },
        { scope: options.permissions.join(",") },
      );
    });
  }

  private async fallbackToTraditionalOAuth(
    scopes: string[],
  ): Promise<LoginResult> {
    return new Promise((resolve, reject) => {
      const uniqueScopes = [...new Set([...scopes, 'openid'])];
      const auth2 = google.accounts.oauth2.initTokenClient({
        client_id: this.googleClientId!,
        scope: uniqueScopes.join(" "),
        callback: async (response) => {
          if (response.error) {
            reject(response.error);
          } else {
            // Get ID token from userinfo endpoint
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                'Authorization': `Bearer ${response.access_token}`
              }
            });
            const userData = await userInfoResponse.json();

            const result: GoogleLoginResponse = {
              accessToken: {
                token: response.access_token,
              },
              idToken: userData.sub, // Using sub as ID token
              profile: {
                email: userData.email || null,
                familyName: userData.family_name || null,
                givenName: userData.given_name || null,
                id: userData.sub || null,
                name: userData.name || null,
                imageUrl: userData.picture || null,
              },
            };
            resolve({ provider: "google", result });
          }
        },
      });
      auth2.requestAccessToken();
    });
  }
}
