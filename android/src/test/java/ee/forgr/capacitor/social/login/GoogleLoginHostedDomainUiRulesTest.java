package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class GoogleLoginHostedDomainUiRulesTest {

    @Test
    public void hostedDomainForcesStandardGetSignInWithGoogleOption() {
        GoogleLoginHostedDomainUiRules.LoginUiDecision decision = GoogleLoginHostedDomainUiRules.decideLoginUi(
            true,
            false,
            false,
            "example.com"
        );
        assertFalse(decision.rejected);
        assertFalse(decision.useBottomUi);
        assertTrue(decision.usesGetSignInWithGoogleOption());
    }

    @Test
    public void hostedDomainRejectsAutoSelectEnabled() {
        GoogleLoginHostedDomainUiRules.LoginUiDecision decision = GoogleLoginHostedDomainUiRules.decideLoginUi(
            false,
            false,
            true,
            "example.com"
        );
        assertTrue(decision.rejected);
        assertEquals(GoogleLoginHostedDomainUiRules.HOSTED_DOMAIN_INCOMPATIBLE_OPTIONS_MESSAGE, decision.rejectionMessage);
    }

    @Test
    public void hostedDomainRejectsFilterByAuthorizedAccounts() {
        GoogleLoginHostedDomainUiRules.LoginUiDecision decision = GoogleLoginHostedDomainUiRules.decideLoginUi(
            false,
            true,
            false,
            "example.com"
        );
        assertTrue(decision.rejected);
        assertEquals(GoogleLoginHostedDomainUiRules.HOSTED_DOMAIN_INCOMPATIBLE_OPTIONS_MESSAGE, decision.rejectionMessage);
    }

    @Test
    public void withoutHostedDomainKeepsBottomUiWhenRequested() {
        GoogleLoginHostedDomainUiRules.LoginUiDecision decision = GoogleLoginHostedDomainUiRules.decideLoginUi(true, false, false, null);
        assertFalse(decision.rejected);
        assertTrue(decision.useBottomUi);
        assertFalse(decision.usesGetSignInWithGoogleOption());
    }
}
