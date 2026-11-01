package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class GoogleAuthorizationDecisionTest {

    @Test
    public void shouldNotSkipAuthorizationByDefaultForOnlineAuthenticationOnlyScopes() {
        assertFalse(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.ONLINE,
                new String[] { "openid", "email", "profile" },
                false
            )
        );
        assertFalse(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.ONLINE,
                null,
                false
            )
        );
    }

    @Test
    public void shouldSkipAuthorizationWhenOptInForOnlineAuthenticationOnlyScopes() {
        assertTrue(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.ONLINE,
                new String[] { "openid", "email", "profile" },
                true
            )
        );
        assertTrue(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.ONLINE,
                null,
                true
            )
        );
    }

    @Test
    public void shouldNotSkipAuthorizationForOfflineModeEvenWhenOptIn() {
        assertFalse(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.OFFLINE,
                new String[] { "openid", "email" },
                true
            )
        );
    }

    @Test
    public void shouldNotSkipAuthorizationWhenExtraScopesRequestedEvenWhenOptIn() {
        assertFalse(
            GoogleAuthorizationDecision.shouldSkipAuthorizationAfterCredentialSignIn(
                GoogleProvider.GoogleProviderLoginType.ONLINE,
                new String[] { "https://www.googleapis.com/auth/drive.readonly" },
                true
            )
        );
        assertFalse(GoogleAuthorizationDecision.isAuthenticationOnlyScopes(new String[] { "https://www.googleapis.com/auth/calendar" }));
    }

    @Test
    public void canRouteAuthorizationResolutionRequiresModifiedMainActivity() {
        Activity stockActivity = Robolectric.buildActivity(Activity.class).setup().get();
        assertFalse(GoogleAuthorizationDecision.canRouteAuthorizationResolution(stockActivity));

        Activity modifiedActivity = Robolectric.buildActivity(ModifiedMainActivityStub.class).setup().get();
        assertTrue(GoogleAuthorizationDecision.canRouteAuthorizationResolution(modifiedActivity));
    }

    @Test
    public void authorizationWaitTimeoutMessageIncludesConfiguredSeconds() {
        assertEquals(
            "Timed out waiting for Google authorization after 60 seconds",
            GoogleAuthorizationDecision.AUTHORIZATION_WAIT_TIMEOUT_MESSAGE
        );
        assertEquals(60L, GoogleAuthorizationDecision.AUTHORIZATION_WAIT_SECONDS);
    }

    @Test
    public void unroutableResolutionMessageIsExplicit() {
        assertTrue(
            GoogleAuthorizationDecision.UNROUTABLE_AUTHORIZATION_RESOLUTION_MESSAGE.contains("ModifiedMainActivityForSocialLoginPlugin")
        );
        assertTrue(
            GoogleAuthorizationDecision.UNROUTABLE_AUTHORIZATION_RESOLUTION_MESSAGE.contains("skipAuthOnlyAuthorizationAfterSignIn")
        );
    }

    @Test
    public void isUnroutableAuthorizationResolutionFailureWalksCauseChain() {
        RuntimeException cause = new RuntimeException(GoogleAuthorizationDecision.UNROUTABLE_AUTHORIZATION_RESOLUTION_MESSAGE);
        assertTrue(GoogleAuthorizationDecision.isUnroutableAuthorizationResolutionFailure(new RuntimeException("wrapper", cause)));
        assertFalse(GoogleAuthorizationDecision.isUnroutableAuthorizationResolutionFailure(new RuntimeException("other failure")));
    }

    public static class ModifiedMainActivityStub extends Activity implements ModifiedMainActivityForSocialLoginPlugin {

        @Override
        public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
    }
}
