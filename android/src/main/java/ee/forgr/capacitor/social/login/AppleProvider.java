package ee.forgr.capacitor.social.login;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.auth0.android.jwt.JWT;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.util.Objects;
import java.util.UUID;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

public class AppleProvider implements SocialProvider {

    private static final String LOG_TAG = "AppleProvider";
    private static final String DEFAULT_SCOPE = "name%20email";
    private static final String AUTHURL = "https://appleid.apple.com/auth/authorize";
    private static final String TOKENURL = "https://appleid.apple.com/auth/token";
    private static final String SHARED_PREFERENCE_NAME = "APPLE_LOGIN_Q16ob0k_SHARED_PERF";
    private static final String APPLE_DATA_PREFERENCE = "APPLE_LOGIN_APPLE_DATA_83b2d6db-17fe-49c9-8c33-e3f5d02f9f84";

    private PluginCall lastcall;
    private String appleAuthURLFull;

    private String idToken;
    private String refreshToken;
    private String accessToken;

    private final String clientId;
    private final String redirectUrl;
    private final Activity activity;
    private final Context context;
    private final boolean useProperTokenExchange;
    private final boolean useBroadcastChannel;

    private CustomTabsClient customTabsClient;
    private CustomTabsSession currentSession;
    CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
        @Override
        public void onCustomTabsServiceConnected(@NonNull ComponentName name, CustomTabsClient client) {
            customTabsClient = client;
            client.warmup(0);
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {}
    };

    public AppleProvider(
        String redirectUrl,
        String clientId,
        Activity activity,
        Context context,
        boolean useProperTokenExchange,
        boolean useBroadcastChannel
    ) {
        this.redirectUrl = redirectUrl;
        this.clientId = clientId;
        this.activity = activity;
        this.context = context;
        this.useProperTokenExchange = useProperTokenExchange;
        this.useBroadcastChannel = useBroadcastChannel;
    }

    public void initialize() {
        String data = context.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE).getString(APPLE_DATA_PREFERENCE, null);

        if (data == null || data.isEmpty()) {
            Log.i(SocialLoginPlugin.LOG_TAG, "No data to restore for apple login");
            return;
        }
        try {
            JSONObject object = new JSONObject(data);
            String idToken = object.optString("idToken", null);
            String refreshToken = object.optString("refreshToken", null);
            String accessToken = object.optString("accessToken", null);
            AppleProvider.this.idToken = idToken;
            AppleProvider.this.refreshToken = refreshToken;
            AppleProvider.this.accessToken = accessToken;
            Log.i(SocialLoginPlugin.LOG_TAG, String.format("Apple restoreState: %s", object));
        } catch (JSONException e) {
            Log.e(SocialLoginPlugin.LOG_TAG, "Apple restoreState: Failed to parse JSON", e);
        }
    }

    public void handleIntent(Intent intent) {
        // Extract information from the URI
        Uri data = intent.getData();

        // Data should never be null
        assert data != null;

        String scheme = data.getScheme(); // "capgo-demo-app"
        String host = data.getHost(); // "path"
        String path = data.getPath(); // Additional path segments
        String query = data.getQuery(); // Query parameters

        Log.i(SocialLoginPlugin.LOG_TAG, String.format("Received apple login intent: %s, %s, %s, %s", scheme, host, path, query));

        handleUrl(data.toString());
        //    if (data.toString().contains("success=")) {
        //      this.currentSession.
        //    }
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        if (this.lastcall != null) {
            call.reject("Last call is not null");
            return;
        }

        // Save the call reference immediately so it's always available
        this.lastcall = call;
        call.setKeepAlive(true);

        // Check if Broadcast Channel is enabled
        boolean useBroadcastChannel = config.optBoolean("useBroadcastChannel", this.useBroadcastChannel);

        if (useBroadcastChannel) {
            // Use Broadcast Channel approach - simplified flow
            loginWithBroadcastChannel(call, config);
        } else {
            // Use traditional URL redirect approach
            loginWithRedirect(call, config);
        }
    }

    private void loginWithBroadcastChannel(PluginCall call, JSONObject config) {
        String state = UUID.randomUUID().toString();

        // Extract scopes from config
        String scopes = DEFAULT_SCOPE;
        if (config.has("scopes")) {
            try {
                JSONArray scopesArray = config.getJSONArray("scopes");
                if (scopesArray.length() > 0) {
                    scopes = String.join("%20", toStringArray(scopesArray));
                }
            } catch (JSONException e) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Error parsing scopes", e);
            }
        }

        String nonce = null;
        if (config.has("nonce")) {
            try {
                nonce = config.getString("nonce");
            } catch (JSONException e) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Error parsing nonce", e);
            }
        }

        // For Broadcast Channel, we use a special redirect URI that handles the channel communication
        String broadcastRedirectUri = "https://capacitor-social-login.firebaseapp.com/__/auth/handler";

        this.appleAuthURLFull =
            AUTHURL +
            "?client_id=" +
            this.clientId +
            "&redirect_uri=" +
            broadcastRedirectUri +
            "&response_type=code&scope=" +
            scopes +
            "&response_mode=form_post&state=" +
            state;

        if (nonce != null) {
            this.appleAuthURLFull += "&nonce=" + nonce;
        }

        if (context == null || activity == null) {
            this.lastcall.reject("Context or Activity is null");
            this.lastcall = null;
            return;
        }

        activity.runOnUiThread(() -> setupBroadcastChannelWebview(context, activity, call, appleAuthURLFull));
    }

    private void loginWithRedirect(PluginCall call, JSONObject config) {
        String state = UUID.randomUUID().toString();

        // Extract scopes from config
        String scopes = DEFAULT_SCOPE;
        if (config.has("scopes")) {
            try {
                JSONArray scopesArray = config.getJSONArray("scopes");
                if (scopesArray.length() > 0) {
                    scopes = String.join("%20", toStringArray(scopesArray));
                }
            } catch (JSONException e) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Error parsing scopes", e);
            }
        }

        String nonce = null;
        if (config.has("nonce")) {
            try {
                nonce = config.getString("nonce");
            } catch (JSONException e) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Error parsing nonce", e);
            }
        }

        this.appleAuthURLFull =
            AUTHURL +
            "?client_id=" +
            this.clientId +
            "&redirect_uri=" +
            this.redirectUrl +
            "&response_type=code&scope=" +
            scopes +
            "&response_mode=form_post&state=" +
            state;

        if (nonce != null) {
            this.appleAuthURLFull += "&nonce=" + nonce;
        }

        if (context == null || activity == null) {
            this.lastcall.reject("Context or Activity is null");
            this.lastcall = null;
            return;
        }

        activity.runOnUiThread(() -> setupWebview(context, activity, call, appleAuthURLFull));
    }

    @Override
    public void logout(PluginCall call) {
        if (this.idToken == null || this.idToken.isEmpty()) {
            call.reject("Not logged in; Cannot logout");
            return;
        }

        context.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE).edit().clear().apply();
        this.idToken = null;
        this.refreshToken = null;
        this.accessToken = null;

        call.resolve();
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        if (this.idToken != null && !this.idToken.isEmpty()) {
            call.resolve(new JSObject().put("jwt", this.idToken));
        } else {
            call.reject("Apple-login not logged in!");
        }
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        if (this.idToken != null && !this.idToken.isEmpty()) {
            try {
                JWT jwt = new JWT(this.idToken);
                boolean isLoggedIn = !jwt.isExpired(0);
                call.resolve(new JSObject().put("isLoggedIn", isLoggedIn));
            } catch (Exception e) {
                call.reject("Error checking login status", e);
            }
        } else {
            call.resolve(new JSObject().put("isLoggedIn", false));
        }
    }

    @Override
    public void refresh(PluginCall call) {
        call.reject("Not implemented");
    }

    public void handleUrl(String url) {
        if (this.lastcall == null) {
            Log.e(SocialLoginPlugin.LOG_TAG, "handleUrl called but lastcall is null");
            return;
        }

        Uri uri = Uri.parse(url);
        String success = uri.getQueryParameter("success");
        if ("true".equals(success)) {
            String accessToken = uri.getQueryParameter("access_token");
            if (accessToken != null) {
                // We have proper tokens from the backend
                String refreshToken = uri.getQueryParameter("refresh_token");
                String idToken = uri.getQueryParameter("id_token");
                try {
                    persistState(idToken, refreshToken, accessToken);
                    JSObject result = new JSObject();
                    result.put("accessToken", createAccessTokenObject(accessToken));
                    result.put("profile", createProfileObject(idToken));
                    result.put("idToken", idToken);

                    // For proper token exchange mode, don't include authorization code
                    if (!useProperTokenExchange) {
                        result.put("authorizationCode", (String) null);
                    }

                    JSObject response = new JSObject();
                    response.put("provider", "apple");
                    response.put("result", result);

                    this.lastcall.resolve(response);
                } catch (JSONException e) {
                    Log.e(SocialLoginPlugin.LOG_TAG, "Cannot persist state", e);
                    this.lastcall.reject("Cannot persist state", e);
                }
            } else {
                // We only have authorization code, need to exchange it
                String appleAuthCode = uri.getQueryParameter("code");
                String appleClientSecret = uri.getQueryParameter("client_secret");

                if (useProperTokenExchange) {
                    // In proper token exchange mode, we should have received proper tokens
                    // from the backend. If we only got an auth code, reject the call.
                    this.lastcall.reject("Expected proper tokens from backend but received authorization code only");
                } else {
                    // Legacy mode: exchange the authorization code for tokens
                    requestForAccessToken(appleAuthCode, appleClientSecret);
                    return; // Don't clear lastcall here, it will be cleared in the callback
                }
            }
        } else {
            this.lastcall.reject("We couldn't get the Auth Code");
        }
        this.lastcall = null;
    }

    private void requestForAccessToken(String code, String clientSecret) {
        OkHttpClient client = new OkHttpClient();
        FormBody formBody = new FormBody.Builder()
            .add("grant_type", "authorization_code")
            .add("code", code)
            .add("redirect_uri", redirectUrl)
            .add("client_id", clientId)
            .add("client_secret", clientSecret)
            .build();

        Request request = new Request.Builder().url(TOKENURL).post(formBody).build();

        client
            .newCall(request)
            .enqueue(
                new Callback() {
                    @Override
                    public void onFailure(@NonNull Call call, @NonNull IOException e) {
                        if (AppleProvider.this.lastcall != null) {
                            AppleProvider.this.lastcall.reject("Cannot get access_token", e);
                            AppleProvider.this.lastcall = null;
                        } else {
                            Log.e(SocialLoginPlugin.LOG_TAG, "Cannot get access_token: lastcall is null. Error: " + e.getMessage(), e);
                        }
                    }

                    @Override
                    public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                        try {
                            if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);

                            String responseData = Objects.requireNonNull(response.body()).string();
                            JSONObject jsonObject = (JSONObject) new JSONTokener(responseData).nextValue();
                            String accessToken = jsonObject.getString("access_token");
                            String refreshToken = jsonObject.getString("refresh_token");
                            String idToken = jsonObject.getString("id_token");

                            persistState(idToken, refreshToken, accessToken);

                            // Create proper response with all tokens
                            JSObject result = new JSObject();
                            result.put("accessToken", createAccessTokenObject(accessToken));
                            result.put("profile", createProfileObject(idToken));
                            result.put("idToken", idToken);

                            // For legacy mode, we don't include authorization code in the response
                            // since we've already exchanged it for proper tokens

                            JSObject appleResponse = new JSObject();
                            appleResponse.put("provider", "apple");
                            appleResponse.put("result", result);

                            if (AppleProvider.this.lastcall != null) {
                                AppleProvider.this.lastcall.resolve(appleResponse);
                                AppleProvider.this.lastcall = null;
                            } else {
                                Log.e(
                                    SocialLoginPlugin.LOG_TAG,
                                    "Cannot resolve access_token response: lastcall is null. Response: " + appleResponse.toString()
                                );
                            }
                        } catch (Exception e) {
                            if (AppleProvider.this.lastcall != null) {
                                AppleProvider.this.lastcall.reject("Cannot get access_token", e);
                                AppleProvider.this.lastcall = null;
                            } else {
                                Log.e(SocialLoginPlugin.LOG_TAG, "Cannot get access_token: lastcall is null. Error: " + e.getMessage(), e);
                            }
                        } finally {
                            response.close();
                        }
                    }
                }
            );
    }

    private void persistState(String idToken, String refreshToken, String accessToken) throws JSONException {
        JSONObject object = new JSONObject();
        object.put("idToken", idToken);
        object.put("refreshToken", refreshToken);
        object.put("accessToken", accessToken);

        AppleProvider.this.idToken = idToken;
        AppleProvider.this.refreshToken = refreshToken;
        AppleProvider.this.accessToken = accessToken;

        activity
            .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(APPLE_DATA_PREFERENCE, object.toString())
            .apply();
    }

    public CustomTabsSession getCustomTabsSession() {
        if (customTabsClient == null) {
            return null;
        }

        if (currentSession == null) {
            currentSession = customTabsClient.newSession(new CustomTabsCallback() {});
        }
        return currentSession;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebview(Context context, Activity activity, PluginCall call, String url) {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder(getCustomTabsSession());

        builder.build().launchUrl(context, Uri.parse(url));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupBroadcastChannelWebview(Context context, Activity activity, PluginCall call, String url) {
        // Create a custom WebView with Broadcast Channel support
        Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCancelable(true);
        dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));

        WebView webView = new WebView(context);
        webView.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Enable JavaScript
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setSupportMultipleWindows(false);

        // Set up Broadcast Channel communication
        webView.addJavascriptInterface(new BroadcastChannelInterface(call), "AndroidBridge");

        // Set up WebViewClient to handle redirects
        webView.setWebViewClient(
            new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();

                    // Check if this is the Broadcast Channel redirect
                    if (url.contains("capacitor-social-login.firebaseapp.com")) {
                        // Extract authorization code from URL parameters
                        Uri uri = Uri.parse(url);
                        String success = uri.getQueryParameter("success");

                        if (lastcall == null) {
                            Log.e(SocialLoginPlugin.LOG_TAG, "setupBroadcastChannelWebview: lastcall is null");
                            dialog.dismiss();
                            return true;
                        }

                        if ("true".equals(success)) {
                            String accessToken = uri.getQueryParameter("access_token");
                            if (accessToken != null) {
                                // We have proper tokens from the backend
                                String refreshToken = uri.getQueryParameter("refresh_token");
                                String idToken = uri.getQueryParameter("id_token");
                                try {
                                    persistState(idToken, refreshToken, accessToken);
                                    JSObject result = new JSObject();
                                    result.put("accessToken", createAccessTokenObject(accessToken));
                                    result.put("profile", createProfileObject(idToken));
                                    result.put("idToken", idToken);

                                    JSObject response = new JSObject();
                                    response.put("provider", "apple");
                                    response.put("result", result);

                                    lastcall.resolve(response);
                                } catch (JSONException e) {
                                    Log.e(SocialLoginPlugin.LOG_TAG, "Cannot persist state", e);
                                    lastcall.reject("Cannot persist state", e);
                                }
                            } else {
                                // We only have authorization code, need to handle it
                                String appleAuthCode = uri.getQueryParameter("code");
                                String appleClientSecret = uri.getQueryParameter("client_secret");

                                if (useProperTokenExchange) {
                                    // For Broadcast Channel, we can handle the token exchange directly
                                    // or pass the authorization code back to the client
                                    JSObject result = new JSObject();
                                    result.put("authorizationCode", appleAuthCode);
                                    result.put("idToken", ""); // Will be filled by client-side token exchange

                                    JSObject response = new JSObject();
                                    response.put("provider", "apple");
                                    response.put("result", result);

                                    lastcall.resolve(response);
                                } else {
                                    // Legacy mode: use authorization code as access token
                                    JSObject result = new JSObject();
                                    result.put("accessToken", createAccessTokenObject(appleAuthCode));
                                    result.put("profile", createProfileObject(""));
                                    result.put("idToken", "");

                                    JSObject response = new JSObject();
                                    response.put("provider", "apple");
                                    response.put("result", result);

                                    lastcall.resolve(response);
                                }
                            }
                        } else {
                            lastcall.reject("Authentication failed");
                        }

                        dialog.dismiss();
                        lastcall = null;
                        return true;
                    }

                    return super.shouldOverrideUrlLoading(view, request);
                }
            }
        );

        // Inject Broadcast Channel polyfill and setup
        webView.setWebChromeClient(
            new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    Log.d("WebView", consoleMessage.message());
                    return super.onConsoleMessage(consoleMessage);
                }
            }
        );

        dialog.setContentView(webView);

        // Set dialog to fullscreen
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
        lp.copyFrom(dialog.getWindow().getAttributes());
        lp.width = WindowManager.LayoutParams.MATCH_PARENT;
        lp.height = WindowManager.LayoutParams.MATCH_PARENT;
        dialog.getWindow().setAttributes(lp);

        // Load the Apple authentication URL
        webView.loadUrl(url);

        // Inject Broadcast Channel setup after page loads
        webView.setWebViewClient(
            new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);

                    // Inject Broadcast Channel setup
                    String broadcastChannelScript =
                        "javascript:" +
                        "if (!window.BroadcastChannel) {" +
                        "  window.BroadcastChannel = function(name) {" +
                        "    this.name = name;" +
                        "    this.onmessage = null;" +
                        "    this.postMessage = function(data) {" +
                        "      if (window.AndroidBridge) {" +
                        "        window.AndroidBridge.postMessage(JSON.stringify({channel: this.name, data: data}));" +
                        "      }" +
                        "    };" +
                        "    window.addEventListener('message', (event) => {" +
                        "      if (this.onmessage) {" +
                        "        this.onmessage({data: event.data});" +
                        "      }" +
                        "    });" +
                        "  };" +
                        "}" +
                        "console.log('Broadcast Channel polyfill loaded');";

                    view.evaluateJavascript(broadcastChannelScript, null);
                }
            }
        );

        dialog.show();
    }

    // JavaScript interface for Broadcast Channel communication
    private class BroadcastChannelInterface {

        private final PluginCall call;

        BroadcastChannelInterface(PluginCall call) {
            this.call = call;
        }

        @android.webkit.JavascriptInterface
        public void postMessage(String message) {
            try {
                JSONObject data = new JSONObject(message);
                String channel = data.getString("channel");
                JSONObject messageData = data.getJSONObject("data");

                Log.d("BroadcastChannel", "Received message from channel: " + channel);
                Log.d("BroadcastChannel", "Message data: " + messageData.toString());

                // Handle authentication messages
                if ("auth".equals(channel)) {
                    if (lastcall == null) {
                        Log.e(SocialLoginPlugin.LOG_TAG, "BroadcastChannelInterface.postMessage: lastcall is null");
                        return;
                    }

                    String type = messageData.getString("type");
                    if ("success".equals(type)) {
                        // Handle successful authentication
                        String idToken = messageData.optString("idToken", "");
                        String accessToken = messageData.optString("accessToken", "");

                        try {
                            persistState(idToken, "refresh_token_placeholder", accessToken);
                            JSObject result = new JSObject();
                            result.put("accessToken", createAccessTokenObject(accessToken));
                            result.put("profile", createProfileObject(idToken));
                            result.put("idToken", idToken);

                            JSObject response = new JSObject();
                            response.put("provider", "apple");
                            response.put("result", result);

                            lastcall.resolve(response);
                            lastcall = null;
                        } catch (JSONException e) {
                            Log.e(SocialLoginPlugin.LOG_TAG, "Cannot create response", e);
                            lastcall.reject("Cannot create response", e);
                            lastcall = null;
                        }
                    } else if ("error".equals(type)) {
                        String error = messageData.optString("error", "Authentication failed");
                        lastcall.reject(error);
                        lastcall = null;
                    }
                }
            } catch (JSONException e) {
                Log.e("BroadcastChannel", "Error parsing message", e);
                if (lastcall != null) {
                    lastcall.reject("Error parsing authentication message", e);
                    lastcall = null;
                }
            }
        }
    }

    private JSObject createAccessTokenObject(String accessToken) {
        JSObject tokenObject = new JSObject();
        tokenObject.put("token", accessToken);
        // Add other fields if available
        return tokenObject;
    }

    private JSObject createProfileObject(String idToken) {
        JSObject profileObject = new JSObject();
        // Parse the ID token to extract user information
        // This is a simplified example. In practice, you should properly decode and verify the JWT.
        String[] parts = idToken.split("\\.");
        if (parts.length == 3) {
            try {
                String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE));
                JSONObject claims = new JSONObject(payload);
                profileObject.put("user", claims.optString("sub"));
                profileObject.put("email", claims.optString("email"));
                // Apple doesn't provide given name and family name in the ID token
                profileObject.put("givenName", JSONObject.NULL);
                profileObject.put("familyName", JSONObject.NULL);
            } catch (JSONException e) {
                Log.e(LOG_TAG, "Error parsing ID token", e);
            }
        }
        return profileObject;
    }

    // Helper method to convert JSONArray to String array
    private String[] toStringArray(JSONArray array) throws JSONException {
        String[] stringArray = new String[array.length()];
        for (int i = 0; i < array.length(); i++) {
            stringArray[i] = array.getString(i);
        }
        return stringArray;
    }
}
