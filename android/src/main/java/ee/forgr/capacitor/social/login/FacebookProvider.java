package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.GraphRequest;
import com.facebook.GraphResponse;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import ee.forgr.capacitor.social.login.helpers.FunctionResult;
import ee.forgr.capacitor.social.login.helpers.FutureFunctionResult;
import ee.forgr.capacitor.social.login.helpers.JsonHelper;
import ee.forgr.capacitor.social.login.helpers.PluginHelpers;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.Collection;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

public class FacebookProvider implements SocialProvider {

  private static final String LOG_TAG = "FacebookProvider";

  private Activity activity;
  private CallbackManager callbackManager;

  public FacebookProvider(Activity activity) {
    this.activity = activity;
  }

  public void initialize(PluginHelpers helpers) {
    this.callbackManager = CallbackManager.Factory.create();

    LoginManager.getInstance()
      .registerCallback(
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
  }

  @Override
  public FutureFunctionResult<JSONObject, String> login(
    PluginHelpers helpers,
    JSONObject config
  ) {
    FutureFunctionResult<JSONObject, String> future =
      new FutureFunctionResult<>();
    try {
      Collection<String> permissions = JsonHelper.jsonArrayToList(
        config.getJSONArray("permissions")
      );
      LoginManager.getInstance()
        .registerCallback(
          callbackManager,
          new FacebookCallback<LoginResult>() {
            @Override
            public void onSuccess(LoginResult loginResult) {
              Log.d(LOG_TAG, "LoginManager.onSuccess");
              AccessToken accessToken = loginResult.getAccessToken();
              JSONObject result = new JSONObject();
              try {
                result.put("accessToken", accessToken.getToken());
                result.put("userId", accessToken.getUserId());
                future.resolveSuccess(result);
              } catch (JSONException e) {
                future.resolveError("Error creating result JSON");
              }
            }

            @Override
            public void onCancel() {
              Log.d(LOG_TAG, "LoginManager.onCancel");
              future.resolveError("Login cancelled");
            }

            @Override
            public void onError(FacebookException exception) {
              Log.e(LOG_TAG, "LoginManager.onError", exception);
              future.resolveError(exception.getMessage());
            }
          }
        );
      LoginManager.getInstance().logIn(activity, permissions);
    } catch (JSONException e) {
      future.resolveError("Invalid permissions format");
    }
    return future;
  }

  @Override
  public FunctionResult<Void, String> logout(PluginHelpers helpers) {
    LoginManager.getInstance().logOut();
    return FunctionResult.success(null);
  }

  @Override
  public FunctionResult<String, String> getAuthorizationCode() {
    AccessToken accessToken = AccessToken.getCurrentAccessToken();
    if (accessToken != null && !accessToken.isExpired()) {
      return FunctionResult.success(accessToken.getToken());
    } else {
      return FunctionResult.error("No valid access token found");
    }
  }

  @Override
  public FunctionResult<Boolean, String> isLoggedIn() {
    AccessToken accessToken = AccessToken.getCurrentAccessToken();
    return FunctionResult.success(
      accessToken != null && !accessToken.isExpired()
    );
  }

  @Override
  public FunctionResult<Map<String, Object>, String> getCurrentUser() {
    AccessToken accessToken = AccessToken.getCurrentAccessToken();
    if (accessToken == null) {
      return FunctionResult.error(
        "You're not logged in. Call FacebookLogin.login() first to obtain an access token."
      );
    }

    if (accessToken.isExpired()) {
      return FunctionResult.error("AccessToken is expired.");
    }

    GraphRequest graphRequest = GraphRequest.newMeRequest(
      accessToken,
      new GraphRequest.GraphJSONObjectCallback() {
        @Override
        public void onCompleted(JSONObject object, GraphResponse response) {
          if (response.getError() != null) {
            // Handle error
          } else {
            // Return user profile data
            FunctionResult.success(object);
          }
        }
      }
    );

    Bundle parameters = new Bundle();
    parameters.putString("fields", "id,name,email");
    graphRequest.setParameters(parameters);
    graphRequest.executeAsync();

    return FunctionResult.success(null);
  }

  @Override
  public FunctionResult<Void, String> refresh() {
    // Not implemented for Facebook
    return FunctionResult.error("Not implemented");
  }

  public boolean handleOnActivityResult(
    int requestCode,
    int resultCode,
    Intent data
  ) {
    return callbackManager.onActivityResult(requestCode, resultCode, data);
  }
}
