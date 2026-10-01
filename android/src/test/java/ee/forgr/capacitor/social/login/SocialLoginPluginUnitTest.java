package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import android.util.Base64;
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
    public void isJwtExpiredMatchesExpClaim() throws JSONException {
        long futureExp = (System.currentTimeMillis() / 1000L) + 3600;
        String payload = Base64.encodeToString(
            ("{\"exp\":" + futureExp + "}").getBytes(java.nio.charset.StandardCharsets.UTF_8),
            Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );
        String idToken = "hdr." + payload + ".sig";
        assertFalse(SocialLoginPlugin.isJwtExpired(idToken, 0));

        long pastExp = (System.currentTimeMillis() / 1000L) - 3600;
        String pastPayload = Base64.encodeToString(
            ("{\"exp\":" + pastExp + "}").getBytes(java.nio.charset.StandardCharsets.UTF_8),
            Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );
        String expiredToken = "hdr." + pastPayload + ".sig";
        assertTrue(SocialLoginPlugin.isJwtExpired(expiredToken, 0));
    }
}
