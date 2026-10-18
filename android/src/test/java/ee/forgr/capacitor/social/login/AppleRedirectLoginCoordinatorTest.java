package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

public class AppleRedirectLoginCoordinatorTest {

    private AppleRedirectLoginCoordinator coordinator;

    @Before
    public void setUp() {
        coordinator = new AppleRedirectLoginCoordinator();
    }

    @Test
    public void shouldRejectOnResumeWhenCustomTabClosedWithoutRedirect() {
        coordinator.onCustomTabLaunched();
        assertTrue(coordinator.shouldRejectOnActivityResume());
    }

    @Test
    public void shouldNotRejectOnResumeBeforeCustomTabLaunched() {
        assertFalse(coordinator.shouldRejectOnActivityResume());
    }

    @Test
    public void shouldNotRejectOnResumeAfterRedirectReceived() {
        coordinator.onCustomTabLaunched();
        coordinator.onRedirectReceived();
        assertFalse(coordinator.shouldRejectOnActivityResume());
    }

    @Test
    public void shouldNotRejectOnResumeWhileTokenExchangeInProgress() {
        coordinator.onCustomTabLaunched();
        coordinator.onTokenExchangeStarted();
        assertFalse(coordinator.shouldRejectOnActivityResume());
    }

    @Test
    public void afterCancelSessionCanStartAnotherCustomTabRedirect() {
        coordinator.onCustomTabLaunched();
        assertTrue(coordinator.shouldRejectOnActivityResume());
        coordinator.onLoginFinished();
        assertFalse(coordinator.shouldRejectOnActivityResume());

        coordinator.onCustomTabLaunched();
        assertTrue(coordinator.shouldRejectOnActivityResume());
    }

    @Test
    public void onLoginFinishedClearsTokenExchangeFlag() {
        coordinator.onCustomTabLaunched();
        coordinator.onTokenExchangeStarted();
        coordinator.onLoginFinished();
        assertFalse(coordinator.shouldRejectOnActivityResume());
    }
}
