package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

public class SocialLoginPluginUnitTest {

    @Test
    public void testLongOptionFromCallCoercesIntegerBridgeValue() throws JSONException {
        // Unix seconds (~1.7e9) fit in 32-bit Integer and are typical for OAuth/Apple expiry.
        JSObject data = new JSObject();
        data.put("accessTokenExpirationDate", 1_735_689_600);

        PluginCall call = new PluginCall(null, "SocialLogin", "test-callback", "getAccessTokenExpirationDate", data);

        assertEquals(
            "JS numbers within Integer range must be read as accessTokenExpirationDate",
            Long.valueOf(1_735_689_600L),
            SocialLoginPlugin.longOptionFromCall(call, "accessTokenExpirationDate")
        );
    }

    @Test
    public void testLongOptionFromCallCoercesLongBridgeValue() throws JSONException {
        // Millisecond timestamps (~1.7e12) may already cross the bridge as Long.
        JSObject data = new JSObject();
        data.put("accessTokenExpirationDate", 1_735_689_600_000L);

        PluginCall call = new PluginCall(null, "SocialLogin", "test-callback", "isAccessTokenExpired", data);

        assertEquals(Long.valueOf(1_735_689_600_000L), SocialLoginPlugin.longOptionFromCall(call, "accessTokenExpirationDate"));
    }

    @Test
    public void testLongOptionFromCallReturnsNullWhenMissing() {
        PluginCall call = new PluginCall(null, "SocialLogin", "test-callback", "getAccessTokenExpirationDate", new JSObject());

        assertNull(SocialLoginPlugin.longOptionFromCall(call, "accessTokenExpirationDate"));
    }

    @Test
    public void testLongOptionFromCallReturnsNullForExplicitNull() throws JSONException {
        JSObject data = new JSObject();
        data.put("accessTokenExpirationDate", JSONObject.NULL);

        PluginCall call = new PluginCall(null, "SocialLogin", "test-callback", "getAccessTokenExpirationDate", data);

        assertNull(SocialLoginPlugin.longOptionFromCall(call, "accessTokenExpirationDate"));
    }

    @Test
    public void testLongOptionFromCallReturnsNullForNonNumericValue() throws JSONException {
        JSObject data = new JSObject();
        data.put("accessTokenExpirationDate", "not-a-number");

        PluginCall call = new PluginCall(null, "SocialLogin", "test-callback", "getAccessTokenExpirationDate", data);

        assertNull(SocialLoginPlugin.longOptionFromCall(call, "accessTokenExpirationDate"));
    }

    @Test
    public void getJwtPayloadSegmentParsesPayloadBetweenDotSeparators() throws JSONException {
        String idToken = "e30.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.signature";

        assertEquals("eyJzdWIiOiJ0ZXN0LXVzZXIifQ", SocialLoginPlugin.getJwtPayloadSegment(idToken));
    }

    @Test
    public void getJwtPayloadSegmentRejectsTokenWithoutDotSeparator() {
        assertThrows(JSONException.class, () -> SocialLoginPlugin.getJwtPayloadSegment("not-a-jwt"));
    }

    @Test
    public void resolveOpenAuthSessionExpectedCallbackPrefixUsesRedirectUriQueryParam() {
        String authorizeUrl =
            "https://login.example.com/oauth2/authorize?client_id=app&redirect_uri=myapp%3A%2F%2Fauth%2Fcallback&response_type=code";

        assertEquals("myapp://auth/callback", SocialLoginPlugin.resolveOpenAuthSessionExpectedCallbackPrefix(authorizeUrl, "myapp"));
    }

    @Test
    public void resolveOpenAuthSessionExpectedCallbackPrefixFallsBackToScheme() {
        assertEquals("myapp:", SocialLoginPlugin.resolveOpenAuthSessionExpectedCallbackPrefix("https://login.example.com", "myapp"));
    }

    @Test
    public void resolveOpenAuthSessionExpectedCallbackPrefixIgnoresAuthorizeUrlFragment() {
        String authorizeUrl =
            "https://login.example.com/oauth2/authorize?redirect_uri=myapp%3A%2F%2Fauth%2Fcallback&response_type=code#frag";

        assertEquals("myapp://auth/callback", SocialLoginPlugin.resolveOpenAuthSessionExpectedCallbackPrefix(authorizeUrl, "myapp"));
    }

    @Test
    public void resolveOpenAuthSessionExpectedCallbackPrefixDecodesRedirectUriOnce() {
        String authorizeUrl =
            "https://login.example.com/oauth2/authorize?redirect_uri=com.example.app%3A%2Foauth2redirect&response_type=code";

        assertEquals(
            "com.example.app:/oauth2redirect",
            SocialLoginPlugin.resolveOpenAuthSessionExpectedCallbackPrefix(authorizeUrl, "com.example.app")
        );
    }

    @Test
    public void matchesOpenAuthSessionCallbackRejectsPrefixExtensionAttack() {
        assertEquals(
            false,
            SocialLoginPlugin.matchesOpenAuthSessionCallback("myapp://auth/callback.evil", "myapp://auth/callback", "myapp")
        );
        assertEquals(
            true,
            SocialLoginPlugin.matchesOpenAuthSessionCallback("myapp://auth/callback?code=abc", "myapp://auth/callback", "myapp")
        );
    }

    @Test
    public void matchesOpenAuthSessionCallbackUsesSchemeWhenRedirectUriOmitted() {
        assertEquals(
            true,
            SocialLoginPlugin.matchesOpenAuthSessionCallback(
                "com.example.app:/oauth2redirect?code=1",
                "com.example.app:",
                "com.example.app"
            )
        );
    }
}
