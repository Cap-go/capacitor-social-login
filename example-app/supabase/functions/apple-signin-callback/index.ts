// Apple Sign-In callback handler for Android
// This edge function handles the OAuth callback from Apple, exchanges the authorization code
// for tokens, and redirects back to the Android app with the identity token.
//
// Environment variables required:
// - APPLE_TEAM_ID: Your Apple Developer Team ID
// - APPLE_KEY_ID: The Key ID from Apple Developer Portal
// - APPLE_PRIVATE_KEY: Base64 encoded content of the .p8 private key file
// - ANDROID_SERVICE_ID: Your Apple Service ID (e.g., com.example.app.service)
// - BASE_REDIRECT_URL: Deep link URL for redirecting back to app (e.g., capgo-demo-app://path)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as jose from "jose";

// Apple OAuth endpoints
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";

interface AppleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string; // This is the JWT identity token we need
}

interface Env {
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY: string; // Base64 encoded .p8 file content
  ANDROID_SERVICE_ID: string;
  BASE_REDIRECT_URL: string; // Deep link URL like "capgo-demo-app://path"
  APPLE_REDIRECT_URI: string; // The exact redirect URI configured in Apple Developer Portal (e.g., https://ravietjurodcepyjsgcu.supabase.co/functions/v1/apple-signin-callback)
}

/**
 * Generate a JWT client secret for Apple token exchange
 * This is required to authenticate with Apple's token endpoint
 * 
 * Similar to the reference implementation using jsonwebtoken in Node.js,
 * we use the jose library which handles key parsing and JWT signing.
 * 
 * The private key should be the raw PEM content of the .p8 file.
 * If stored as base64, it needs to be decoded first.
 */
async function generateAppleClientSecret(
  teamId: string,
  keyId: string,
  privateKeyBase64: string,
  clientId: string
): Promise<string> {
  try {
    // Decode the base64 encoded private key to get PEM format
    // The .p8 file content is base64 encoded, so decode it
    let privateKeyPem: string;
    try {
      privateKeyPem = atob(privateKeyBase64);
    } catch (e) {
      // If decoding fails, assume it's already PEM format (not base64 encoded)
      privateKeyPem = privateKeyBase64;
    }
    
    // Ensure the PEM has proper headers if they're missing
    if (!privateKeyPem.includes("BEGIN")) {
      privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyPem}\n-----END PRIVATE KEY-----`;
    }
    
    // Import the private key using jose (similar to how jsonwebtoken handles it)
    const privateKey = await jose.importPKCS8(privateKeyPem, "ES256");
    
    // Create JWT payload (matching the reference implementation structure)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 86400 * 180, // 6 months (matching reference implementation)
      aud: "https://appleid.apple.com",
      sub: clientId,
    };
    
    // Sign and create the JWT using jose (similar to jsonwebtoken.sign())
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({
        alg: "ES256",
        kid: keyId,
      })
      .sign(privateKey);
    
    return jwt;
  } catch (error) {
    console.error("Error generating Apple client secret:", error);
    throw new Error(
      `Failed to generate Apple client secret: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  redirectUri: string,
  clientSecret: string
): Promise<AppleTokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple token exchange failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Handle POST request from Apple OAuth redirect (form data)
 */
Deno.serve(async (req) => {
  try {
    // Get environment variables
    const env = Deno.env.toObject() as unknown as Env;
    
    if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || 
        !env.ANDROID_SERVICE_ID || !env.BASE_REDIRECT_URL || !env.APPLE_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required environment variables",
          required: [
            "APPLE_TEAM_ID",
            "APPLE_KEY_ID", 
            "APPLE_PRIVATE_KEY",
            "ANDROID_SERVICE_ID",
            "BASE_REDIRECT_URL",
            "APPLE_REDIRECT_URI"
          ]
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse form data from POST request
    const formData = await req.formData();
    const code = formData.get("code") as string | null;
    const state = formData.get("state") as string | null;
    const error = formData.get("error") as string | null;

    // Handle error from Apple
    if (error) {
      const errorDescription = formData.get("error_description") as string | null || error;
      // Redirect back to app with success=false to match Android plugin convention
      const redirectUrl = new URL(env.BASE_REDIRECT_URL);
      redirectUrl.searchParams.set("success", "false");
      redirectUrl.searchParams.set("error", errorDescription || error);
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    // Check for authorization code
    if (!code) {
      // Redirect back to app with success=false to match Android plugin convention
      const redirectUrl = new URL(env.BASE_REDIRECT_URL);
      redirectUrl.searchParams.set("success", "false");
      redirectUrl.searchParams.set("error", "Missing authorization code");
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    // Use the redirect URI from environment variable
    // This must match EXACTLY what's configured in Apple Developer Portal
    // Apple is very strict about redirect URI matching
    const redirectUri = env.APPLE_REDIRECT_URI;
    
    console.log("Apple callback received:", {
      code: code ? `${code.substring(0, 20)}...` : null,
      state,
      redirectUri,
      requestUrl: req.url,
      userAgent: req.headers.get("user-agent"),
    });

    // Generate client secret for Apple token exchange
    const clientSecret = await generateAppleClientSecret(
      env.APPLE_TEAM_ID,
      env.APPLE_KEY_ID,
      env.APPLE_PRIVATE_KEY,
      env.ANDROID_SERVICE_ID
    );

    // Exchange authorization code for tokens
    const tokenResponse = await exchangeCodeForTokens(
      code,
      env.ANDROID_SERVICE_ID,
      redirectUri,
      clientSecret
    );

    // Extract tokens from Apple response
    const identityToken = tokenResponse.id_token;
    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token;

    if (!identityToken) {
      return new Response(
        "Failed to get identity token from Apple",
        { status: 500 }
      );
    }

    // Build redirect URL back to the app
    // Format: capgo-demo-app://path?success=true&id_token=...&access_token=...&refresh_token=...
    // This matches the convention expected by Android plugin's handleUrl method
    const redirectUrl = new URL(env.BASE_REDIRECT_URL);
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("id_token", identityToken);
    
    if (accessToken) {
      redirectUrl.searchParams.set("access_token", accessToken);
    }
    
    if (refreshToken) {
      redirectUrl.searchParams.set("refresh_token", refreshToken);
    }
    
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    console.log("Redirecting back to app:", redirectUrl.toString());

    // Redirect back to the app
    // Use 302 redirect for Android deep link
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Apple Sign-In callback error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
