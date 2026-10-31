package ee.forgr.capacitor.social.login;

import android.app.Activity;

/**
 * Pure decision helpers for Google AuthorizationClient usage after Credential Manager sign-in.
 */
public final class GoogleAuthorizationDecision {

    public static final long AUTHORIZATION_WAIT_SECONDS = 60L;

    public static final String UNROUTABLE_AUTHORIZATION_RESOLUTION_MESSAGE =
        "Google authorization requires user interaction, but the host Activity does not implement ModifiedMainActivityForSocialLoginPlugin and forward onActivityResult. Use login without custom scopes on a stock BridgeActivity, or update MainActivity as documented in the README.";

    public static final String AUTHORIZATION_WAIT_TIMEOUT_MESSAGE =
        "Timed out waiting for Google authorization after " + AUTHORIZATION_WAIT_SECONDS + " seconds";

    private GoogleAuthorizationDecision() {}

    /**
     * Authentication-only (OIDC) scopes that Credential Manager already covers via the ID token.
     * AuthorizationClient is only needed when requesting additional Google API scopes.
     */
    public static boolean isAuthenticationOnlyScopes(String[] scopes) {
        if (scopes == null || scopes.length == 0) {
            return true;
        }
        for (String scope : scopes) {
            if (scope == null || scope.isEmpty()) {
                continue;
            }
            boolean isDefault =
                scope.equals("openid") ||
                scope.equals("https://www.googleapis.com/auth/userinfo.email") ||
                scope.equals("https://www.googleapis.com/auth/userinfo.profile") ||
                scope.equals("email") ||
                scope.equals("profile");
            if (!isDefault) {
                return false;
            }
        }
        return true;
    }

    /**
     * Skip AuthorizationClient when online login already has an ID token and only default OIDC scopes are requested.
     * Offline mode still needs authorize() for serverAuthCode.
     */
    public static boolean shouldSkipAuthorizationAfterCredentialSignIn(GoogleProvider.GoogleProviderLoginType mode, String[] scopes) {
        return mode == GoogleProvider.GoogleProviderLoginType.ONLINE && isAuthenticationOnlyScopes(scopes);
    }

    public static boolean canRouteAuthorizationResolution(Activity activity) {
        return activity instanceof ModifiedMainActivityForSocialLoginPlugin;
    }
}
