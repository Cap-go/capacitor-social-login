package ee.forgr.capacitor.social.login;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

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
    public void validateRequestJsonAcceptsNonBlank() {
        GoogleRestoreCredentialHelper.validateRequestJson("{\"challenge\":\"abc\"}");
        assertTrue(true);
    }
}
