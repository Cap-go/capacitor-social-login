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
} from "./definitions";

// Add this declaration at the top of the file
declare const google: {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: any) => void;
      }): void;
      prompt(callback: (notification: any) => void): void;
    };
  };
};

declare const AppleID: any;

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  private googleClientId: string | null = null;
  private appleClientId: string | null = null;
  private googleScriptLoaded = false;
  private appleScriptLoaded = false;
  private appleScriptUrl =
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

  async initialize(options: InitializeOptions): Promise<void> {
    if (options.google?.webClientId) {
      this.googleClientId = options.google.webClientId;
      await this.loadGoogleScript();
    }
    if (options.apple?.clientId) {
      this.appleClientId = options.apple.clientId;
      await this.loadAppleScript();
    }
    // Implement initialization for other providers if needed
  }

  async login(options: LoginOptions): Promise<LoginResult> {
    if (options.provider === "google") {
      return this.loginWithGoogle(options.options);
    } else if (options.provider === "apple") {
      return this.loginWithApple(options.options);
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
        // Implement Facebook logout when Facebook login is added
        console.log("Facebook logout not implemented");
        break;
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
        const googleUser = await this.getGoogleUser();
        return { isLoggedIn: !!googleUser };
      case "apple":
        // Apple doesn't provide a method to check login status on web
        console.log("Apple login status should be managed on the client side");
        return { isLoggedIn: false };
      case "facebook":
        // Implement Facebook isLoggedIn when Facebook login is added
        console.log("Facebook isLoggedIn not implemented");
        return { isLoggedIn: false };
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
        const googleUser = await this.getGoogleUser();
        if (googleUser && googleUser.credential) {
          return { jwt: googleUser.credential };
        }
        throw new Error("No Google authorization code available");
      case "apple":
        // Apple authorization code should be obtained during login
        console.log("Apple authorization code should be stored during login");
        throw new Error("Apple authorization code not available");
      case "facebook":
        // Implement Facebook getAuthorizationCode when Facebook login is added
        console.log("Facebook getAuthorizationCode not implemented");
        throw new Error("Facebook authorization code not available");
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
        // Implement Facebook refresh when Facebook login is added
        console.log("Facebook refresh not implemented");
        break;
      default:
        throw new Error(`Refresh for ${options.provider} is not implemented`);
    }
  }

  private async loginWithGoogle(options: any): Promise<LoginResult> {
    console.log("isLoggedIn", options);
    if (!this.googleClientId) {
      throw new Error("Google Client ID not set. Call initialize() first.");
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
      });

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("OneTap is not displayed or skipped");
        }
        console.log("OneTap is displayed");
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
            user: res.user?.name?.firstName
              ? `${res.user.name.firstName} ${res.user.name.lastName}`
              : null,
            email: res.user?.email || null,
            givenName: res.user?.name?.firstName || null,
            familyName: res.user?.name?.lastName || null,
            identityToken: res.authorization.id_token || null,
            authorizationCode: res.authorization.code || null,
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
}
