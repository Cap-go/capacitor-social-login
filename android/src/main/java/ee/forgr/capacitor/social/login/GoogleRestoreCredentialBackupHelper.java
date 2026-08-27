package ee.forgr.capacitor.social.login;

import android.content.Context;
import androidx.annotation.NonNull;

/**
 * Helper for silent Google Restore Credential retrieval after Android backup restore.
 *
 * <p>Register a {@link android.app.backup.BackupAgent} in your app and call
 * {@link #onRestoreFinished(Context, String, Callback)} from {@code onRestoreFinished()} (not
 * {@code onRestore()} — the latter is only used for key-value backups).
 *
 * <p>Your server must supply WebAuthn authentication request JSON ({@code requestJson}). Send the
 * returned {@code responseJson} to your backend to complete sign-in (same path as passkey auth).
 *
 * @see <a href="https://developer.android.com/identity/sign-in/restore-credentials-implementation">Restore Credentials implementation guide</a>
 */
public final class GoogleRestoreCredentialBackupHelper {

    private GoogleRestoreCredentialBackupHelper() {}

    /**
     * Callback for restore credential retrieval after backup restore.
     */
    public interface Callback {
        /** Restore credential authentication response JSON for your server. */
        void onSuccess(String responseJson);

        /** No restore credential is available on this device (user not eligible or not yet created). */
        void onNoCredential();

        /** Retrieval failed or was cancelled. */
        void onError(String message);
    }

    /**
     * Fetch a restore credential after app data backup restore completes.
     *
     * @param context Application or activity context
     * @param requestJson WebAuthn authentication request JSON from your server
     * @param callback Result handler
     */
    public static void onRestoreFinished(@NonNull Context context, @NonNull String requestJson, @NonNull Callback callback) {
        try {
            GoogleRestoreCredentialHelper.validateRequestJson(requestJson);
        } catch (IllegalArgumentException e) {
            callback.onError(e.getMessage());
            return;
        }

        GoogleRestoreCredentialHelper.getRestoreCredential(
            context,
            requestJson,
            new androidx.credentials.CredentialManagerCallback<String, Exception>() {
                @Override
                public void onResult(String responseJson) {
                    callback.onSuccess(responseJson);
                }

                @Override
                public void onError(@NonNull Exception e) {
                    if (e instanceof androidx.credentials.exceptions.NoCredentialException) {
                        callback.onNoCredential();
                        return;
                    }
                    String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                    callback.onError(message);
                }
            }
        );
    }
}
