package ee.forgr.capacitor.social.login;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreateRestoreCredentialRequest;
import androidx.credentials.CreateRestoreCredentialResponse;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetRestoreCredentialOption;
import androidx.credentials.RestoreCredential;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.CreateCredentialUnknownException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.credentials.exceptions.restorecredential.E2eeUnavailableException;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Shared Restore Credentials operations for Google Sign-In (Android Credential Manager).
 *
 * <p>Used by {@link GoogleProvider} and {@link GoogleRestoreCredentialBackupHelper} so apps can
 * retrieve restore credentials from {@link android.app.backup.BackupAgent#onRestoreFinished()}
 * without going through the Capacitor bridge.
 */
public final class GoogleRestoreCredentialHelper {

    private static final String LOG_TAG = "GoogleRestoreCredential";

    private GoogleRestoreCredentialHelper() {}

    public static ClearCredentialStateRequest buildClearRestoreCredentialRequest() {
        return new ClearCredentialStateRequest(ClearCredentialStateRequest.TYPE_CLEAR_RESTORE_CREDENTIAL);
    }

    public static void validateRequestJson(String requestJson) {
        if (requestJson == null || requestJson.trim().isEmpty()) {
            throw new IllegalArgumentException("requestJson is required");
        }
        try {
            new JSONObject(requestJson);
        } catch (JSONException e) {
            throw new IllegalArgumentException("requestJson must be valid JSON");
        }
    }

    static void validateCreateRequestJson(String requestJson) {
        validateRequestJson(requestJson);
        try {
            JSONObject object = new JSONObject(requestJson);
            if (!object.has("challenge")) {
                throw new IllegalArgumentException("requestJson must include challenge");
            }
            JSONObject user = object.optJSONObject("user");
            if (user == null || !user.has("id")) {
                throw new IllegalArgumentException("requestJson must include user.id");
            }
        } catch (JSONException e) {
            throw new IllegalArgumentException("requestJson must be valid JSON");
        }
    }

    static void validateGetRequestJson(String requestJson) {
        validateRequestJson(requestJson);
        try {
            JSONObject object = new JSONObject(requestJson);
            if (!object.has("challenge")) {
                throw new IllegalArgumentException("requestJson must include challenge");
            }
        } catch (JSONException e) {
            throw new IllegalArgumentException("requestJson must be valid JSON");
        }
    }

    private static void reportCreateRequestJsonError(
        IllegalArgumentException error,
        CredentialManagerCallback<CreateRestoreCredentialResponse, CreateCredentialException> callback
    ) {
        String message = error.getMessage() != null ? error.getMessage() : "Invalid requestJson";
        callback.onError(new CreateCredentialUnknownException(message));
    }

    public static CredentialManager credentialManagerOrCreate(Context context) {
        return CredentialManager.create(context);
    }

    public static void createRestoreCredential(
        Context context,
        String requestJson,
        boolean isCloudBackupEnabled,
        CredentialManagerCallback<CreateRestoreCredentialResponse, CreateCredentialException> callback
    ) {
        try {
            validateCreateRequestJson(requestJson);
            CreateRestoreCredentialRequest request = new CreateRestoreCredentialRequest(requestJson, isCloudBackupEnabled);
            CredentialManager credentialManager = credentialManagerOrCreate(context);
            createRestoreCredentialInternal(credentialManager, context, request, isCloudBackupEnabled, requestJson, callback);
        } catch (IllegalArgumentException e) {
            reportCreateRequestJsonError(e, callback);
        }
    }

    private static void createRestoreCredentialInternal(
        CredentialManager credentialManager,
        Context context,
        CreateRestoreCredentialRequest request,
        boolean isCloudBackupEnabled,
        String requestJson,
        CredentialManagerCallback<CreateRestoreCredentialResponse, CreateCredentialException> callback
    ) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        credentialManager.createCredentialAsync(
            context,
            request,
            null,
            executor,
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override
                public void onResult(CreateCredentialResponse response) {
                    executor.shutdown();
                    if (response instanceof CreateRestoreCredentialResponse) {
                        callback.onResult((CreateRestoreCredentialResponse) response);
                        return;
                    }
                    try {
                        CreateRestoreCredentialResponse typed = CreateRestoreCredentialResponse.createFrom(response.getData());
                        callback.onResult(typed);
                    } catch (Exception e) {
                        callback.onError(
                            new CreateCredentialUnknownException("Unexpected create credential response type: " + response.getType())
                        );
                    }
                }

                @Override
                public void onError(@NonNull CreateCredentialException e) {
                    if (isCloudBackupEnabled && e instanceof E2eeUnavailableException) {
                        executor.shutdown();
                        Log.w(LOG_TAG, "Cloud backup unavailable for restore credential; retrying with local-only storage.");
                        try {
                            CreateRestoreCredentialRequest retryRequest = new CreateRestoreCredentialRequest(requestJson, false);
                            createRestoreCredentialInternal(credentialManager, context, retryRequest, false, requestJson, callback);
                        } catch (IllegalArgumentException retryError) {
                            reportCreateRequestJsonError(retryError, callback);
                        }
                        return;
                    }
                    executor.shutdown();
                    callback.onError(e);
                }
            }
        );
    }

    public static void getRestoreCredential(Context context, String requestJson, CredentialManagerCallback<String, Exception> callback) {
        try {
            validateGetRequestJson(requestJson);
            GetRestoreCredentialOption restoreOption = new GetRestoreCredentialOption(requestJson);
            CredentialManager credentialManager = credentialManagerOrCreate(context);
            GetCredentialRequest getRequest = new GetCredentialRequest.Builder().addCredentialOption(restoreOption).build();
            getRestoreCredentialInternal(credentialManager, context, getRequest, callback);
        } catch (IllegalArgumentException e) {
            callback.onError(e);
        }
    }

    /**
     * Blocks until restore credential retrieval completes. Intended for {@link
     * android.app.backup.BackupAgent#onRestoreFinished()} where the callback must finish before the
     * method returns.
     */
    public static void getRestoreCredentialSynchronously(
        Context context,
        String requestJson,
        CredentialManagerCallback<String, Exception> callback
    ) {
        try {
            validateGetRequestJson(requestJson);
            GetRestoreCredentialOption restoreOption = new GetRestoreCredentialOption(requestJson);
            CredentialManager credentialManager = credentialManagerOrCreate(context);
            GetCredentialRequest getRequest = new GetCredentialRequest.Builder().addCredentialOption(restoreOption).build();

            ListenableFuture<String> future = CallbackToFutureAdapter.getFuture((completer) -> {
                getRestoreCredentialInternal(
                    credentialManager,
                    context,
                    getRequest,
                    new CredentialManagerCallback<String, Exception>() {
                        @Override
                        public void onResult(String result) {
                            completer.set(result);
                        }

                        @Override
                        public void onError(@NonNull Exception e) {
                            completer.setException(e);
                        }
                    }
                );
                return "GoogleRestoreCredentialHelper.getRestoreCredentialSynchronously";
            });

            try {
                callback.onResult(future.get(60, TimeUnit.SECONDS));
            } catch (ExecutionException e) {
                Throwable cause = e.getCause();
                if (cause instanceof Exception) {
                    callback.onError((Exception) cause);
                } else {
                    callback.onError(new IllegalStateException(cause != null ? cause.getMessage() : e.getMessage()));
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                callback.onError(e);
            } catch (TimeoutException e) {
                callback.onError(e);
            }
        } catch (IllegalArgumentException e) {
            callback.onError(e);
        }
    }

    private static void getRestoreCredentialInternal(
        CredentialManager credentialManager,
        Context context,
        GetCredentialRequest getRequest,
        CredentialManagerCallback<String, Exception> callback
    ) {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        credentialManager.getCredentialAsync(
            context,
            getRequest,
            null,
            executor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse response) {
                    executor.shutdown();
                    try {
                        String responseJson = extractRestoreCredentialJson(response);
                        if (responseJson == null) {
                            callback.onError(new IllegalStateException("Restore credential response JSON is empty"));
                            return;
                        }
                        callback.onResult(responseJson);
                    } catch (Exception e) {
                        callback.onError(e);
                    }
                }

                @Override
                public void onError(@NonNull GetCredentialException e) {
                    executor.shutdown();
                    if (e instanceof NoCredentialException) {
                        callback.onError(e);
                        return;
                    }
                    if (e instanceof GetCredentialCancellationException) {
                        callback.onError(e);
                        return;
                    }
                    callback.onError(e);
                }
            }
        );
    }

    public static String extractRestoreCredentialJson(GetCredentialResponse response) {
        Credential credential = response.getCredential();
        if (credential instanceof RestoreCredential) {
            return ((RestoreCredential) credential).getAuthenticationResponseJson();
        }
        if (credential instanceof CustomCredential && RestoreCredential.TYPE_RESTORE_CREDENTIAL.equals(credential.getType())) {
            RestoreCredential restoreCredential = RestoreCredential.createFrom$credentials_release(credential.getData());
            return restoreCredential.getAuthenticationResponseJson();
        }
        return null;
    }

    public static void clearRestoreCredential(Context context, CredentialManagerCallback<Void, Exception> callback) {
        CredentialManager credentialManager = credentialManagerOrCreate(context);
        ClearCredentialStateRequest request = buildClearRestoreCredentialRequest();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        credentialManager.clearCredentialStateAsync(
            request,
            null,
            executor,
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void unused) {
                    executor.shutdown();
                    callback.onResult(null);
                }

                @Override
                public void onError(@NonNull ClearCredentialException e) {
                    executor.shutdown();
                    callback.onError(e);
                }
            }
        );
    }
}
