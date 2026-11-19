package ee.forgr.capacitor.social.login;

/**
 * Login UI rules when {@code hostedDomain} is configured on Android (standard Sign in with Google flow).
 */
final class GoogleLoginHostedDomainUiRules {

    static final String HOSTED_DOMAIN_INCOMPATIBLE_OPTIONS_MESSAGE =
        "Google Sign-In: hostedDomain uses the standard Sign in with Google button flow and cannot be combined with autoSelectEnabled or filterByAuthorizedAccounts.";

    private GoogleLoginHostedDomainUiRules() {}

    static final class LoginUiDecision {

        final boolean rejected;
        final String rejectionMessage;
        final boolean useBottomUi;

        private LoginUiDecision(boolean rejected, String rejectionMessage, boolean useBottomUi) {
            this.rejected = rejected;
            this.rejectionMessage = rejectionMessage;
            this.useBottomUi = useBottomUi;
        }

        static LoginUiDecision reject(String message) {
            return new LoginUiDecision(true, message, false);
        }

        static LoginUiDecision proceed(boolean useBottomUi) {
            return new LoginUiDecision(false, null, useBottomUi);
        }

        boolean usesGetSignInWithGoogleOption() {
            return !useBottomUi;
        }
    }

    static LoginUiDecision decideLoginUi(
        boolean bottomUi,
        boolean filterByAuthorizedAccounts,
        boolean autoSelectEnabled,
        String hostedDomain
    ) {
        if (!GoogleHostedDomainRules.hasConfiguredHostedDomain(hostedDomain)) {
            return LoginUiDecision.proceed(bottomUi);
        }
        if (autoSelectEnabled || filterByAuthorizedAccounts) {
            return LoginUiDecision.reject(HOSTED_DOMAIN_INCOMPATIBLE_OPTIONS_MESSAGE);
        }
        return LoginUiDecision.proceed(false);
    }
}
