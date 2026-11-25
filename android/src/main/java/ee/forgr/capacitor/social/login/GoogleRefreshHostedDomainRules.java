package ee.forgr.capacitor.social.login;

/**
 * Hosted-domain decisions for Google {@code refresh()} on Android.
 */
final class GoogleRefreshHostedDomainRules {

    static final String REFRESH_HOSTED_DOMAIN_REJECTION_PREFIX =
        "Failed to refresh tokens: signed-in account is outside the configured hosted domain (";

    private GoogleRefreshHostedDomainRules() {}

    static final class RefreshEarlyPathDecision {

        final boolean rejectForHostedDomain;
        final boolean resolveWithoutCredentialRefresh;

        private RefreshEarlyPathDecision(boolean rejectForHostedDomain, boolean resolveWithoutCredentialRefresh) {
            this.rejectForHostedDomain = rejectForHostedDomain;
            this.resolveWithoutCredentialRefresh = resolveWithoutCredentialRefresh;
        }

        static RefreshEarlyPathDecision continueRefresh() {
            return new RefreshEarlyPathDecision(false, false);
        }

        static RefreshEarlyPathDecision rejectHostedDomain() {
            return new RefreshEarlyPathDecision(true, false);
        }

        static RefreshEarlyPathDecision resolveEarly() {
            return new RefreshEarlyPathDecision(false, true);
        }
    }

    static RefreshEarlyPathDecision decideValidTokenEarlyPath(String idToken, String hostedDomain, boolean accessOk) {
        if (idToken == null || !accessOk) {
            return RefreshEarlyPathDecision.continueRefresh();
        }
        if (
            GoogleHostedDomainRules.hasConfiguredHostedDomain(hostedDomain) &&
            !GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(idToken, hostedDomain)
        ) {
            return RefreshEarlyPathDecision.rejectHostedDomain();
        }
        return RefreshEarlyPathDecision.resolveEarly();
    }

    static boolean shouldRejectRefreshedIdToken(String idToken, String hostedDomain) {
        return (
            GoogleHostedDomainRules.hasConfiguredHostedDomain(hostedDomain) &&
            !GoogleHostedDomainRules.idTokenSatisfiesHostedDomain(idToken, hostedDomain)
        );
    }

    static String refreshHostedDomainRejectionMessage(String hostedDomain) {
        return REFRESH_HOSTED_DOMAIN_REJECTION_PREFIX + hostedDomain + ").";
    }
}
