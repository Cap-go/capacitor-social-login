package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

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
        assertNull("PluginCall.getLong misses Integer bridge values", call.getLong("accessTokenExpirationDate"));
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
}
