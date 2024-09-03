import { registerPlugin } from "@capacitor/core";

import type { SocialLoginPlugin } from "./definitions";

const SocialLogin = registerPlugin<SocialLoginPlugin>("SocialLogin", {
  web: () => import("./web").then((m) => new m.SocialLoginWeb()),
});

export * from "./definitions";
export { SocialLogin };
