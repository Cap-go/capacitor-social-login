package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.common.util.concurrent.ListenableFuture;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

public class GoogleProvider implements SocialProvider {

    private static final String LOG_TAG = "GoogleProvider";
    private static final String SHARED_PREFERENCE_NAME = "GOOGLE_LOGIN_F13oz0I_SHARED_PERF";
    private static final String GOOGLE_DATA_PREFERENCE = "GOOGLE_LOGIN_GOOGLE_DATA_9158025e-947d-4211-ba51-40451630cc47";
    private static final Integer FUTURE_LIST_LENGTH = 128;
    private static final String TOKEN_REQUEST_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

    public static final Integer REQUEST_AUTHORIZE_GOOGLE_MIN = 583892990;
    public static final Integer REQUEST_AUTHORIZE_GOOGLE_MAX = REQUEST_AUTHORIZE_GOOGLE_MIN + GoogleProvider.FUTURE_LIST_LENGTH;

    private final Activity activity;
    private final Context context;
    private CredentialManager credentialManager;
    private String clientId;
    private String[] scopes;
    private final List<CallbackToFutureAdapter.Completer<AuthorizationResult>> futuresList = new ArrayList<>(FUTURE_LIST_LENGTH);

    private String idToken = null;
    private String accessToken = null;
    private GoogleProviderLoginType mode = GoogleProviderLoginType.ONLINE;
    private String hostedDomain = null;

    public enum GoogleProviderLoginType {
        ONLINE,
        OFFLINE
    }

    public GoogleProvider(Activity activity, Context context) {
        this.activity = activity;
        this.context = context;

        for (int i = 0; i < FUTURE_LIST_LENGTH; i++) {
            futuresList.add(null);
        }
    }

    public void initialize(String clientId, GoogleProviderLoginType mode, String hostedDomain) {
        this.credentialManager = CredentialManager.create(activity);
        this.clientId = clientId;
        this.mode = mode;
        this.hostedDomain = hostedDomain;

        String data = context.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE).getString(GOOGLE_DATA_PREFERENCE, null);

        if (data == null || data.isEmpty()) {
            Log.i(SocialLoginPlugin.LOG_TAG, "No data to restore for google login");
            return;
        }
        try {
            JSONObject object = new JSONObject(data);
            GoogleProvider.this.idToken = object.optString("idToken", null);
            GoogleProvider.this.accessToken = object.optString("accessToken", null);

            Log.i(SocialLoginPlugin.LOG_TAG, String.format("Google restoreState: %s", object));
        } catch (JSONException e) {
            Log.e(SocialLoginPlugin.LOG_TAG, "Google restoreState: Failed to parse JSON", e);
        }
    }

    public ListenableFuture<Boolean> accessTokenIsValid(String accessToken) {
        return CallbackToFutureAdapter.getFuture((completer) -> {
            OkHttpClient client = new OkHttpClient();
            Request tokenRequest = new Request.Builder().url(TOKEN_REQUEST_URL + "?" + "access_token=" + accessToken).get().build();

            client
                .newCall(tokenRequest)
                .enqueue(
                    new Callback() {
                        @Override
                        public void onFailure(@NonNull Call call, @NonNull IOException e) {}

                        @Override
                        public void onResponse(@NonNull Call httpCall, @NonNull Response httpResponse) throws IOException {
                            if (!httpResponse.isSuccessful()) {
                                completer.set(false);
                                Log.i(
                                    LOG_TAG,
                                    String.format(
                                        "Invalid response from %s. Response not successful. Status code: %s. Assuming that the token is not valid",
                                        TOKEN_REQUEST_URL,
                                        httpResponse.code()
                                    )
                                );
                                return;
                            }

                            ResponseBody responseBody = httpResponse.body();
                            if (responseBody == null) {
                                completer.setException(
                                    new RuntimeException(
                                        String.format("Invalid response from %s. Response body is null", TOKEN_REQUEST_URL)
                                    )
                                );
                                Log.e(LOG_TAG, String.format("Invalid response from %s. Response body is null", TOKEN_REQUEST_URL));
                                return;
                            }

                            String responseString = responseBody.string();
                            JSONObject jsonObject;
                            try {
                                jsonObject = (JSONObject) new JSONTokener(responseString).nextValue();
                            } catch (JSONException e) {
                                completer.setException(
                                    new RuntimeException(
                                        String.format(
                                            "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                            TOKEN_REQUEST_URL,
                                            e
                                        )
                                    )
                                );
                                Log.e(
                                    LOG_TAG,
                                    String.format(
                                        "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                        TOKEN_REQUEST_URL,
                                        e
                                    )
                                );
                                return;
                            }

                            String expiresIn;
                            try {
                                expiresIn = jsonObject.getString("expires_in");
                            } catch (JSONException e) {
                                completer.setException(
                                    new RuntimeException(
                                        String.format(
                                            "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                                            TOKEN_REQUEST_URL,
                                            e
                                        )
                                    )
                                );
                                Log.e(
                                    LOG_TAG,
                                    String.format(
                                        "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                                        TOKEN_REQUEST_URL,
                                        e
                                    )
                                );
                                return;
                            }

                            int expressInInt;
                            try {
                                expressInInt = Integer.parseInt(expiresIn);
                            } catch (Exception e) {
                                completer.setException(
                                    new RuntimeException(
                                        String.format(
                                            "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                                            TOKEN_REQUEST_URL,
                                            expiresIn,
                                            e
                                        )
                                    )
                                );
                                Log.e(
                                    LOG_TAG,
                                    String.format(
                                        "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                                        TOKEN_REQUEST_URL,
                                        expiresIn,
                                        e
                                    )
                                );
                                return;
                            }

                            completer.set(expressInInt > 5);
                        }
                    }
                );

            return "AccessTokenIsValidOperationTag";
        });
    }

    private boolean idTokenValid(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                return false;
            }

            // Decode payload (second part)
            String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.DEFAULT));
            JSONObject parsed = new JSONObject(payload);

            // Get current time in seconds
            long currentTime = System.currentTimeMillis() / 1000 + 5;

            // Check if token is expired
            if (parsed.has("exp")) {
                long expTime = parsed.getLong("exp");
                return currentTime < expTime;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public String arrayFind(String[] array, String search) {
        for (String s : array) {
            if (s.equals(search)) {
                return s;
            }
        }
        return null;
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        if (this.clientId == null || this.clientId.isEmpty()) {
            call.reject("Google Sign-In failed: Client ID is not set");
            return;
        }

        if (this.mode == GoogleProviderLoginType.OFFLINE && !(this.activity instanceof ModifiedMainActivityForSocialLoginPlugin)) {
            call.reject("You CANNOT use offline mode without modifying the main activity. Please follow the docs!");
            return;
        }

        String nonce = config.optString("nonce");
        JSONObject options = call.getObject("options", new JSObject());
        boolean bottomUi = false;
        boolean forcePrompt = false;
        boolean filterByAuthorizedAccounts = false;
        boolean autoSelectEnabled = false;

        try {
            if (options != null) {
                bottomUi = options.has("style") && Objects.equals(options.getString("style"), "bottom");
                filterByAuthorizedAccounts = options.has("filterByAuthorizedAccounts") && options.getBoolean("filterByAuthorizedAccounts");
                autoSelectEnabled = options.has("autoSelectEnabled") && options.getBoolean("autoSelectEnabled");
                forcePrompt = options.has("forcePrompt") && options.getBoolean("forcePrompt");
            }
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Error parsing options", e);
            call.reject("Error parsing options: " + e.getMessage());
            return;
        }

        // Handle scopes
        JSONArray scopesArray = config.optJSONArray("scopes");
        Set<String> uniqueScopes = new HashSet<>();

        // Add default scopes
        uniqueScopes.add("https://www.googleapis.com/auth/userinfo.email");
        uniqueScopes.add("https://www.googleapis.com/auth/userinfo.profile");
        uniqueScopes.add("openid");

        // Add custom scopes if provided
        if (scopesArray != null) {
            if (!(this.activity instanceof ModifiedMainActivityForSocialLoginPlugin)) {
                call.reject("You CANNOT use scopes without modifying the main activity. Please follow the docs!");
                return;
            }
            for (int i = 0; i < scopesArray.length(); i++) {
                uniqueScopes.add(scopesArray.optString(i));
            }
        }

        this.scopes = uniqueScopes.toArray(new String[0]);

        // Build credential request
        GetCredentialRequest.Builder requestBuilder = new GetCredentialRequest.Builder();

        if (bottomUi) {
            Log.e(LOG_TAG, "use bottomUi");
            GetGoogleIdOption.Builder googleIdOptionBuilder = new GetGoogleIdOption.Builder().setServerClientId(this.clientId);
            // Handle bottom UI specific options
            if (forcePrompt) {
                filterByAuthorizedAccounts = false;
                autoSelectEnabled = false;
            }

            if (!nonce.isEmpty()) {
                googleIdOptionBuilder.setNonce(nonce);
            }
            if (filterByAuthorizedAccounts) {
                googleIdOptionBuilder.setFilterByAuthorizedAccounts(true);
            }

            if (autoSelectEnabled) {
                googleIdOptionBuilder.setAutoSelectEnabled(true);
            }

            GetGoogleIdOption googleIdOptionFiltered = googleIdOptionBuilder.build();
            requestBuilder.addCredentialOption(googleIdOptionFiltered);
        } else {
            // For standard UI, we don't use these options
            GetSignInWithGoogleOption.Builder googleIdOptionBuilder = new GetSignInWithGoogleOption.Builder(this.clientId);

            if (!nonce.isEmpty()) {
                googleIdOptionBuilder.setNonce(nonce);
            }
            if (this.hostedDomain != null && !this.hostedDomain.isEmpty()) {
                googleIdOptionBuilder.setHostedDomainFilter(this.hostedDomain);
            }

            requestBuilder.addCredentialOption(googleIdOptionBuilder.build());
        }

        GetCredentialRequest filteredRequest = requestBuilder.build();

        // Execute credential request
        Executor executor = Executors.newSingleThreadExecutor();
        credentialManager.getCredentialAsync(
            context,
            filteredRequest,
            null,
            executor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse result) {
                    handleSignInResult(result, call);
                }

                @Override
                public void onError(@NonNull GetCredentialException e) {
                    handleSignInError(e, call, config);
                }
            }
        );
    }

    private void persistState(String idToken, String accessToken) throws JSONException {
        JSONObject object = new JSONObject();
        object.put("idToken", idToken);
        object.put("accessToken", accessToken);

        GoogleProvider.this.idToken = idToken;
        GoogleProvider.this.accessToken = accessToken;

        activity
            .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(GOOGLE_DATA_PREFERENCE, object.toString())
            .apply();
    }

    private ListenableFuture<AuthorizationResult> getAuthorizationResult(Boolean forceRefreshToken) {
        //      Account account = new Account(credential.getId(), "com.google");
        //      String scopesString = "oauth2:" + TextUtils.join(" ", this.scopes);
        //      String token = GoogleAuthUtil.getToken(
        //        this.context,
        //        account,
        //        scopesString
        //      );
        //
        //      AccessToken accessToken = new AccessToken();
        //      accessToken.token = token;
        //      accessToken.userId = credential.getId();
        //      // Note: We don't have exact expiration time, so we're not setting it here
        //
        //      return accessToken;

        ListenableFuture<AuthorizationResult> future = CallbackToFutureAdapter.getFuture((completer) -> {
            List<Scope> scopes = new ArrayList<>(this.scopes.length);
            for (String scope : this.scopes) {
                scopes.add(new Scope(scope));
            }
            AuthorizationRequest.Builder authorizationRequestBuilder = AuthorizationRequest.builder().setRequestedScopes(scopes);
            // .requestOfflineAccess(this.clientId)

            if (GoogleProvider.this.mode == GoogleProviderLoginType.OFFLINE) {
                authorizationRequestBuilder = authorizationRequestBuilder.requestOfflineAccess(this.clientId, forceRefreshToken);
            }

            AuthorizationRequest authorizationRequest = authorizationRequestBuilder.build();

            Identity.getAuthorizationClient(context)
                .authorize(authorizationRequest)
                .addOnSuccessListener((authorizationResult) -> {
                    if (authorizationResult.hasResolution()) {
                        // Access needs to be granted by the user
                        PendingIntent pendingIntent = authorizationResult.getPendingIntent();
                        if (pendingIntent == null) {
                            completer.setException(new RuntimeException("pendingIntent is null"));
                            Log.e(LOG_TAG, "pendingIntent is null");
                            return;
                        }

                        // Find an index to put the future into.
                        int fututeIndex = -1;
                        for (int i = 0; i < futuresList.size(); i++) {
                            if (futuresList.get(i) == null) {
                                fututeIndex = i;
                                break;
                            }
                        }

                        if (fututeIndex == -1) {
                            completer.setException(new RuntimeException("Cannot find index for future"));
                            Log.e(LOG_TAG, "Cannot find index for future. Too many login requests??");
                            return;
                        }

                        futuresList.set(fututeIndex, completer);

                        try {
                            activity.startIntentSenderForResult(
                                pendingIntent.getIntentSender(),
                                GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN + fututeIndex,
                                null,
                                0,
                                0,
                                0,
                                null
                            );
                        } catch (IntentSender.SendIntentException e) {
                            Log.e(LOG_TAG, "Couldn't start Authorization UI: " + e.getLocalizedMessage());
                            completer.setException(e);
                        }
                    } else {
                        // Access already granted, continue with user action
                        //saveToDriveAppFolder(authorizationResult);
                        if (this.mode == GoogleProviderLoginType.ONLINE) {
                            if (authorizationResult.getAccessToken() == null) {
                                completer.setException(new RuntimeException("getAccessToken() is null"));
                                return;
                            }
                        } else if (this.mode == GoogleProviderLoginType.OFFLINE) {
                            if (authorizationResult.getServerAuthCode() == null) {
                                completer.setException(new RuntimeException("getAccessToken() is null"));
                                return;
                            }
                        }

                        completer.set(authorizationResult);
                    }
                })
                .addOnFailureListener((e) -> {
                    completer.setException(new RuntimeException("Failed to authorize"));
                    Log.e(LOG_TAG, "Failed to authorize", e);
                });

            return "GetAccessTokenOperationTag";
        });

        return future;
    }

    private void handleSignInResult(GetCredentialResponse result, PluginCall call) {
        try {
            Credential credential = result.getCredential();
            if (credential instanceof CustomCredential) {
                if (GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                    JSObject user = handleSignInResult(result);
                    JSObject response = new JSObject();
                    response.put("provider", "google");
                    JSObject resultObj = new JSObject();

                    JSONObject options = call.getObject("options", new JSObject());
                    Boolean forceRefreshToken = false;
                    try {
                        forceRefreshToken = options != null && options.has("forceRefreshToken") && options.getBoolean("forceRefreshToken");
                    } catch (JSONException e) {
                        Log.e(LOG_TAG, "Error parsing forceRefreshToken option", e);
                    }

                    GoogleIdTokenCredential googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.getData());
                    ListenableFuture<AuthorizationResult> future = getAuthorizationResult(forceRefreshToken);

                    // Use ExecutorService to retrieve the access token
                    ExecutorService executor = Executors.newSingleThreadExecutor();

                    executor.execute(
                        new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    AuthorizationResult result = future.get();
                                    if (GoogleProvider.this.mode == GoogleProviderLoginType.ONLINE) {
                                        if (result.getAccessToken() != null) {
                                            JSObject accessTokenObj = new JSObject();
                                            accessTokenObj.put("token", result.getAccessToken());
                                            // accessTokenObj.put("userId", accessToken.userId);

                                            resultObj.put("accessToken", accessTokenObj);
                                            resultObj.put("profile", user);
                                            resultObj.put("idToken", googleIdTokenCredential.getIdToken());
                                            resultObj.put("responseType", "online");
                                            response.put("result", resultObj);
                                            persistState(googleIdTokenCredential.getIdToken(), result.getAccessToken());
                                            call.resolve(response);
                                        } else {
                                            call.reject("Failed to get access token");
                                        }
                                    } else {
                                        if (result.getServerAuthCode() != null) {
                                            resultObj.put("responseType", "offline");
                                            resultObj.put("serverAuthCode", result.getServerAuthCode());
                                            response.put("result", resultObj);
                                            call.resolve(response);
                                        } else {
                                            call.reject("Failed to get serverAuthCode");
                                        }
                                    }
                                } catch (Exception e) {
                                    call.reject("Error retrieving access token: " + e.getMessage());
                                } finally {
                                    executor.shutdown();
                                }
                            }
                        }
                    );

                    return; // The call will be resolved in the Runnable
                }
            }

            // If we reach here, something went wrong
            call.reject("Failed to get Google credentials");
        } catch (Exception e) {
            call.reject("Error handling sign-in result: " + e.getMessage());
        }
    }

    public void handleAuthorizationIntent(int requestCode, Intent data) {
        int futureIndex = requestCode - GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN;
        if (futureIndex < 0 || futureIndex >= futuresList.size()) {
            Log.e(
                LOG_TAG,
                String.format(
                    "Invalid future index. REQUEST_AUTHORIZE_GOOGLE_MIN: %d, requestCode: %d, futures list length: %d, futureIndex: %d",
                    REQUEST_AUTHORIZE_GOOGLE_MIN,
                    requestCode,
                    futuresList.size(),
                    futureIndex
                )
            );
            return;
        }

        CallbackToFutureAdapter.Completer<AuthorizationResult> future = futuresList.get(futureIndex);

        try {
            AuthorizationResult authorizationResult = Identity.getAuthorizationClient(this.activity).getAuthorizationResultFromIntent(data);
            future.set(authorizationResult);
        } catch (ApiException e) {
            Log.e(LOG_TAG, "Cannot get getAuthorizationResultFromIntent", e);
            future.setException(new RuntimeException("Cannot get getAuthorizationResultFromIntent"));
        }
    }

    private void handleSignInError(GetCredentialException e, PluginCall call, JSONObject config) {
        Log.e(LOG_TAG, "Google Sign-In failed", e);
        boolean isBottomUi = false;
        JSONObject options = call.getObject("options", new JSObject());
        if (options.has("style")) {
            try {
                isBottomUi = options.getString("style").equals("bottom");
            } catch (JSONException ex) {
                // do nothing
            }
        }
        if (e instanceof NoCredentialException) {
            // Check if filterByAuthorizedAccounts is set (default is false if not explicitly set to false)
            boolean filterByAuthorizedAccountsValue = false;
            try {
                if (options.has("filterByAuthorizedAccounts")) {
                    filterByAuthorizedAccountsValue = options.getBoolean("filterByAuthorizedAccounts");
                }
            } catch (JSONException ex) {
                // Ignore, use default
            }

            if (isBottomUi) {
                Log.e(
                    LOG_TAG,
                    "No Google accounts available with bottomUi. This may be due to Family Link supervised accounts when filterByAuthorizedAccounts is true. Switching to standard UI."
                );
                // During the get credential flow, this is returned when no viable credential is available for the the user. This can be caused by various scenarios such as that the user doesn't have any credential or the user doesn't grant consent to using any available credential. Upon this exception, your app should navigate to use the regular app sign-up or sign-in screen.
                // https://developer.android.com/reference/androidx/credentials/exceptions/NoCredentialException
                // Note: Family Link supervised accounts may cause this error when filterByAuthorizedAccounts is true
                try {
                    options.put("style", "standard");
                    call.getData().put("options", options);
                } catch (JSONException ex) {
                    call.reject("Google Sign-In failed: " + ex.getMessage());
                    return;
                }
                login(call, config);
            } else {
                // If it's already standard UI, provide more detailed error message
                if (filterByAuthorizedAccountsValue) {
                    call.reject(
                        "Google Sign-In failed: No credentials available. If signing in with a Family Link supervised account, try setting filterByAuthorizedAccounts to false."
                    );
                } else {
                    call.reject("Google Sign-In failed: " + e.getMessage());
                }
            }
        } else {
            call.reject("Google Sign-In failed: " + e.getMessage());
        }
    }

    private JSObject handleSignInResult(GetCredentialResponse result) throws JSONException {
        JSObject user = new JSObject();
        Log.d(LOG_TAG, "handleSignInResult: " + result.toString());

        Credential credential = result.getCredential();
        if (credential instanceof CustomCredential) {
            if (GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                GoogleIdTokenCredential googleIdTokenCredential = GoogleIdTokenCredential.createFrom(
                    ((CustomCredential) credential).getData()
                );
                user.put("id", googleIdTokenCredential.getId());
                user.put("name", googleIdTokenCredential.getDisplayName());
                user.put("email", googleIdTokenCredential.getId());
                user.put("familyName", googleIdTokenCredential.getFamilyName());
                user.put("givenName", googleIdTokenCredential.getGivenName());
                user.put("imageUrl", googleIdTokenCredential.getProfilePictureUri());

                try {
                    String[] parts = googleIdTokenCredential.getIdToken().split("\\.");
                    if (parts.length != 3) {
                        throw new RuntimeException("JWT parts length != 3 (how is this possible??)");
                    }

                    // Decode payload (second part)
                    String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.DEFAULT));
                    JSONObject parsed = new JSONObject(payload);

                    // Get current time in seconds
                    long currentTime = System.currentTimeMillis() / 1000 + 5;

                    // Check if token is expired
                    if (parsed.has("sub")) {
                        String sub = parsed.getString("sub");
                        user.put("id", sub);
                    } else {
                        throw new RuntimeException("No SUB field in the JWT");
                    }
                } catch (Exception e) {
                    Log.e(LOG_TAG, "Cannot get id from id_token", e);
                }
            }
        }
        return user;
    }

    private void rawLogout(CredentialManagerCallback<Void, Exception> handler) {
        Log.i(LOG_TAG, "Logout requested");
        ClearCredentialStateRequest request = new ClearCredentialStateRequest();

        Executor executor = Executors.newSingleThreadExecutor();
        credentialManager.clearCredentialStateAsync(
            request,
            null,
            executor,
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void result) {
                    context.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE).edit().clear().apply();
                    GoogleProvider.this.accessToken = null;
                    GoogleProvider.this.idToken = null;
                    handler.onResult(null);
                }

                @Override
                public void onError(@NonNull ClearCredentialException e) {
                    Log.e(LOG_TAG, "Failed to clear credential state", e);
                    handler.onError(e);
                }
            }
        );
    }

    @Override
    public void logout(PluginCall call) {
        if (this.mode == GoogleProviderLoginType.OFFLINE) {
            call.reject("logout is not implemented when using offline mode");
            return;
        }
        rawLogout(
            new CredentialManagerCallback<Void, Exception>() {
                @Override
                public void onResult(Void unused) {
                    call.resolve();
                }

                @Override
                public void onError(@NonNull Exception e) {
                    call.reject("Failed to clear credential state: " + e.getMessage());
                }
            }
        );
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        if (this.mode == GoogleProviderLoginType.OFFLINE) {
            call.reject("getAuthorizationCode is not implemented when using offline mode");
            return;
        }
        if (GoogleProvider.this.idToken != null && GoogleProvider.this.accessToken != null) {
            try {
                // Check if access token is valid
                ListenableFuture<Boolean> accessTokenValidFuture = accessTokenIsValid(GoogleProvider.this.accessToken);
                boolean isValidAccessToken = accessTokenValidFuture.get(7, TimeUnit.SECONDS);
                boolean isValidIdToken = idTokenValid(GoogleProvider.this.idToken);

                if (!isValidAccessToken || !isValidIdToken) {
                    rawLogout(
                        new CredentialManagerCallback<>() {
                            @Override
                            public void onResult(Void unused) {
                                call.reject("User is not logged in");
                            }

                            @Override
                            public void onError(@NonNull Exception e) {
                                // This is a non-fatal error. Let's log it
                                Log.e(LOG_TAG, "Saved access token isn't valid, but logout failed", e);
                                call.reject("User is not logged in");
                            }
                        }
                    );
                } else {
                    call.resolve(
                        new JSObject().put("accessToken", GoogleProvider.this.accessToken).put("jwt", GoogleProvider.this.idToken)
                    );
                }
            } catch (Exception e) {
                Log.e(LOG_TAG, "Error validating tokens", e);
                call.reject("Error validating tokens: " + e.getMessage());
            }
        } else {
            call.reject("User is not logged in");
        }
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        if (this.mode == GoogleProviderLoginType.OFFLINE) {
            call.reject("isLoggedIn is not implemented when using offline mode");
            return;
        }
        if (GoogleProvider.this.idToken != null && GoogleProvider.this.accessToken != null) {
            try {
                // Check if access token is valid
                ListenableFuture<Boolean> accessTokenValidFuture = accessTokenIsValid(GoogleProvider.this.accessToken);
                boolean isValidAccessToken = accessTokenValidFuture.get(7, TimeUnit.SECONDS);
                boolean isValidIdToken = idTokenValid(GoogleProvider.this.idToken);

                if (!isValidAccessToken || !isValidIdToken) {
                    rawLogout(
                        new CredentialManagerCallback<>() {
                            @Override
                            public void onResult(Void unused) {
                                call.resolve(new JSObject().put("isLoggedIn", false));
                            }

                            @Override
                            public void onError(@NonNull Exception e) {
                                // This is a non-fatal error. Let's log it
                                Log.e(LOG_TAG, "Saved access token isn't valid, but logout failed", e);
                                call.resolve(new JSObject().put("isLoggedIn", false));
                            }
                        }
                    );
                } else {
                    call.resolve(new JSObject().put("isLoggedIn", true));
                }
            } catch (Exception e) {
                Log.e(LOG_TAG, "Error validating tokens", e);
                call.reject("Error validating tokens: " + e.getMessage());
            }
        } else {
            call.resolve(new JSObject().put("isLoggedIn", false));
        }
    }

    @Override
    public void refresh(PluginCall call) {
        // Implement refresh logic here
        call.reject("Not implemented");
    }
}
