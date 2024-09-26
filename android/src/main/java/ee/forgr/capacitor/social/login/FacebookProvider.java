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
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import java.util.Collection;
import org.json.JSONException;
import org.json.JSONObject;

import ee.forgr.capacitor.social.login.helpers.JsonHelper;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;

public class FacebookProvider implements SocialProvider {

  private static final String LOG_TAG = "FacebookProvider";

  private Activity activity;
  private CallbackManager callbackManager;

  public FacebookProvider(Activity activity) {
    this.activity = activity;
  }

  public void initialize(JSONObject _config) {
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
  public void login(PluginCall call, JSONObject config) {
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
              JSObject result = new JSObject();
              result.put("accessToken", accessToken.getToken());
              result.put("userId", accessToken.getUserId());
              call.resolve(result);
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
      LoginManager.getInstance().logIn(activity, permissions);
    } catch (JSONException e) {
      call.reject("Invalid permissions format");
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
      call.resolve(new JSObject().put("code", accessToken.getToken()));
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
  public void getCurrentUser(PluginCall call) {
    AccessToken accessToken = AccessToken.getCurrentAccessToken();
    if (accessToken == null) {
      call.reject("You're not logged in. Call FacebookLogin.login() first to obtain an access token.");
      return;
    }

    if (accessToken.isExpired()) {
      call.reject("AccessToken is expired.");
      return;
    }

    GraphRequest graphRequest = GraphRequest.newMeRequest(
      accessToken,
      new GraphRequest.GraphJSONObjectCallback() {
        @Override
        public void onCompleted(JSONObject object, GraphResponse response) {
          if (response.getError() != null) {
            call.reject(response.getError().getErrorMessage());
          } else {
            try {
                call.resolve(JSObject.fromJSONObject(object));
            } catch (JSONException e) {
                call.reject("Error parsing user data: " + e.getMessage());
            }
          }
        }
      }
    );

    Bundle parameters = new Bundle();
    parameters.putString("fields", "id,name,email");
    graphRequest.setParameters(parameters);
    graphRequest.executeAsync();
  }

  @Override
  public void refresh(PluginCall call) {
    // Not implemented for Facebook
    call.reject("Not implemented");
  }

  public boolean handleOnActivityResult(
    int requestCode,
    int resultCode,
    Intent data
  ) {
    return callbackManager.onActivityResult(requestCode, resultCode, data);
  }
}
