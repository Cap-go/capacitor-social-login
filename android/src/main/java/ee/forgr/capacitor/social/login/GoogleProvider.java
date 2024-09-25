package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

import ee.forgr.capacitor.social.login.helpers.FutureFunctionResult;
import ee.forgr.capacitor.social.login.helpers.PluginHelpers;
import ee.forgr.capacitor.social.login.helpers.FunctionResult;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import ee.forgr.capacitor.social.login.helpers.ThrowableFunctionResult;

public class GoogleProvider implements SocialProvider {
    private static final String LOG_TAG = "GoogleProvider";

    private Activity activity;
    private GoogleSignInClient googleSignInClient;
    private FutureFunctionResult<JSONObject, String> loginResult;

    public GoogleProvider(Activity activity) {
        this.activity = activity;
    }

    public void initialize(PluginHelpers helpers, JSONObject config) {
        String clientId = "1038081411966-63r6lsm5og90o5t04hl5i0loopqt7m47.apps.googleusercontent.com"; //config.getString("clientId");
        boolean forceCodeForRefreshToken = config.optBoolean("forceCodeForRefreshToken", false);
        String scopesStr = config.optString("scopes", "");

        String replacedScopesStr = scopesStr
                .replaceAll("[\"\\[\\] ]", "")
                .replace("\\", "");

        String[] scopeArray = new String[]{"profile", "email"}; //replacedScopesStr.split(",");

        GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(clientId)
                .requestEmail();

        if (forceCodeForRefreshToken) {
            googleSignInBuilder.requestServerAuthCode(clientId, true);
        }

        Scope[] scopes = new Scope[scopeArray.length - 1];
        Scope firstScope = new Scope(scopeArray[0]);
        for (int i = 1; i < scopeArray.length; i++) {
            scopes[i - 1] = new Scope(scopeArray[i]);
        }
        googleSignInBuilder.requestScopes(firstScope, scopes);

        GoogleSignInOptions googleSignInOptions = googleSignInBuilder.build();
        googleSignInClient = GoogleSignIn.getClient(activity, googleSignInOptions);
    }

    public void logout(PluginCall call) {
        if (googleSignInClient == null) {
            call.reject("Google Sign-In not initialized");
            return;
        }
        googleSignInClient.signOut().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                call.resolve();
            } else {
                call.reject("Logout failed");
            }
        });
    }

    public void handleOnActivityResult(ActivityResult data) {
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            JSONObject result = new JSONObject();
            try {
                result.put("provider", "google");
                result.put("status", "success");
                result.put("user", getUser(account));
            } catch (JSONException e) {
                new ThrowableFunctionResult<JSONObject>(null, e)
                        .convertThrowableToString()
                        .onError(err -> loginResult.resolveError(err));
                return;
            }

            loginResult.resolveSuccess(result);
            return;
        } catch (ApiException e) {
            Log.e(LOG_TAG, "Google Sign-In failed", e);
            JSONObject result = new JSObject();
            try {
                result.put("provider", "google");
                result.put("status", "error");

                loginResult.resolveSuccess(result);
            } catch (JSONException ex) {
                new ThrowableFunctionResult<JSONObject>(null, e)
                        .convertThrowableToString()
                        .onError(err -> loginResult.resolveError(err));
                return;
            }
        }
    }

    private Map<String, Object> getUser(GoogleSignInAccount account) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", account.getId());
        user.put("name", account.getDisplayName());
        user.put("email", account.getEmail());
        user.put("familyName", account.getFamilyName());
        user.put("givenName", account.getGivenName());
        user.put("imageUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);
        return user;
    }

    @Override
    public FutureFunctionResult<JSONObject, String> login(PluginHelpers helpers, JSONObject config) {
//        loginCall = call;
        if (googleSignInClient == null) {
            return FutureFunctionResult.error("Google Sign-In not initialized");
        }
        Intent signInIntent = googleSignInClient.getSignInIntent();

        FunctionResult<Void, String> startIntentResult = helpers.startNamedActivityForResult(signInIntent, "googleSignInResult");
        if (startIntentResult.isError()) {
            return FutureFunctionResult.error(String.format("Cannot invoke startNamedActivityForResult: %s", startIntentResult.getError()));
        };

        this.loginResult = new FutureFunctionResult<>();
        return this.loginResult;
    }

    @Override
    public FunctionResult<Void, String> logout(PluginHelpers helpers) {
        return null;
    }

    @Override
    public FunctionResult<String, String> getAuthorizationCode() {
        return null;
    }

    @Override
    public FunctionResult<Boolean, String> isLoggedIn() {
        return null;
    }

    @Override
    public FunctionResult<Map<String, Object>, String> getCurrentUser() {
        return null;
    }

    @Override
    public FunctionResult<Void, String> refresh() {
        return null;
    }
}
