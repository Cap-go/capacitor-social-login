package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.text.TextUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.UUID;
import org.json.JSONException;
import org.json.JSONObject;

public class TelegramProvider implements SocialProvider {

    public static final int REQUEST_CODE = 9403;
    private static final String PREFS_NAME = "CapgoTelegramProviderPrefs";
    private static final String PREFS_KEY = "TelegramSession";
    private static final long SESSION_TTL_MS = 24 * 60 * 60 * 1000L;

    private final Activity activity;
    private final Context context;

    private String botId;
    private String redirectUri;
    private String origin;
    private String requestAccess = "write";
    private String languageCode;

    private PluginCall pendingCall;
    private String pendingState;
    private String pendingRequestAccess;

    public TelegramProvider(Activity activity, Context context) {
        this.activity = activity;
        this.context = context;
    }

    public void initialize(JSONObject config) throws JSONException {
        this.botId = config.getString("botId");
        this.redirectUri = config.optString("redirectUrl", null);
        this.origin = config.optString("origin", null);
        this.requestAccess = config.optString("requestAccess", "write");
        this.languageCode = config.optString("languageCode", null);
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        if (botId == null) {
            call.reject("Telegram provider is not initialized. Call initialize() first.");
            return;
        }
        if (pendingCall != null) {
            call.reject("Another Telegram login is already running.");
            return;
        }

        String redirect = redirectUri;
        if (config != null && config.has("redirectUrl")) {
            redirect = config.optString("redirectUrl", redirectUri);
        }
        if (redirect == null || redirect.isEmpty()) {
            call.reject("telegram.redirectUrl is required");
            return;
        }

        String resolvedRequestAccess = requestAccess;
        if (config != null && config.has("requestAccess")) {
            String override = config.optString("requestAccess", requestAccess);
            if (!override.isEmpty()) {
                resolvedRequestAccess = override;
            }
        }

        String state = config != null && config.has("state")
            ? config.optString("state", UUID.randomUUID().toString())
            : UUID.randomUUID().toString();
        pendingState = state;
        pendingRequestAccess = resolvedRequestAccess;
        pendingCall = call;

        String resolvedOrigin = origin != null ? origin : deriveOrigin(redirect);
        String returnTo = appendStateToRedirect(redirect, state);

        Uri.Builder builder = Uri.parse("https://oauth.telegram.org/auth")
            .buildUpon()
            .appendQueryParameter("bot_id", botId)
            .appendQueryParameter("origin", resolvedOrigin)
            .appendQueryParameter("request_access", resolvedRequestAccess)
            .appendQueryParameter("return_to", returnTo)
            .appendQueryParameter("embed", "1")
            .appendQueryParameter("mobile", "1");

        if (languageCode != null && !languageCode.isEmpty()) {
            builder.appendQueryParameter("lang", languageCode);
        }

        Intent intent = new Intent(activity, OAuth2LoginActivity.class);
        intent.putExtra(OAuth2LoginActivity.EXTRA_AUTH_URL, builder.build().toString());
        intent.putExtra(OAuth2LoginActivity.EXTRA_REDIRECT_URL, redirect);
        activity.startActivityForResult(intent, REQUEST_CODE);
    }

    @Override
    public void logout(PluginCall call) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().remove(PREFS_KEY).apply();
        call.resolve();
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        call.reject("getAuthorizationCode is not available for Telegram.");
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        TelegramSession session = loadSession();
        boolean isValid = session != null && session.expiresAtMs > System.currentTimeMillis();
        call.resolve(new JSObject().put("isLoggedIn", isValid));
    }

    @Override
    public void refresh(PluginCall call) {
        call.reject("Telegram refresh is not supported. Call login() again.");
    }

    public boolean handleActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CODE) {
            return false;
        }
        if (pendingCall == null) {
            return true;
        }

        if (resultCode != Activity.RESULT_OK) {
            String error = data != null ? data.getStringExtra("error") : "User cancelled";
            pendingCall.reject(error != null ? error : "User cancelled");
            cleanupPending();
            return true;
        }

        String returnedState = data != null ? data.getStringExtra("state") : null;
        if (returnedState == null || !returnedState.equals(pendingState)) {
            pendingCall.reject("State mismatch during Telegram login");
            cleanupPending();
            return true;
        }

        if (data != null) {
            String error = data.getStringExtra("error");
            if (error != null) {
                String description = data.getStringExtra("error_description");
                pendingCall.reject(description != null ? description : error);
                cleanupPending();
                return true;
            }
        }

        String id = data != null ? data.getStringExtra("id") : null;
        String authDateRaw = data != null ? data.getStringExtra("auth_date") : null;
        String hash = data != null ? data.getStringExtra("hash") : null;

        if (TextUtils.isEmpty(id) || TextUtils.isEmpty(authDateRaw) || TextUtils.isEmpty(hash)) {
            pendingCall.reject("Telegram login payload is incomplete.");
            cleanupPending();
            return true;
        }

        long authDateSeconds;
        try {
            authDateSeconds = Long.parseLong(authDateRaw);
        } catch (NumberFormatException e) {
            authDateSeconds = System.currentTimeMillis() / 1000L;
        }

        String firstName = data.getStringExtra("first_name");
        String lastName = data.getStringExtra("last_name");
        String username = data.getStringExtra("username");
        String photoUrl = data.getStringExtra("photo_url");

        persistSession(
            new TelegramSession(
                id,
                firstName,
                lastName,
                username,
                photoUrl,
                hash,
                pendingRequestAccess != null ? pendingRequestAccess : requestAccess,
                authDateSeconds,
                authDateSeconds * 1000L + SESSION_TTL_MS
            )
        );

        JSObject profile = new JSObject();
        profile.put("id", id);
        profile.put("firstName", firstName != null ? firstName : "");
        profile.put("lastName", lastName != null ? lastName : JSONObject.NULL);
        profile.put("username", username != null ? username : JSONObject.NULL);
        profile.put("photoUrl", photoUrl != null ? photoUrl : JSONObject.NULL);

        JSObject result = new JSObject();
        result.put("profile", profile);
        result.put("authDate", authDateSeconds);
        result.put("hash", hash);
        result.put("requestAccess", pendingRequestAccess != null ? pendingRequestAccess : requestAccess);

        JSObject response = new JSObject();
        response.put("provider", "telegram");
        response.put("result", result);
        pendingCall.resolve(response);
        cleanupPending();
        return true;
    }

    private void persistSession(TelegramSession session) {
        try {
            JSONObject stored = new JSONObject();
            stored.put("id", session.id);
            stored.put("firstName", session.firstName);
            stored.put("lastName", session.lastName);
            stored.put("username", session.username);
            stored.put("photoUrl", session.photoUrl);
            stored.put("hash", session.hash);
            stored.put("requestAccess", session.requestAccess);
            stored.put("authDate", session.authDateSeconds);
            stored.put("expiresAt", session.expiresAtMs);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(PREFS_KEY, stored.toString()).apply();
        } catch (JSONException e) {
            // Ignore persistence errors
        }
    }

    private TelegramSession loadSession() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(PREFS_KEY, null);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        try {
            JSONObject obj = new JSONObject(raw);
            return new TelegramSession(
                obj.optString("id", null),
                obj.optString("firstName", null),
                obj.optString("lastName", null),
                obj.optString("username", null),
                obj.optString("photoUrl", null),
                obj.optString("hash", null),
                obj.optString("requestAccess", "write"),
                obj.optLong("authDate", 0L),
                obj.optLong("expiresAt", 0L)
            );
        } catch (JSONException e) {
            return null;
        }
    }

    private void cleanupPending() {
        pendingCall = null;
        pendingState = null;
        pendingRequestAccess = null;
    }

    private static String appendStateToRedirect(String redirect, String state) {
        try {
            Uri uri = Uri.parse(redirect);
            Uri.Builder builder = uri.buildUpon();
            String existing = uri.getQueryParameter("state");
            if (existing == null) {
                builder.appendQueryParameter("state", state);
            }
            return builder.build().toString();
        } catch (Exception e) {
            return redirect;
        }
    }

    private static String deriveOrigin(String redirect) {
        try {
            Uri uri = Uri.parse(redirect);
            if (uri.getScheme() != null && uri.getHost() != null) {
                return uri.getScheme() + "://" + uri.getHost();
            }
        } catch (Exception ignored) {}
        return redirect;
    }

    private static class TelegramSession {

        final String id;
        final String firstName;
        final String lastName;
        final String username;
        final String photoUrl;
        final String hash;
        final String requestAccess;
        final long authDateSeconds;
        final long expiresAtMs;

        TelegramSession(
            String id,
            String firstName,
            String lastName,
            String username,
            String photoUrl,
            String hash,
            String requestAccess,
            long authDateSeconds,
            long expiresAtMs
        ) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.username = username;
            this.photoUrl = photoUrl;
            this.hash = hash;
            this.requestAccess = requestAccess;
            this.authDateSeconds = authDateSeconds;
            this.expiresAtMs = expiresAtMs;
        }
    }
}
