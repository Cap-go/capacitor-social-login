package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

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

import ee.forgr.capacitor.social.login.helpers.PluginHelpers;
import ee.forgr.capacitor.social.login.helpers.FunctionResult;

public class GoogleProvider {
    private static final String LOG_TAG = "GoogleProvider";

    private Activity activity;
    private GoogleSignInClient googleSignInClient;
    private PluginCall loginCall;

    public GoogleProvider(Activity activity) {
        this.activity = activity;
    }

    public void initialize(PluginHelpers helpers, JSONObject config) {
        try {
            String clientId = config.getString("clientId");
            boolean forceCodeForRefreshToken = config.optBoolean("forceCodeForRefreshToken", false);
            String scopesStr = config.optString("scopes", "");

            String replacedScopesStr = scopesStr
                    .replaceAll("[\"\\[\\] ]", "")
                    .replace("\\", "");

            String[] scopeArray = replacedScopesStr.split(",");

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
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Error initializing GoogleProvider", e);
        }
    }

    public FunctionResult<Void, String> login(PluginHelpers helpers, JSONObject config, PluginCall call) {
        loginCall = call;
        if (googleSignInClient == null) {
            call.reject("Google Sign-In not initialized");
            return FunctionResult.error("Google Sign-In not initialized");
        }
        Intent signInIntent = googleSignInClient.getSignInIntent();
        activity.startActivityForResult(signInIntent, PluginHelpers.REQUEST_CODE_GOOGLE_LOGIN);
        return FunctionResult.success(null);
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

    public FunctionResult<Void, String> refresh() {
        return FunctionResult.error("Not implemented");
    }

    public void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PluginHelpers.REQUEST_CODE_GOOGLE_LOGIN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                JSObject result = new JSObject();
                result.put("provider", "google");
                result.put("status", "success");
                result.put("user", getUser(account));
                loginCall.resolve(result);
            } catch (ApiException e) {
                Log.e(LOG_TAG, "Google Sign-In failed", e);
                JSObject result = new JSObject();
                result.put("provider", "google");
                result.put("status", "error");
                loginCall.resolve(result);
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
}
