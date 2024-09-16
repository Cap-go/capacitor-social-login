import { WebPlugin } from "@capacitor/core";

import type { SocialLoginPlugin, InitializeOptions, LoginOptions, LoginResult, AuthorizationCode } from "./definitions";

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  getAuthorizationCode(): Promise<AuthorizationCode> {
    console.log("getCurrentUser");
    return null as any;
  }
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log("ECHO", options);
    return options;
  }
  async initialize(options: InitializeOptions): Promise<void> {
    console.log("INITIALIZE", options);
  }
  async login(options: LoginOptions): Promise<LoginResult> {
    console.log("LOGIN", options);
    return null as any;
  }
  async logout(options: LoginOptions): Promise<void> {
    console.log("LOGOUT", options);
  }
  async refresh(options: LoginOptions): Promise<void> {
    console.log("REFRESH", options);
  }
  async isLoggedIn(options: any): Promise<{ isLoggedIn: boolean }> {
    console.log('isLoggedIn', options)
    return { isLoggedIn: false }
  }
}
