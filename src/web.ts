import { WebPlugin } from "@capacitor/core";

import type {
  SocialLoginPlugin,
  InitializeOptions,
  LoginOptions,
  LoginResult,
  AuthorizationCode,
  AppleProviderResponse,
  isLoggedInOptions,
  AuthorizationCodeOptions,
  FacebookLoginOptions,
  FacebookLoginResponse,
} from "./definitions";

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
        return Promise.reject("Not implemented")
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

    let scopes = options.scopes || [];

    if (scopes.length > 0) {
      // If scopes are provided, directly use the traditional OAuth flow
      return Promise.reject("Not yet implemented");
    } else {
      scopes = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ];
    }

    return new Promise((resolve, reject) => {
      const auth2 = google.accounts.oauth2.initTokenClient({
        client_id: this.googleClientId!,
        scope: scopes.join(" "),
        callback: async (response) => {
          if (response.error) {
            reject(response.error);
          } else {
            // Process the response similar to One Tap
            const accessToken = response.access_token;
            try {
              const profileRes = await fetch(
                "https://openidconnect.googleapis.com/v1/userinfo",
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              );

              if (!profileRes.ok) {
                reject(
                  new Error(
                    `Profile response is not OK. Status: ${profileRes.status}`,
                  ),
                );
                return;
              }

              function isString(value: any): value is string {
                return typeof value === "string";
              }

              const jsonObject = await profileRes.json();
              // Assuming jsonObject is of type any or a specific interface
              let name: string;
              let givenName: string;
              let familyName: string;
              let picture: string;
              let email: string;
              let sub: string;

              if (isString(jsonObject.name)) {
                name = jsonObject.name;
              } else {
                throw new Error('Invalid or missing "name" property.');
              }

              if (isString(jsonObject.given_name)) {
                givenName = jsonObject.given_name;
              } else {
                throw new Error('Invalid or missing "given_name" property.');
              }

              if (isString(jsonObject.family_name)) {
                familyName = jsonObject.family_name;
              } else {
                throw new Error('Invalid or missing "family_name" property.');
              }

              if (isString(jsonObject.picture)) {
                picture = jsonObject.picture;
              } else {
                throw new Error('Invalid or missing "picture" property.');
              }

              if (isString(jsonObject.email)) {
                email = jsonObject.email;
              } else {
                throw new Error('Invalid or missing "email" property.');
              }

              if (isString(jsonObject.sub)) {
                sub = jsonObject.sub;
              } else {
                throw new Error('Invalid or missing "sub" property.');
              }

              // Assuming profile is an object of a specific interface or type
              const profile = {
                email: email,
                familyName: familyName,
                givenName: givenName,
                id: sub,
                name: name,
                imageUrl: picture,
              };

              resolve({
                provider: "google",
                result: {
                  accessToken: {
                    token: accessToken,
                    expires: response.expires_in, //expires_in = seconds until the token expirers
                  },
                  profile,
                  serverAuthCode: null,
                },
              });
            } catch (e) {
              reject(e);
            }
          }
        },
      });
      auth2.requestAccessToken();
    });
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
              token: "", // TODO: to fix and find the correct token
            },
            idToken: res.authorization.id_token || null,
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
                  authenticationToken: null,
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
}
