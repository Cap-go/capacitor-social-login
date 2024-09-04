import { WebPlugin } from "@capacitor/core";

import type { SocialLoginPlugin, InitializeOptions, LoginOptions } from "./definitions";

export class SocialLoginWeb extends WebPlugin implements SocialLoginPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log("ECHO", options);
    return options;
  }
  async initialize(options: InitializeOptions): Promise<void> {
    console.log("INITIALIZE", options);
  }
  async login(options: LoginOptions): Promise<void> {
    console.log("LOGIN", options);
  }
  async logout(options: LoginOptions): Promise<void> {
    console.log("LOGOUT", options);
  }
  async refresh(options: LoginOptions): Promise<void> {
    console.log("REFRESH", options);
  }
}
