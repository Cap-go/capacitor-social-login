package ee.forgr.capacitor.social.login;

/**
 * Tracks Custom Tabs redirect login state so we can detect when the user returns without a callback.
 */
final class AppleRedirectLoginCoordinator {

    static final String USER_CANCELLED_CODE = "USER_CANCELLED";
    static final String USER_CANCELLED_MESSAGE = "User cancelled";

    private boolean customTabsRedirectPending;
    private boolean tokenExchangeInProgress;

    void onCustomTabLaunched() {
        customTabsRedirectPending = true;
        tokenExchangeInProgress = false;
    }

    void onRedirectReceived() {
        customTabsRedirectPending = false;
    }

    void onTokenExchangeStarted() {
        customTabsRedirectPending = false;
        tokenExchangeInProgress = true;
    }

    void onLoginFinished() {
        customTabsRedirectPending = false;
        tokenExchangeInProgress = false;
    }

    boolean shouldRejectOnActivityResume() {
        return customTabsRedirectPending && !tokenExchangeInProgress;
    }
}
