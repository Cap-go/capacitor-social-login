package ee.forgr.capacitor.social.login;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.facebook.AccessToken;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import com.facebook.FacebookException;
import com.facebook.GraphRequest;
import com.facebook.login.LoginManager;
import com.facebook.login.LoginResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

import org.json.JSONException;

import java.util.Arrays;
import java.util.List;

public class FacebookProvider {
  private CallbackManager callbackManager;
  private PluginCall savedCall;

  public void initialize(String facebookAppId) {
    callbackManager = CallbackManager.Factory.create();

    LoginManager.getInstance().registerCallback(callbackManager,
        new FacebookCallback<LoginResult>() {
          @Override
          public void onSuccess(LoginResult loginResult) {
            // Handle successful login
            AccessToken accessToken = loginResult.getAccessToken();
            GraphRequest request = GraphRequest.newMeRequest(accessToken, (object, response) -> {
              try {
                JSObject result = new JSObject();
                result.put("accessToken", accessToken.getToken());
                result.put("userId", object.getString("id"));
                result.put("expires", accessToken.getExpires().getTime());
                result.put("lastRefresh", accessToken.getLastRefresh().getTime());
                result.put("applicationId", accessToken.getApplicationId());
                result.put("declinedPermissions", accessToken.getDeclinedPermissions());
                result.put("permissions", accessToken.getPermissions());

                JSObject profile = new JSObject();
                profile.put("fields", object.names());

                JSObject response = new JSObject();
                response.put("accessToken", result);
                response.put("profile", profile);

                savedCall.resolve(response);
              } catch (JSONException e) {
                savedCall.reject("Error parsing Facebook response: " + e.getMessage());
              }
            });

            Bundle parameters = new Bundle();
            parameters.putString("fields", "id,name,email,picture.width(720).height(720)");
            request.setParameters(parameters);
            request.executeAsync();
          }

          @Override
          public void onCancel() {
            // Handle login cancellation
            savedCall.reject("Facebook login cancelled.");
          }

          @Override
          public void onError(FacebookException exception) {
            // Handle login error
            savedCall.reject("Error during Facebook login: " + exception.getMessage());
          }
        });
  }

  public void login(PluginCall call, JSObject payload) {
    savedCall = call;
    List<String> permissions = Arrays.asList(payload.getArrayString("permissions"));
    LoginManager.getInstance().logInWithReadPermissions(getActivity(), permissions);
  }

  public void logout(PluginCall call) {
    LoginManager.getInstance().logOut();
    call.resolve();
  }

  public void getCurrentUser(PluginCall call) {
    AccessToken accessToken = AccessToken.getCurrentAccessToken();
    if (accessToken != null && !accessToken.isExpired()) {
      JSObject result = new JSObject();
      result.put("accessToken", accessToken.getToken());
      result.put("userId", accessToken.getUserId());
      result.put("expires", accessToken.getExpires().getTime());
      result.put("lastRefresh", accessToken.getLastRefresh().getTime());
      result.put("applicationId", accessToken.getApplicationId());
      result.put("declinedPermissions", accessToken.getDeclinedPermissions());
      result.put("permissions", accessToken.getPermissions());

      JSObject response = new JSObject();
      response.put("accessToken", result);
      response.put("profile", new JSObject());

      call.resolve(response);
    } else {
      call.reject("No current Facebook user.");
    }
  }

  public void refresh(PluginCall call) {
    AccessToken.refreshCurrentAccessTokenAsync(new AccessToken.AccessTokenRefreshCallback() {
      @Override
      public void OnTokenRefreshed(AccessToken accessToken) {
        if (accessToken != null) {
          JSObject result = new JSObject();
          result.put("accessToken", accessToken.getToken());
          result.put("userId", accessToken.getUserId());
          result.put("expires", accessToken.getExpires().getTime());
          result.put("lastRefresh", accessToken.getLastRefresh().getTime());
          result.put("applicationId", accessToken.getApplicationId());
          result.put("declinedPermissions", accessToken.getDeclinedPermissions());
          result.put("permissions", accessToken.getPermissions());

          call.resolve(result);
        } else {
          call.reject("Failed to refresh Facebook access token.");
        }
      }

      @Override
      public void OnTokenRefreshFailed(FacebookException exception) {
        call.reject("Error refreshing Facebook access token: " + exception.getMessage());
      }
    });
  }

  @Override
  protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
    callbackManager.onActivityResult(requestCode, resultCode, data);
  }
}
