package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.lang.reflect.Field;
import org.junit.Test;

public class AppleProviderRedirectCancelTest {

    @Test
    public void handleUserReturnedWithoutCallbackRejectsWithUserCancelledAndClearsLastCall() throws Exception {
        RecordingPluginCall call = new RecordingPluginCall();
        AppleProvider provider = new AppleProvider("https://example.com/callback", "client-id", null, null, false, false);
        setLastCall(provider, call);
        getCoordinator(provider).onCustomTabLaunched();

        provider.handleUserReturnedWithoutCallback();

        assertTrue(call.rejected);
        assertEquals(AppleRedirectLoginCoordinator.USER_CANCELLED_MESSAGE, call.rejectMessage);
        assertEquals(AppleRedirectLoginCoordinator.USER_CANCELLED_CODE, call.rejectCode);
        assertNull(getLastCall(provider));
    }

    @Test
    public void handleUserReturnedWithoutCallbackDoesNotCancelDuringTokenExchange() throws Exception {
        RecordingPluginCall call = new RecordingPluginCall();
        AppleProvider provider = new AppleProvider("https://example.com/callback", "client-id", null, null, false, false);
        setLastCall(provider, call);
        AppleRedirectLoginCoordinator coordinator = getCoordinator(provider);
        coordinator.onCustomTabLaunched();
        coordinator.onTokenExchangeStarted();

        provider.handleUserReturnedWithoutCallback();

        assertFalse(call.rejected);
        assertNotNull(getLastCall(provider));
    }

    @Test
    public void matchesPendingRedirectStateRequiresEqualNonNullValues() {
        assertTrue(AppleProvider.matchesPendingRedirectState("expected-state", "expected-state"));
        assertFalse(AppleProvider.matchesPendingRedirectState("expected-state", "other-state"));
        assertFalse(AppleProvider.matchesPendingRedirectState(null, "other-state"));
        assertFalse(AppleProvider.matchesPendingRedirectState("expected-state", null));
    }

    @Test
    public void afterCancelLastCallIsNullSoLoginWouldNotBeBlocked() throws Exception {
        RecordingPluginCall first = new RecordingPluginCall();
        AppleProvider provider = new AppleProvider("https://example.com/callback", "client-id", null, null, false, false);
        setLastCall(provider, first);
        getCoordinator(provider).onCustomTabLaunched();
        provider.handleUserReturnedWithoutCallback();

        assertTrue(first.rejected);
        assertNull(getLastCall(provider));
        assertFalse(getCoordinator(provider).shouldRejectOnActivityResume());
    }

    private static void setLastCall(AppleProvider provider, PluginCall call) throws Exception {
        Field lastCallField = AppleProvider.class.getDeclaredField("lastcall");
        lastCallField.setAccessible(true);
        lastCallField.set(provider, call);
    }

    private static PluginCall getLastCall(AppleProvider provider) throws Exception {
        Field lastCallField = AppleProvider.class.getDeclaredField("lastcall");
        lastCallField.setAccessible(true);
        return (PluginCall) lastCallField.get(provider);
    }

    private static AppleRedirectLoginCoordinator getCoordinator(AppleProvider provider) throws Exception {
        Field coordinatorField = AppleProvider.class.getDeclaredField("redirectLoginCoordinator");
        coordinatorField.setAccessible(true);
        return (AppleRedirectLoginCoordinator) coordinatorField.get(provider);
    }

    private static void assertFalse(boolean condition) {
        org.junit.Assert.assertFalse(condition);
    }

    private static final class RecordingPluginCall extends PluginCall {

        boolean rejected;
        String rejectMessage;
        String rejectCode;

        RecordingPluginCall() {
            super(null, "SocialLogin", "test-callback", "login", new JSObject());
        }

        @Override
        public void reject(String msg, String code) {
            rejected = true;
            rejectMessage = msg;
            rejectCode = code;
        }

        @Override
        public void reject(String msg, String code, Exception ex) {
            reject(msg, code);
        }

        @Override
        public void reject(String msg, Exception ex) {
            reject(msg, (String) null);
        }

        @Override
        public void reject(String msg) {
            reject(msg, (String) null);
        }
    }
}
