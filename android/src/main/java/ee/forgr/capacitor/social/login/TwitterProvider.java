package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class TwitterProvider implements SocialProvider {

    public static final int REQUEST_CODE = 9401;
    private static final String LOG_TAG = "TwitterProvider";
    private static final String TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token";
    private static final String PROFILE_ENDPOINT = "https://api.x.com/2/users/me";
    private static final String PREFS_NAME = "CapgoTwitterProviderPrefs";
    private static final String PREFS_KEY = "TwitterTokens";

    private final Activity activity;
    private final Context context;
    private final OkHttpClient httpClient;

    private String clientId;
    private String redirectUri;
    private List<String> defaultScopes = Arrays.asList("tweet.read", "users.read");
    private boolean forceLogin = false;
    private String audience;

    private PluginCall pendingCall;
    private TwitterPendingState pendingState;

    private static class TwitterPendingState {

        final String state;
        final String codeVerifier;
        final String redirectUri;
        final List<String> scopes;

        TwitterPendingState(String state, String codeVerifier, String redirectUri, List<String> scopes) {
            this.state = state;
            this.codeVerifier = codeVerifier;
            this.redirectUri = redirectUri;
            this.scopes = scopes;
        }
    }

    public TwitterProvider(Activity activity, Context context) {
        this.activity = activity;
        this.context = context;
        this.httpClient = new OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build();
    }

    public void initialize(JSONObject config) throws JSONException {
        this.clientId = config.getString("clientId");
        this.redirectUri = config.getString("redirectUrl");
        if (config.has("defaultScopes")) {
            JSONArray scopesArray = config.getJSONArray("defaultScopes");
            this.defaultScopes = jsonArrayToList(scopesArray);
        }
        this.forceLogin = config.optBoolean("forceLogin", false);
        this.audience = config.optString("audience", null);
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        if (clientId == null || redirectUri == null) {
            call.reject("Twitter provider is not initialized. Call initialize() first.");
            return;
        }
        if (pendingCall != null) {
            call.reject("Another Twitter login is already running.");
            return;
        }

        List<String> scopes = defaultScopes;
        if (config != null && config.has("scopes")) {
            try {
                scopes = jsonArrayToList(config.getJSONArray("scopes"));
            } catch (JSONException e) {
                call.reject("Invalid scopes format", e);
                return;
            }
        }
        boolean forceLoginOverride = config != null && config.has("forceLogin") ? config.optBoolean("forceLogin", forceLogin) : forceLogin;
        String redirect = redirectUri;
        if (config != null && config.has("redirectUrl")) {
            redirect = config.optString("redirectUrl", redirectUri);
        }

        String state = config != null && config.has("state")
            ? config.optString("state", UUID.randomUUID().toString())
            : UUID.randomUUID().toString();
        String codeVerifier = generateCodeVerifier();
        String codeChallenge;
        try {
            codeChallenge = generateCodeChallenge(codeVerifier);
        } catch (NoSuchAlgorithmException e) {
            call.reject("Unable to generate code challenge", e);
            return;
        }

        pendingState = new TwitterPendingState(state, codeVerifier, redirect, scopes);
        pendingCall = call;

        Uri.Builder builder = Uri.parse("https://x.com/i/oauth2/authorize")
            .buildUpon()
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("redirect_uri", redirect)
            .appendQueryParameter("scope", TextUtils.join(" ", scopes))
            .appendQueryParameter("state", state)
            .appendQueryParameter("code_challenge", codeChallenge)
            .appendQueryParameter("code_challenge_method", "S256");
        if (forceLoginOverride) {
            builder.appendQueryParameter("force_login", "true");
        }
        if (audience != null && !audience.isEmpty()) {
            builder.appendQueryParameter("audience", audience);
        }

        Intent intent = new Intent(activity, TwitterLoginActivity.class);
        intent.putExtra(TwitterLoginActivity.EXTRA_AUTH_URL, builder.build().toString());
        intent.putExtra(TwitterLoginActivity.EXTRA_REDIRECT_URL, redirect);
        activity.startActivityForResult(intent, REQUEST_CODE);
    }

    @Override
    public void logout(PluginCall call) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().remove(PREFS_KEY).apply();
        call.resolve();
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        TwitterStoredTokens tokens = loadStoredTokens();
        if (tokens == null) {
            call.reject("Twitter access token not available");
            return;
        }
        JSObject response = new JSObject();
        response.put("accessToken", tokens.accessToken);
        if (tokens.refreshToken != null) {
            response.put("refreshToken", tokens.refreshToken);
        }
        response.put("tokenType", tokens.tokenType);
        call.resolve(response);
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        TwitterStoredTokens tokens = loadStoredTokens();
        boolean isValid = tokens != null && tokens.expiresAt > System.currentTimeMillis();
        if (!isValid) {
            call.resolve(new JSObject().put("isLoggedIn", false));
        } else {
            call.resolve(new JSObject().put("isLoggedIn", true));
        }
    }

    @Override
    public void refresh(PluginCall call) {
        TwitterStoredTokens tokens = loadStoredTokens();
        if (tokens == null || tokens.refreshToken == null) {
            call.reject("Twitter refresh token is not available. Make sure offline.access scope is granted.");
            return;
        }
        refreshWithToken(call, tokens.refreshToken);
    }

    public boolean handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CODE) {
            return false;
        }
        if (pendingCall == null || pendingState == null) {
            return true;
        }

        if (resultCode != Activity.RESULT_OK) {
            String error = data != null ? data.getStringExtra("error") : "User cancelled";
            pendingCall.reject(error != null ? error : "User cancelled");
            cleanupPending();
            return true;
        }

        String returnedState = data.getStringExtra("state");
        if (returnedState == null || !returnedState.equals(pendingState.state)) {
            pendingCall.reject("State mismatch during Twitter login");
            cleanupPending();
            return true;
        }

        String error = data.getStringExtra("error");
        if (error != null) {
            String description = data.getStringExtra("error_description");
            pendingCall.reject(description != null ? description : error);
            cleanupPending();
            return true;
        }

        String code = data.getStringExtra("code");
        if (code == null) {
            pendingCall.reject("Authorization code missing");
            cleanupPending();
            return true;
        }

        exchangeAuthorizationCode(code);
        return true;
    }

    private void exchangeAuthorizationCode(String code) {
        if (pendingState == null) {
            if (pendingCall != null) {
                pendingCall.reject("Internal error: missing pending state");
                cleanupPending();
            }
            return;
        }

        FormBody body = new FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("client_id", clientId)
            .add("code", code)
            .add("redirect_uri", pendingState.redirectUri)
            .add("code_verifier", pendingState.codeVerifier)
            .build();

        Request request = new Request.Builder().url(TOKEN_ENDPOINT).post(body).build();
        httpClient
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        if (pendingCall != null) {
                            pendingCall.reject("Twitter token exchange failed", e);
                        }
                        cleanupPending();
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            if (pendingCall != null) {
                                pendingCall.reject("Twitter token exchange failed: " + errorBody);
                            }
                            cleanupPending();
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject tokenPayload = new JSONObject(responseBody);
                            handleTokenSuccess(tokenPayload);
                        } catch (JSONException e) {
                            if (pendingCall != null) {
                                pendingCall.reject("Failed to parse Twitter token response", e);
                            }
                            cleanupPending();
                        }
                    }
                }
            );
    }

    private void refreshWithToken(final PluginCall pluginCall, String refreshToken) {
        FormBody body = new FormBody.Builder()
            .add("grant_type", "refresh_token")
            .add("refresh_token", refreshToken)
            .add("client_id", clientId)
            .build();

        Request request = new Request.Builder().url(TOKEN_ENDPOINT).post(body).build();
        httpClient
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        pluginCall.reject("Twitter refresh failed", e);
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            pluginCall.reject("Twitter refresh failed: " + errorBody);
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject tokenPayload = new JSONObject(responseBody);
                            handleTokenSuccess(tokenPayload, pluginCall);
                        } catch (JSONException e) {
                            pluginCall.reject("Failed to parse Twitter refresh response", e);
                        }
                    }
                }
            );
    }

    private void handleTokenSuccess(JSONObject tokenPayload) throws JSONException {
        handleTokenSuccess(tokenPayload, pendingCall);
        cleanupPending();
    }

    private void handleTokenSuccess(JSONObject tokenPayload, PluginCall call) throws JSONException {
        if (call == null) {
            return;
        }
        final String accessToken = tokenPayload.getString("access_token");
        final String tokenType = tokenPayload.optString("token_type", "bearer");
        final int expiresIn = tokenPayload.optInt("expires_in", 0);
        final String refreshToken = tokenPayload.optString("refresh_token", null);
        final String scopeRaw = tokenPayload.optString("scope", "");
        final List<String> scopes = scopeRaw.isEmpty() ? Collections.emptyList() : Arrays.asList(scopeRaw.split(" "));

        fetchProfile(
            accessToken,
            new ProfileCallback() {
                @Override
                public void onSuccess(JSONObject profile) {
                    persistTokens(accessToken, refreshToken, tokenType, expiresIn, profile);
                    JSObject accessTokenObject = new JSObject();
                    accessTokenObject.put("token", accessToken);
                    accessTokenObject.put("tokenType", tokenType);
                    accessTokenObject.put("expiresIn", expiresIn);
                    if (refreshToken != null) {
                        accessTokenObject.put("refreshToken", refreshToken);
                    }

                    JSObject result = new JSObject();
                    result.put("accessToken", accessTokenObject);
                    result.put("profile", profile);
                    result.put("scope", new JSArray(scopes));
                    result.put("tokenType", tokenType);
                    result.put("expiresIn", expiresIn);

                    JSObject response = new JSObject();
                    response.put("provider", "twitter");
                    response.put("result", result);
                    call.resolve(response);
                }

                @Override
                public void onError(String message) {
                    call.reject(message);
                }
            }
        );
    }

    private interface ProfileCallback {
        void onSuccess(JSONObject profile);
        void onError(String message);
    }

    private void fetchProfile(String accessToken, ProfileCallback callback) {
        Uri uri = Uri.parse(PROFILE_ENDPOINT)
            .buildUpon()
            .appendQueryParameter("user.fields", "profile_image_url,verified,name,username")
            .build();
        Request request = new Request.Builder().url(uri.toString()).addHeader("Authorization", "Bearer " + accessToken).build();

        httpClient
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        callback.onError("Failed to fetch Twitter profile: " + e.getMessage());
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            callback.onError("Failed to fetch Twitter profile: " + errorBody);
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject payload = new JSONObject(responseBody);
                            JSONObject data = payload.getJSONObject("data");
                            JSONObject profile = new JSONObject();
                            profile.put("id", data.optString("id"));
                            profile.put("username", data.optString("username"));
                            profile.put("name", data.optString("name"));
                            profile.put("profileImageUrl", data.optString("profile_image_url", ""));
                            profile.put("verified", data.optBoolean("verified", false));
                            if (data.has("email")) {
                                profile.put("email", data.optString("email", null));
                            } else {
                                profile.put("email", JSONObject.NULL);
                            }
                            callback.onSuccess(profile);
                        } catch (JSONException e) {
                            callback.onError("Failed to parse Twitter profile response");
                        }
                    }
                }
            );
    }

    private void persistTokens(String accessToken, String refreshToken, String tokenType, int expiresIn, JSONObject profile) {
        try {
            JSONObject stored = new JSONObject();
            stored.put("accessToken", accessToken);
            stored.put("tokenType", tokenType);
            stored.put("expiresAt", System.currentTimeMillis() + (long) expiresIn * 1000L);
            stored.put("refreshToken", refreshToken);
            stored.put("userId", profile.optString("id"));
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(PREFS_KEY, stored.toString()).apply();
        } catch (JSONException e) {
            Log.w(LOG_TAG, "Failed to persist Twitter tokens", e);
        }
    }

    private TwitterStoredTokens loadStoredTokens() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        try {
            JSONObject object = new JSONObject(raw);
            String accessToken = object.optString("accessToken", null);
            if (accessToken == null || accessToken.isEmpty()) {
                return null;
            }
            return new TwitterStoredTokens(
                accessToken,
                object.optString("refreshToken", null),
                object.optLong("expiresAt", 0L),
                object.optString("tokenType", "bearer")
            );
        } catch (JSONException e) {
            Log.w(LOG_TAG, "Failed to parse stored Twitter tokens", e);
            return null;
        }
    }

    private void cleanupPending() {
        pendingCall = null;
        pendingState = null;
    }

    private static List<String> jsonArrayToList(JSONArray array) throws JSONException {
        List<String> list = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            list.add(array.getString(i));
        }
        return list;
    }

    private static String generateCodeVerifier() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] code = new byte[64];
        secureRandom.nextBytes(code);
        return Base64.encodeToString(code, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static String generateCodeChallenge(String verifier) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(verifier.getBytes(StandardCharsets.US_ASCII));
        return Base64.encodeToString(hash, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private static class TwitterStoredTokens {

        final String accessToken;
        final String refreshToken;
        final long expiresAt;
        final String tokenType;

        TwitterStoredTokens(String accessToken, String refreshToken, long expiresAt, String tokenType) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.expiresAt = expiresAt;
            this.tokenType = tokenType;
        }
    }
}
