package ee.forgr.capacitor.social.login;

import android.util.Base64;
import org.json.JSONObject;

/**
 * Hosted-domain helpers for Google sign-in and token refresh.
 */
final class GoogleHostedDomainRules {

    private GoogleHostedDomainRules() {}

    /**
     * Bottom / One Tap ({@code GetGoogleIdOption}) supports hosted domain, auto-select, and
     * authorized-account filtering. Sign in with Google button ({@code GetSignInWithGoogleOption})
     * supports hosted domain only.
     */
    static boolean shouldUseGoogleIdOptionForLogin(boolean bottomUi, boolean autoSelectEnabled, boolean filterByAuthorizedAccounts) {
        return bottomUi || autoSelectEnabled || filterByAuthorizedAccounts;
    }

    static boolean hasConfiguredHostedDomain(String hostedDomain) {
        return hostedDomain != null && !hostedDomain.isEmpty();
    }

    static boolean idTokenSatisfiesHostedDomain(String idToken, String hostedDomain) {
        if (!hasConfiguredHostedDomain(hostedDomain) || idToken == null || idToken.isEmpty()) {
            return true;
        }
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            String payload = new String(Base64.decode(parts[1], Base64.DEFAULT));
            JSONObject parsed = new JSONObject(payload);
            String normalizedDomain = hostedDomain.trim().toLowerCase();
            if (parsed.has("hd")) {
                String hd = parsed.optString("hd", "").trim().toLowerCase();
                if (!hd.isEmpty()) {
                    return hd.equals(normalizedDomain);
                }
            }
            if (parsed.has("email")) {
                String email = parsed.optString("email", "").trim().toLowerCase();
                if (email.endsWith("@" + normalizedDomain)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }
}