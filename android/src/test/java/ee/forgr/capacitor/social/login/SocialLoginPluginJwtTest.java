package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;

import org.json.JSONException;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 28)
public class SocialLoginPluginJwtTest {

    @Test
    public void decodeJwtHeaderObjectRejectsTrailingGarbageInHeader() {
        // Base64url of {"alg":"none"}junk
        String idToken = "eyJhbGciOiJub25lIn1qdW5r.eyJleHAiOjI5OTk5OTk5OTl9.signature";

        assertThrows(JSONException.class, () -> SocialLoginPlugin.decodeJwtHeaderObject(idToken));
    }

    @Test
    public void decodeJwtHeaderObjectRejectsNonObjectHeader() {
        // Header segment decodes to a JSON array, not an object.
        String idToken = "W10.eyJleHAiOjI5OTk5OTk5OTl9.signature";

        assertThrows(JSONException.class, () -> SocialLoginPlugin.decodeJwtHeaderObject(idToken));
    }

    @Test
    public void isJwtExpiredRejectsTokenWithNonObjectHeader() {
        String idToken = "W10.eyJleHAiOjI5OTk5OTk5OTl9.signature";

        assertThrows(JSONException.class, () -> SocialLoginPlugin.isJwtExpired(idToken, 0));
    }

    @Test
    public void isJwtExpiredAcceptsValidHeaderAndFutureExp() throws JSONException {
        String idToken = "eyJhbGciOiJub25lIn0.eyJleHAiOjI5OTk5OTk5OTl9.";

        assertFalse(SocialLoginPlugin.isJwtExpired(idToken, 0));
    }
}
