package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import androidx.annotation.NonNull;
import androidx.credentials.CreateRestoreCredentialResponse;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.CreateCredentialUnknownException;
import org.junit.Test;

public class GoogleRestoreCredentialHelperTest {

    @Test
    public void validateRequestJsonRejectsNull() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
            GoogleRestoreCredentialHelper.validateRequestJson(null)
        );
        assertEquals("requestJson is required", error.getMessage());
    }

    @Test
    public void validateRequestJsonRejectsBlank() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
            GoogleRestoreCredentialHelper.validateRequestJson("   ")
        );
        assertEquals("requestJson is required", error.getMessage());
    }

    @Test
    public void validateRequestJsonRejectsMalformedJson() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () ->
            GoogleRestoreCredentialHelper.validateRequestJson("{not-json")
        );
        assertEquals("requestJson must be valid JSON", error.getMessage());
    }

    @Test
    public void validateRequestJsonAcceptsValidJson() {
        GoogleRestoreCredentialHelper.validateRequestJson("{\"challenge\":\"abc\"}");
        assertTrue(true);
    }

    @Test
    public void createRestoreCredentialReportsMalformedJsonThroughCallback() {
        RecordingCreateCallback callback = new RecordingCreateCallback();
        GoogleRestoreCredentialHelper.createRestoreCredential(null, "{not-json", true, callback);
        assertNotNull(callback.error);
        assertTrue(callback.error instanceof CreateCredentialUnknownException);
        assertEquals("requestJson must be valid JSON", callback.error.getErrorMessage().toString());
    }

    @Test
    public void createRestoreCredentialReportsInvalidCreateRequestThroughCallback() {
        RecordingCreateCallback callback = new RecordingCreateCallback();
        GoogleRestoreCredentialHelper.createRestoreCredential(null, "{}", true, callback);
        assertNotNull(callback.error);
        assertTrue(callback.error instanceof CreateCredentialUnknownException);
    }

    @Test
    public void getRestoreCredentialReportsMalformedJsonThroughCallback() {
        RecordingGetCallback callback = new RecordingGetCallback();
        GoogleRestoreCredentialHelper.getRestoreCredential(null, "{not-json", callback);
        assertNotNull(callback.error);
        assertTrue(callback.error instanceof IllegalArgumentException);
        assertEquals("requestJson must be valid JSON", callback.error.getMessage());
    }

    private static final class RecordingCreateCallback
        implements CredentialManagerCallback<CreateRestoreCredentialResponse, CreateCredentialException> {

        private CreateCredentialException error;

        @Override
        public void onResult(CreateRestoreCredentialResponse result) {}

        @Override
        public void onError(@NonNull CreateCredentialException e) {
            error = e;
        }
    }

    private static final class RecordingGetCallback implements CredentialManagerCallback<String, Exception> {

        private Exception error;

        @Override
        public void onResult(String result) {}

        @Override
        public void onError(@NonNull Exception e) {
            error = e;
        }
    }
}
