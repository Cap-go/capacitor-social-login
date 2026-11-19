package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.util.Base64;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class GoogleHostedDomainRulesTest {

    @Test
    public void idTokenMatchesHostedDomainFromHdClaim() {
        String token = jwtWithPayload("{\"hd\":\"example.com\",\"email\":\"user@example.com\"}");
        assertTrue(GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(token, "example.com"));
    }

    @Test
    public void idTokenRejectsWrongHostedDomain() {
        String token = jwtWithPayload("{\"hd\":\"other.com\",\"email\":\"user@other.com\"}");
        assertFalse(GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(token, "example.com"));
    }

    @Test
    public void idTokenRejectsMissingHdClaimEvenWhenEmailMatches() {
        String token = jwtWithPayload("{\"email\":\"user@example.com\"}");
        assertFalse(GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(token, "example.com"));
    }

    @Test
    public void idTokenRejectsNullWhenHostedDomainConfigured() {
        assertFalse(GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(null, "example.com"));
    }

    @Test
    public void idTokenDecodesUrlSafeJwtPayload() {
        String jsonPayload = "{\"hd\":\"ex_ample.com\",\"note\":\"ÿÿ\"}";
        String payloadSegment = Base64.encodeToString(
            jsonPayload.getBytes(StandardCharsets.UTF_8),
            Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING
        );
        assertTrue("fixture must require URL-safe Base64", payloadSegment.contains("_") || payloadSegment.contains("-"));
        String token = "e30." + payloadSegment + ".sig";
        assertTrue(GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(token, "ex_ample.com"));
    }

    private static String jwtWithPayload(String jsonPayload) {
        String header = Base64.encodeToString("{\"alg\":\"none\"}".getBytes(), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        String payload = Base64.encodeToString(jsonPayload.getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        return header + "." + payload + ".sig";
    }
}