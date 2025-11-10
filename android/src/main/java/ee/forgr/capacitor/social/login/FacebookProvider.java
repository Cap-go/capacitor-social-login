package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import androidx.activity.result.ActivityResultRegistryOwner;
import androidx.annotation.Nullable;
import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.FacebookSdk;
import com.facebook.GraphRequest;
import com.facebook.login.LoginBehavior;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import ee.forgr.capacitor.social.login.helpers.JsonHelper;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.Collection;
import java.util.concurrent.CountDownLatch;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class FacebookProvider implements SocialProvider {

    private static final String LOG_TAG = "FacebookProvider";

    private Activity activity;
    private CallbackManager callbackManager;

    public FacebookProvider(Activity activity) {
        this.activity = activity;
    }

    public void initialize(JSONObject config) {
        try {
            // Set Facebook App ID
            String facebookAppId = config.getString("appId");
            FacebookSdk.setApplicationId(facebookAppId);

            // Set Facebook Client Token
            String facebookClientToken = config.getString("clientToken");
            FacebookSdk.setClientToken(facebookClientToken);

            // Initialize Facebook SDK
            FacebookSdk.sdkInitialize(activity.getApplicationContext());

            this.callbackManager = CallbackManager.Factory.create();

            LoginManager.getInstance().registerCallback(
                callbackManager,
                new FacebookCallback<LoginResult>() {
                    @Override
                    public void onSuccess(LoginResult loginResult) {
                        Log.d(LOG_TAG, "LoginManager.onSuccess");
                    }

                    @Override
                    public void onCancel() {
                        Log.d(LOG_TAG, "LoginManager.onCancel");
                    }

                    @Override
                    public void onError(FacebookException exception) {
                        Log.e(LOG_TAG, "LoginManager.onError", exception);
                    }
                }
            );
        } catch (JSONException e) {
            Log.e(LOG_TAG, "Error initializing Facebook SDK", e);
            throw new RuntimeException("Failed to initialize Facebook SDK: " + e.getMessage());
        }
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        try {
            Collection<String> permissions = JsonHelper.jsonArrayToList(config.getJSONArray("permissions"));
            boolean limitedLogin = config.optBoolean("limitedLogin", false);
            String nonce = config.optString("nonce", "");

            LoginManager.getInstance().registerCallback(
                callbackManager,
                new FacebookCallback<LoginResult>() {
                    @Override
                    public void onSuccess(LoginResult loginResult) {
                        Log.d(LOG_TAG, "LoginManager.onSuccess");
                        AccessToken accessToken = loginResult.getAccessToken();
                        JSObject result = new JSObject();
                        result.put("accessToken", createAccessTokenObject(accessToken));
                        result.put("profile", createProfileObject(accessToken));
                        result.put(
                            "idToken",
                            loginResult.getAuthenticationToken() != null ? loginResult.getAuthenticationToken().getToken() : null
                        );

                        JSObject response = new JSObject();
                        response.put("provider", "facebook");
                        response.put("result", result);

                        call.resolve(response);
                    }

                    @Override
                    public void onCancel() {
                        Log.d(LOG_TAG, "LoginManager.onCancel");
                        call.reject("Login cancelled");
                    }

                    @Override
                    public void onError(FacebookException exception) {
                        Log.e(LOG_TAG, "LoginManager.onError", exception);
                        call.reject(exception.getMessage());
                    }
                }
            );

            LoginManager loginManager = LoginManager.getInstance();
            if (limitedLogin) {
                Log.w(LOG_TAG, "Limited login is not available for Android");
            }

            loginManager.setLoginBehavior(LoginBehavior.NATIVE_WITH_FALLBACK);
            if (!nonce.isEmpty()) {
                loginManager.logIn((ActivityResultRegistryOwner) activity, callbackManager, permissions, nonce);
            } else {
                loginManager.logIn((ActivityResultRegistryOwner) activity, callbackManager, permissions);
            }
        } catch (JSONException e) {
            call.reject("Invalid login options format");
        }
    }

    @Override
    public void logout(PluginCall call) {
        LoginManager.getInstance().logOut();
        call.resolve();
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        AccessToken accessToken = AccessToken.getCurrentAccessToken();
        if (accessToken != null && !accessToken.isExpired()) {
            call.resolve(new JSObject().put("accessToken", accessToken.getToken()));
        } else {
            call.reject("No valid access token found");
        }
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        AccessToken accessToken = AccessToken.getCurrentAccessToken();
        call.resolve(new JSObject().put("isLoggedIn", accessToken != null && !accessToken.isExpired()));
    }

    @Override
    public void refresh(PluginCall call) {
        // Not implemented for Facebook
        AccessToken accessToken = AccessToken.getCurrentAccessToken();
        if (accessToken == null) {
            call.reject("No access token?");
            return;
        }
        if (!accessToken.isDataAccessExpired() && !accessToken.isExpired()) {
            JSObject ret = new JSObject();
            ret.put("accessToken", accessToken.getToken());
            call.resolve(ret);
            return;
        }
        AccessToken.refreshCurrentAccessTokenAsync(
            new AccessToken.AccessTokenRefreshCallback() {
                @Override
                public void OnTokenRefreshed(@Nullable AccessToken accessToken) {
                    if (accessToken == null) {
                        call.reject("Success, but refresh token is null ???");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("accessToken", accessToken.getToken());
                    call.resolve(ret);
                }

                @Override
                public void OnTokenRefreshFailed(@Nullable FacebookException e) {
                    if (e != null) {
                        Log.e(SocialLoginPlugin.LOG_TAG, "Facebook token refresh error", e);
                        call.reject(String.format("Cannot refresh token. %s", e.toString()));
                    } else {
                        call.reject("Cannot refresh token");
                    }
                }
            }
        );
    }

    public boolean handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        Log.d(LOG_TAG, "FacebookProvider.handleOnActivityResult called");
        if (callbackManager != null) {
            return callbackManager.onActivityResult(requestCode, resultCode, data);
        }
        return false;
    }

    public void getProfile(JSONArray fieldsArray, PluginCall call) {
        AccessToken accessToken = AccessToken.getCurrentAccessToken();
        if (accessToken == null || accessToken.isExpired()) {
            call.reject("You're not logged in. Please login first to obtain an access token and try again.");
            return;
        }

        String[] fieldsStrings = new String[fieldsArray.length()];
        try {
            for (int i = 0; i < fieldsArray.length(); i++) {
                fieldsStrings[i] = fieldsArray.getString(i);
            }
        } catch (JSONException e) {
            call.reject("Invalid fields format");
            return;
        }

        String fieldsString = String.join(",", fieldsStrings);

        Bundle parameters = new Bundle();
        parameters.putString("fields", fieldsString);

        GraphRequest request = GraphRequest.newMeRequest(accessToken, (jsonObject, response) -> {
            if (response == null) {
                call.reject("response is null from Facebook Graph");
                return;
            }
            if (response.getError() != null) {
                call.reject(response.getError().getErrorMessage());
                return;
            }

            if (jsonObject == null) {
                call.reject("jsonObject is null from Facebook Graph");
                return;
            }

            try {
                JSObject profile = JSObject.fromJSONObject(jsonObject);
                JSObject result = new JSObject();
                result.put("profile", profile);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Error parsing profile response: " + e.getMessage());
            }
        });

        request.setParameters(parameters);
        request.executeAsync();
    }

    private JSObject createAccessTokenObject(AccessToken accessToken) {
        JSObject tokenObject = new JSObject();
        tokenObject.put("applicationId", accessToken.getApplicationId());
        tokenObject.put("declinedPermissions", new JSArray(accessToken.getDeclinedPermissions()));
        tokenObject.put("expires", accessToken.getExpires().getTime());
        tokenObject.put("isExpired", accessToken.isExpired());
        tokenObject.put("lastRefresh", accessToken.getLastRefresh().getTime());
        tokenObject.put("permissions", new JSArray(accessToken.getPermissions()));
        tokenObject.put("token", accessToken.getToken());
        tokenObject.put("userId", accessToken.getUserId());
        return tokenObject;
    }

    private JSObject createProfileObject(AccessToken accessToken) {
        JSObject profileObject = new JSObject();
        CountDownLatch latch = new CountDownLatch(1);

        GraphRequest request = GraphRequest.newMeRequest(accessToken, (object, response) -> {
            if (response.getError() != null) {
                Log.e(LOG_TAG, "Error fetching profile", response.getError().getException());
            } else {
                profileObject.put("userID", object.optString("id", ""));
                profileObject.put("email", object.optString("email", ""));
                profileObject.put("name", object.optString("name", ""));

                JSONObject pictureObject = object.optJSONObject("picture");
                if (pictureObject != null) {
                    JSONObject dataObject = pictureObject.optJSONObject("data");
                    if (dataObject != null) {
                        profileObject.put("imageURL", dataObject.optString("url", ""));
                    }
                }
            }
            latch.countDown();
        });

        Bundle parameters = new Bundle();
        parameters.putString("fields", "id,name,email,picture.type(large)");
        request.setParameters(parameters);

        new Thread(() -> {
            request.executeAndWait();
        })
            .start();

        try {
            latch.await();
        } catch (InterruptedException e) {
            Log.e(LOG_TAG, "Interrupted while waiting for profile fetch", e);
        }

        return profileObject;
    }
}
