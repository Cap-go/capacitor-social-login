/// <reference types="@capgo/capacitor-social-login" />

import { CapacitorConfig } from "@capacitor/cli";
import * as dotenv from "dotenv";

dotenv.config();

const config: CapacitorConfig = {
  appId: process.env.VITE_BUNDLE_ID || "com.example.app",
  appName: "app",
  webDir: "dist",
  plugins: {
    // GoogleAuth: {
    //   scopes: [
    //     'profile',
    //     'email',
    //     'https://www.googleapis.com/auth/calendar.events',
    //     'https://www.googleapis.com/auth/contacts.readonly',
    //   ],
    //   serverClientId: process.env.VITE_GOOGLE_CLIENT_ID,
    //   forceCodeForRefreshToken: true,
    // },
  },
};

export default config;
