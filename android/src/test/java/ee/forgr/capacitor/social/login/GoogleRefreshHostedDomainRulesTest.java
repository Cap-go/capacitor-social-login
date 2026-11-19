package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.util.Base64;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class GoogleRefreshHostedDomainRulesTest {

    @Test
    public void earlyPathRejectsStoredIdTokenOutsideHostedDomain() {
        String token = jwtWithPayload("{\"hd\":\"other.com\",\"email\":\"user@other.com\"}");
        GoogleRefreshHostedDomainRules.RefreshEarlyPathDecision decision = GoogleRefreshHostedDomainRules.decideValidTokenEarlyPath(
            token,
            "example.com",
            true
        );
        assertTrue(decision.rejectForHostedDomain);
        assertFalse(decision.resolveWithoutCredentialRefresh);
    }

    @Test
    public void earlyPathResolvesWhenHostedDomainMatches() {
        String token = jwtWithPayload("{\"hd\":\"example.com\",\"email\":\"user@example.com\"}");
        GoogleRefreshHostedDomainRules.RefreshEarlyPathDecision decision = GoogleRefreshHostedDomainRules.decideValidTokenEarlyPath(
            token,
            "example.com",
            true
        );
        assertFalse(decision.rejectForHostedDomain);
        assertTrue(decision.resolveWithoutCredentialRefresh);
    }

    @Test
    public void earlyPathContinuesWhenHostedDomainNotConfigured() {
        String token = jwtWithPayload("{\"email\":\"user@example.com\"}");
        GoogleRefreshHostedDomainRules.RefreshEarlyPathDecision decision = GoogleRefreshHostedDomainRules.decideValidTokenEarlyPath(
            token,
            null,
            true
        );
        assertFalse(decision.rejectForHostedDomain);
        assertTrue(decision.resolveWithoutCredentialRefresh);
    }

    @Test
    public void refreshedIdTokenRejectsWrongHostedDomain() {
        String token = jwtWithPayload("{\"hd\":\"wrong.com\"}");
        assertTrue(GoogleRefreshHostedDomainRules.shouldRejectRefreshedIdToken(token, "example.com"));
    }

    @Test
    public void refreshedIdTokenAcceptsMatchingHostedDomain() {
        String token = jwtWithPayload("{\"hd\":\"example.com\"}");
        assertFalse(GoogleRefreshHostedDomainRules.shouldRejectRefreshedIdToken(token, "example.com"));
    }

    @Test
    public void refreshRejectionMessageIncludesConfiguredDomain() {
        assertEquals(
            "Failed to refresh tokens: signed-in account is outside the configured hosted domain (example.com).",
            GoogleRefreshHostedDomainRules.refreshHostedDomainRejectionMessage("example.com")
        );
    }

    private static String jwtWithPayload(String jsonPayload) {
        String header = Base64.encodeToString("{\"alg\":\"none\"}".getBytes(), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        String payload = Base64.encodeToString(
            jsonPayload.getBytes(StandardCharsets.UTF_8),
            Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );
        return header + "." + payload + ".sig";
    }
}
