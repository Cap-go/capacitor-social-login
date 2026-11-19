package ee.forgr.capacitor.social.login;

import android.util.Base64;
import org.json.JSONObject;

/**
 * Hosted-domain helpers for Google sign-in and token refresh.
 */
final class GoogleHostedDomainRules {

    private GoogleHostedDomainRules() {}

    static boolean hasConfiguredHostedDomain(String hostedDomain) {
        return hostedDomain != null && !hostedDomain.isEmpty();
    }

    static boolean idTokenSatisfiesHostedDomain(String idToken, String hostedDomain) {
        if (!hasConfiguredHostedDomain(hostedDomain)) {
            return true;
        }
        if (idToken == null || idToken.isEmpty()) {
            return false;
        }
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            String payload = new String(Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));
            JSONObject parsed = new JSONObject(payload);
            String normalizedDomain = hostedDomain.trim().toLowerCase();
            if (!parsed.has("hd")) {
                return false;
            }
            String hd = parsed.optString("hd", "").trim().toLowerCase();
            return !hd.isEmpty() && hd.equals(normalizedDomain);
        } catch (Exception e) {
            return false;
        }
    }
}