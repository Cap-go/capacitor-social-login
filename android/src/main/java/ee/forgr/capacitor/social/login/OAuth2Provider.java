package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
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
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
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

public class OAuth2Provider implements SocialProvider {

    public static final int REQUEST_CODE = 9402;
    private static final String LOG_TAG = "OAuth2Provider";
    private static final String PREFS_NAME = "CapgoOAuth2ProviderPrefs";
    private static final String PREFS_KEY_PREFIX = "OAuth2Tokens_";

    private final Activity activity;
    private final Context context;
    private final OkHttpClient httpClient;

    // Map of providerId -> OAuth2ProviderConfig
    private final Map<String, OAuth2ProviderConfig> providers = new HashMap<>();

    private PluginCall pendingCall;
    private OAuth2PendingState pendingState;

    private static class OAuth2ProviderConfig {

        final String appId;
        final String authorizationBaseUrl;
        final String accessTokenEndpoint;
        final String redirectUrl;
        final String resourceUrl;
        final String responseType;
        final boolean pkceEnabled;
        final String scope;
        final Map<String, String> additionalParameters;
        final Map<String, String> additionalResourceHeaders;
        final String logoutUrl;
        final boolean logsEnabled;

        OAuth2ProviderConfig(
            String appId,
            String authorizationBaseUrl,
            String accessTokenEndpoint,
            String redirectUrl,
            String resourceUrl,
            String responseType,
            boolean pkceEnabled,
            String scope,
            Map<String, String> additionalParameters,
            Map<String, String> additionalResourceHeaders,
            String logoutUrl,
            boolean logsEnabled
        ) {
            this.appId = appId;
            this.authorizationBaseUrl = authorizationBaseUrl;
            this.accessTokenEndpoint = accessTokenEndpoint;
            this.redirectUrl = redirectUrl;
            this.resourceUrl = resourceUrl;
            this.responseType = responseType;
            this.pkceEnabled = pkceEnabled;
            this.scope = scope;
            this.additionalParameters = additionalParameters;
            this.additionalResourceHeaders = additionalResourceHeaders;
            this.logoutUrl = logoutUrl;
            this.logsEnabled = logsEnabled;
        }
    }

    private static class OAuth2PendingState {

        final String providerId;
        final String state;
        final String codeVerifier;
        final String redirectUri;
        final String scope;

        OAuth2PendingState(String providerId, String state, String codeVerifier, String redirectUri, String scope) {
            this.providerId = providerId;
            this.state = state;
            this.codeVerifier = codeVerifier;
            this.redirectUri = redirectUri;
            this.scope = scope;
        }
    }

    public OAuth2Provider(Activity activity, Context context) {
        this.activity = activity;
        this.context = context;
        this.httpClient = new OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).build();
    }

    /**
     * Initialize multiple OAuth2 providers from a map of configs.
     * @param configs Map of providerId -> config JSONObject
     * @return List of error messages (empty if all succeeded)
     */
    public List<String> initializeProviders(JSONObject configs) throws JSONException {
        List<String> errors = new ArrayList<>();

        Iterator<String> keys = configs.keys();
        while (keys.hasNext()) {
            String providerId = keys.next();
            JSONObject config = configs.getJSONObject(providerId);

            String appId = config.optString("appId", null);
            String authorizationBaseUrl = config.optString("authorizationBaseUrl", null);
            String redirectUrl = config.optString("redirectUrl", null);

            if (appId == null || appId.isEmpty()) {
                errors.add("oauth2." + providerId + ".appId is required");
                continue;
            }
            if (authorizationBaseUrl == null || authorizationBaseUrl.isEmpty()) {
                errors.add("oauth2." + providerId + ".authorizationBaseUrl is required");
                continue;
            }
            if (redirectUrl == null || redirectUrl.isEmpty()) {
                errors.add("oauth2." + providerId + ".redirectUrl is required");
                continue;
            }

            Map<String, String> additionalParameters = null;
            if (config.has("additionalParameters")) {
                additionalParameters = jsonObjectToMap(config.getJSONObject("additionalParameters"));
            }

            Map<String, String> additionalResourceHeaders = null;
            if (config.has("additionalResourceHeaders")) {
                additionalResourceHeaders = jsonObjectToMap(config.getJSONObject("additionalResourceHeaders"));
            }

            OAuth2ProviderConfig providerConfig = new OAuth2ProviderConfig(
                appId,
                authorizationBaseUrl,
                config.optString("accessTokenEndpoint", null),
                redirectUrl,
                config.optString("resourceUrl", null),
                config.optString("responseType", "code"),
                config.optBoolean("pkceEnabled", true),
                config.optString("scope", ""),
                additionalParameters,
                additionalResourceHeaders,
                config.optString("logoutUrl", null),
                config.optBoolean("logsEnabled", false)
            );

            providers.put(providerId, providerConfig);

            if (providerConfig.logsEnabled) {
                Log.d(
                    LOG_TAG,
                    "Initialized provider '" + providerId + "' with appId: " + appId + ", authorizationBaseUrl: " + authorizationBaseUrl
                );
            }
        }

        return errors;
    }

    /**
     * @deprecated Use initializeProviders instead for multi-provider support
     */
    @Deprecated
    public void initialize(JSONObject config) throws JSONException {
        // Legacy single-provider init - create a default provider
        JSONObject wrapper = new JSONObject();
        wrapper.put("default", config);
        initializeProviders(wrapper);
    }

    private OAuth2ProviderConfig getProvider(String providerId) {
        return providers.get(providerId);
    }

    private String getTokenStorageKey(String providerId) {
        return PREFS_KEY_PREFIX + providerId;
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        String providerId = config != null ? config.optString("providerId", null) : null;
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 login");
            return;
        }

        OAuth2ProviderConfig providerConfig = getProvider(providerId);
        if (providerConfig == null) {
            call.reject("OAuth2 provider '" + providerId + "' is not initialized. Call initialize() first.");
            return;
        }

        if (pendingCall != null) {
            call.reject("Another OAuth2 login is already running.");
            return;
        }

        String loginScope = providerConfig.scope;
        if (config.has("scope")) {
            loginScope = config.optString("scope", providerConfig.scope);
        }

        String redirect = providerConfig.redirectUrl;
        if (config.has("redirectUrl")) {
            redirect = config.optString("redirectUrl", providerConfig.redirectUrl);
        }

        String state = config.has("state") ? config.optString("state", UUID.randomUUID().toString()) : UUID.randomUUID().toString();

        String codeVerifier = generateCodeVerifier();
        String codeChallenge;
        try {
            codeChallenge = generateCodeChallenge(codeVerifier);
        } catch (NoSuchAlgorithmException e) {
            call.reject("Unable to generate code challenge", e);
            return;
        }

        pendingState = new OAuth2PendingState(providerId, state, codeVerifier, redirect, loginScope);
        pendingCall = call;

        Uri.Builder builder = Uri.parse(providerConfig.authorizationBaseUrl)
            .buildUpon()
            .appendQueryParameter("response_type", providerConfig.responseType)
            .appendQueryParameter("client_id", providerConfig.appId)
            .appendQueryParameter("redirect_uri", redirect)
            .appendQueryParameter("state", state);

        if (!loginScope.isEmpty()) {
            builder.appendQueryParameter("scope", loginScope);
        }

        // Add PKCE for code flow
        if ("code".equals(providerConfig.responseType) && providerConfig.pkceEnabled) {
            builder.appendQueryParameter("code_challenge", codeChallenge);
            builder.appendQueryParameter("code_challenge_method", "S256");
        }

        // Add additional parameters from config
        if (providerConfig.additionalParameters != null) {
            for (Map.Entry<String, String> entry : providerConfig.additionalParameters.entrySet()) {
                builder.appendQueryParameter(entry.getKey(), entry.getValue());
            }
        }

        // Add additional parameters from login options
        if (config.has("additionalParameters")) {
            try {
                JSONObject loginParams = config.getJSONObject("additionalParameters");
                Iterator<String> keys = loginParams.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    builder.appendQueryParameter(key, loginParams.getString(key));
                }
            } catch (JSONException e) {
                Log.w(LOG_TAG, "Failed to parse additionalParameters", e);
            }
        }

        if (providerConfig.logsEnabled) {
            Log.d(LOG_TAG, "Opening authorization URL: " + builder.build().toString());
        }

        Intent intent = new Intent(activity, OAuth2LoginActivity.class);
        intent.putExtra(OAuth2LoginActivity.EXTRA_AUTH_URL, builder.build().toString());
        intent.putExtra(OAuth2LoginActivity.EXTRA_REDIRECT_URL, redirect);
        activity.startActivityForResult(intent, REQUEST_CODE);
    }

    @Override
    public void logout(PluginCall call) {
        String providerId = call.getString("providerId");
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 logout");
            return;
        }

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().remove(getTokenStorageKey(providerId)).apply();

        OAuth2ProviderConfig config = getProvider(providerId);
        if (config != null && config.logoutUrl != null && !config.logoutUrl.isEmpty()) {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(config.logoutUrl));
            activity.startActivity(browserIntent);
        }

        call.resolve();
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        String providerId = call.getString("providerId");
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 getAuthorizationCode");
            return;
        }

        OAuth2StoredTokens tokens = loadStoredTokens(providerId);
        if (tokens == null) {
            call.reject("OAuth2 access token not available for provider '" + providerId + "'");
            return;
        }
        JSObject response = new JSObject();
        response.put("accessToken", tokens.accessToken);
        if (tokens.refreshToken != null) {
            response.put("refreshToken", tokens.refreshToken);
        }
        if (tokens.idToken != null) {
            response.put("jwt", tokens.idToken);
        }
        response.put("tokenType", tokens.tokenType);
        call.resolve(response);
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        String providerId = call.getString("providerId");
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 isLoggedIn");
            return;
        }

        OAuth2StoredTokens tokens = loadStoredTokens(providerId);
        boolean isValid = tokens != null && tokens.expiresAt > System.currentTimeMillis();
        call.resolve(new JSObject().put("isLoggedIn", isValid));
    }

    @Override
    public void refresh(PluginCall call) {
        JSObject options = call.getObject("options");
        String providerId = options != null ? options.getString("providerId") : null;
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 refresh");
            return;
        }

        OAuth2ProviderConfig config = getProvider(providerId);
        if (config == null) {
            call.reject("OAuth2 provider '" + providerId + "' is not initialized.");
            return;
        }

        OAuth2StoredTokens tokens = loadStoredTokens(providerId);
        if (tokens == null || tokens.refreshToken == null) {
            call.reject("OAuth2 refresh token is not available. Make sure offline_access scope is granted.");
            return;
        }
        refreshWithToken(call, providerId, config, tokens.refreshToken);
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
            pendingCall.reject("State mismatch during OAuth2 login");
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

        // Check for code (authorization code flow)
        String code = data.getStringExtra("code");
        if (code != null) {
            exchangeAuthorizationCode(code);
            return true;
        }

        // Check for access_token (implicit flow)
        String accessToken = data.getStringExtra("access_token");
        if (accessToken != null) {
            handleImplicitFlowResponse(data);
            return true;
        }

        pendingCall.reject("No authorization code or access token in callback");
        cleanupPending();
        return true;
    }

    private void handleImplicitFlowResponse(Intent data) {
        if (pendingState == null) {
            if (pendingCall != null) {
                pendingCall.reject("Internal error: missing pending state");
                cleanupPending();
            }
            return;
        }

        String providerId = pendingState.providerId;
        OAuth2ProviderConfig config = getProvider(providerId);

        String accessToken = data.getStringExtra("access_token");
        String tokenType = data.getStringExtra("token_type");
        String expiresInStr = data.getStringExtra("expires_in");
        String scopeStr = data.getStringExtra("scope");
        String idToken = data.getStringExtra("id_token");

        int expiresIn = expiresInStr != null ? Integer.parseInt(expiresInStr) : 3600;
        List<String> scopes = scopeStr != null && !scopeStr.isEmpty() ? Arrays.asList(scopeStr.split(" ")) : Collections.emptyList();

        long expiresAt = System.currentTimeMillis() + (long) expiresIn * 1000L;

        // Fetch resource data if configured
        if (config != null && config.resourceUrl != null && !config.resourceUrl.isEmpty()) {
            fetchResource(
                config,
                accessToken,
                new ResourceCallback() {
                    @Override
                    public void onSuccess(JSONObject resourceData) {
                        completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, null, idToken, scopes, resourceData);
                    }

                    @Override
                    public void onError(String message) {
                        if (config.logsEnabled) {
                            Log.w(LOG_TAG, "Failed to fetch resource: " + message);
                        }
                        completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, null, idToken, scopes, null);
                    }
                }
            );
        } else {
            completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, null, idToken, scopes, null);
        }
    }

    private void exchangeAuthorizationCode(String code) {
        if (pendingState == null) {
            if (pendingCall != null) {
                pendingCall.reject("Internal error: missing pending state");
                cleanupPending();
            }
            return;
        }

        String providerId = pendingState.providerId;
        OAuth2ProviderConfig config = getProvider(providerId);

        if (config == null) {
            pendingCall.reject("OAuth2 provider '" + providerId + "' not found");
            cleanupPending();
            return;
        }

        if (config.accessTokenEndpoint == null || config.accessTokenEndpoint.isEmpty()) {
            pendingCall.reject("No accessTokenEndpoint configured for code exchange");
            cleanupPending();
            return;
        }

        FormBody.Builder bodyBuilder = new FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("client_id", config.appId)
            .add("code", code)
            .add("redirect_uri", pendingState.redirectUri);

        if (config.pkceEnabled) {
            bodyBuilder.add("code_verifier", pendingState.codeVerifier);
        }

        Request request = new Request.Builder().url(config.accessTokenEndpoint).post(bodyBuilder.build()).build();

        if (config.logsEnabled) {
            Log.d(LOG_TAG, "Exchanging code at: " + config.accessTokenEndpoint);
        }

        httpClient
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        if (pendingCall != null) {
                            pendingCall.reject("OAuth2 token exchange failed", e);
                        }
                        cleanupPending();
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            if (pendingCall != null) {
                                pendingCall.reject("OAuth2 token exchange failed: " + errorBody);
                            }
                            cleanupPending();
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject tokenPayload = new JSONObject(responseBody);
                            handleTokenSuccess(providerId, config, tokenPayload);
                        } catch (JSONException e) {
                            if (pendingCall != null) {
                                pendingCall.reject("Failed to parse OAuth2 token response", e);
                            }
                            cleanupPending();
                        }
                    }
                }
            );
    }

    private void refreshWithToken(final PluginCall pluginCall, String providerId, OAuth2ProviderConfig config, String refreshToken) {
        if (config.accessTokenEndpoint == null || config.accessTokenEndpoint.isEmpty()) {
            pluginCall.reject("No accessTokenEndpoint configured for refresh");
            return;
        }

        FormBody body = new FormBody.Builder()
            .add("grant_type", "refresh_token")
            .add("refresh_token", refreshToken)
            .add("client_id", config.appId)
            .build();

        Request request = new Request.Builder().url(config.accessTokenEndpoint).post(body).build();

        httpClient
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        pluginCall.reject("OAuth2 refresh failed", e);
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            pluginCall.reject("OAuth2 refresh failed: " + errorBody);
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject tokenPayload = new JSONObject(responseBody);
                            handleTokenSuccess(providerId, config, tokenPayload, pluginCall);
                        } catch (JSONException e) {
                            pluginCall.reject("Failed to parse OAuth2 refresh response", e);
                        }
                    }
                }
            );
    }

    private void handleTokenSuccess(String providerId, OAuth2ProviderConfig config, JSONObject tokenPayload) throws JSONException {
        handleTokenSuccess(providerId, config, tokenPayload, pendingCall);
        cleanupPending();
    }

    private void handleTokenSuccess(String providerId, OAuth2ProviderConfig config, JSONObject tokenPayload, PluginCall call)
        throws JSONException {
        if (call == null) {
            return;
        }

        final String accessToken = tokenPayload.getString("access_token");
        final String tokenType = tokenPayload.optString("token_type", "bearer");
        final int expiresIn = tokenPayload.optInt("expires_in", 3600);
        final String refreshToken = tokenPayload.optString("refresh_token", null);
        final String idToken = tokenPayload.optString("id_token", null);
        final String scopeRaw = tokenPayload.optString("scope", "");
        final List<String> scopes = scopeRaw.isEmpty() ? Collections.emptyList() : Arrays.asList(scopeRaw.split(" "));

        final long expiresAt = System.currentTimeMillis() + (long) expiresIn * 1000L;

        // Fetch resource data if configured
        if (config.resourceUrl != null && !config.resourceUrl.isEmpty()) {
            fetchResource(
                config,
                accessToken,
                new ResourceCallback() {
                    @Override
                    public void onSuccess(JSONObject resourceData) {
                        completeLogin(
                            providerId,
                            accessToken,
                            tokenType,
                            expiresIn,
                            expiresAt,
                            refreshToken,
                            idToken,
                            scopes,
                            resourceData,
                            call
                        );
                    }

                    @Override
                    public void onError(String message) {
                        if (config.logsEnabled) {
                            Log.w(LOG_TAG, "Failed to fetch resource: " + message);
                        }
                        completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, refreshToken, idToken, scopes, null, call);
                    }
                }
            );
        } else {
            completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, refreshToken, idToken, scopes, null, call);
        }
    }

    private void completeLogin(
        String providerId,
        String accessToken,
        String tokenType,
        int expiresIn,
        long expiresAt,
        String refreshToken,
        String idToken,
        List<String> scopes,
        JSONObject resourceData
    ) {
        completeLogin(providerId, accessToken, tokenType, expiresIn, expiresAt, refreshToken, idToken, scopes, resourceData, pendingCall);
        cleanupPending();
    }

    private void completeLogin(
        String providerId,
        String accessToken,
        String tokenType,
        int expiresIn,
        long expiresAt,
        String refreshToken,
        String idToken,
        List<String> scopes,
        JSONObject resourceData,
        PluginCall call
    ) {
        if (call == null) {
            return;
        }

        persistTokens(providerId, accessToken, refreshToken, idToken, tokenType, expiresAt, scopes);

        JSObject accessTokenObject = new JSObject();
        accessTokenObject.put("token", accessToken);
        accessTokenObject.put("tokenType", tokenType);
        accessTokenObject.put(
            "expires",
            new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX").format(new java.util.Date(expiresAt))
        );
        if (refreshToken != null) {
            accessTokenObject.put("refreshToken", refreshToken);
        }

        JSObject result = new JSObject();
        result.put("providerId", providerId);
        result.put("accessToken", accessTokenObject);
        result.put("idToken", idToken != null ? idToken : JSONObject.NULL);
        result.put("refreshToken", refreshToken != null ? refreshToken : JSONObject.NULL);
        result.put("resourceData", resourceData != null ? resourceData : JSONObject.NULL);
        result.put("scope", new JSArray(scopes));
        result.put("tokenType", tokenType);
        result.put("expiresIn", expiresIn);

        JSObject response = new JSObject();
        response.put("provider", "oauth2");
        response.put("result", result);
        call.resolve(response);
    }

    private interface ResourceCallback {
        void onSuccess(JSONObject resourceData);
        void onError(String message);
    }

    private void fetchResource(OAuth2ProviderConfig config, String accessToken, ResourceCallback callback) {
        Request.Builder requestBuilder = new Request.Builder().url(config.resourceUrl).addHeader("Authorization", "Bearer " + accessToken);

        if (config.additionalResourceHeaders != null) {
            for (Map.Entry<String, String> entry : config.additionalResourceHeaders.entrySet()) {
                requestBuilder.addHeader(entry.getKey(), entry.getValue());
            }
        }

        httpClient
            .newCall(requestBuilder.build())
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(Call call, IOException e) {
                        callback.onError("Failed to fetch resource: " + e.getMessage());
                    }

                    @Override
                    public void onResponse(Call call, Response response) throws IOException {
                        if (!response.isSuccessful()) {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            callback.onError("Failed to fetch resource: " + errorBody);
                            return;
                        }
                        String responseBody = response.body() != null ? response.body().string() : "";
                        try {
                            JSONObject data = new JSONObject(responseBody);
                            callback.onSuccess(data);
                        } catch (JSONException e) {
                            callback.onError("Failed to parse resource response");
                        }
                    }
                }
            );
    }

    private void persistTokens(
        String providerId,
        String accessToken,
        String refreshToken,
        String idToken,
        String tokenType,
        long expiresAt,
        List<String> scopes
    ) {
        try {
            JSONObject stored = new JSONObject();
            stored.put("accessToken", accessToken);
            stored.put("tokenType", tokenType);
            stored.put("expiresAt", expiresAt);
            stored.put("refreshToken", refreshToken);
            stored.put("idToken", idToken);
            stored.put("scope", new JSONArray(scopes));
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(getTokenStorageKey(providerId), stored.toString()).apply();
        } catch (JSONException e) {
            Log.w(LOG_TAG, "Failed to persist OAuth2 tokens", e);
        }
    }

    private OAuth2StoredTokens loadStoredTokens(String providerId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(getTokenStorageKey(providerId), null);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        try {
            JSONObject object = new JSONObject(raw);
            String accessToken = object.optString("accessToken", null);
            if (accessToken == null || accessToken.isEmpty()) {
                return null;
            }
            return new OAuth2StoredTokens(
                accessToken,
                object.optString("refreshToken", null),
                object.optString("idToken", null),
                object.optLong("expiresAt", 0L),
                object.optString("tokenType", "bearer")
            );
        } catch (JSONException e) {
            Log.w(LOG_TAG, "Failed to parse stored OAuth2 tokens", e);
            return null;
        }
    }

    private void cleanupPending() {
        pendingCall = null;
        pendingState = null;
    }

    private static Map<String, String> jsonObjectToMap(JSONObject json) throws JSONException {
        Map<String, String> map = new HashMap<>();
        Iterator<String> keys = json.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            map.put(key, json.getString(key));
        }
        return map;
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

    private static class OAuth2StoredTokens {

        final String accessToken;
        final String refreshToken;
        final String idToken;
        final long expiresAt;
        final String tokenType;

        OAuth2StoredTokens(String accessToken, String refreshToken, String idToken, long expiresAt, String tokenType) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.idToken = idToken;
            this.expiresAt = expiresAt;
            this.tokenType = tokenType;
        }
    }
}
