package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class SocialLoginPluginTest {

    @Test
    public void shouldAllowMissingAppleRedirectUrlForBroadcastChannel() {
        assertFalse(SocialLoginPlugin.shouldRejectMissingAppleRedirectUrl(null, true));
        assertFalse(SocialLoginPlugin.shouldRejectMissingAppleRedirectUrl("", true));
    }

    @Test
    public void shouldRequireAppleRedirectUrlForRedirectFlow() {
        assertTrue(SocialLoginPlugin.shouldRejectMissingAppleRedirectUrl(null, false));
        assertTrue(SocialLoginPlugin.shouldRejectMissingAppleRedirectUrl("", false));
        assertFalse(SocialLoginPlugin.shouldRejectMissingAppleRedirectUrl("app://callback", false));
    }
}
