package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import ee.forgr.capacitor.social.login.helpers.FunctionResult;
import ee.forgr.capacitor.social.login.helpers.FutureFunctionResult;
import ee.forgr.capacitor.social.login.helpers.PluginHelpers;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

public class GoogleProvider implements SocialProvider {

  private static final String LOG_TAG = "GoogleProvider";

  private final Activity activity;
  private final Context context;
  private CredentialManager credentialManager;
  private String clientId;

  public GoogleProvider(Activity activity, Context context) {
    this.activity = activity;
    this.context = context;
  }

  public void initialize(PluginHelpers helpers, JSONObject config) {
    this.credentialManager = CredentialManager.create(activity);
    //        this.clientId = "1038081411966-63r6lsm5og90o5t04hl5i0loopqt7m47.apps.googleusercontent.com"; now we use the web one WTF
    this.clientId =
      "1038081411966-8q4qgeam3d4itku0r43qkginl9cljc5a.apps.googleusercontent.com";
  }

  @Override
  public FutureFunctionResult<JSONObject, String> login(
    PluginHelpers helpers,
    JSONObject config
  ) {
    FutureFunctionResult<JSONObject, String> loginResult =
      new FutureFunctionResult<>();

    GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(true)
      .setServerClientId(this.clientId)
      .build();
    GetCredentialRequest googleSignRequest = new GetCredentialRequest.Builder()
      .addCredentialOption(googleIdOption)
      .build();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.getCredentialAsync(
      context,
      googleSignRequest,
      null,
      executor,
      new CredentialManagerCallback<
        GetCredentialResponse,
        GetCredentialException
      >() {
        @Override
        public void onResult(GetCredentialResponse result) {
          try {
            JSONObject user = handleSignInResult(result);
            JSONObject response = new JSONObject();
            response.put("provider", "google");
            response.put("status", "success");
            response.put("user", user);
            Log.d(LOG_TAG, "Google Sign-In success: " + response.toString());
            loginResult.resolveSuccess(response);
          } catch (JSONException e) {
            loginResult.resolveError(
              "Error creating success response: " + e.getMessage()
            );
          }
        }

        @Override
        public void onError(GetCredentialException e) {
          Log.e(LOG_TAG, "Google Sign-In failed", e);
          try {
            JSONObject errorResponse = new JSONObject();
            errorResponse.put("provider", "google");
            errorResponse.put("status", "error");
            errorResponse.put("message", e.getMessage());
            loginResult.resolveSuccess(errorResponse);
          } catch (JSONException jsonException) {
            loginResult.resolveError(
              "Error creating error response: " + jsonException.getMessage()
            );
          }
        }
      }
    );

    return loginResult;
  }

  private JSONObject handleSignInResult(GetCredentialResponse result)
    throws JSONException {
    JSONObject user = new JSONObject();
    Log.d(LOG_TAG, "handleSignInResult: " + result.toString());

    Credential credential = result.getCredential();
    if (credential instanceof CustomCredential) {
      if (
        GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(
          credential.getType()
        )
      ) {
        GoogleIdTokenCredential googleIdTokenCredential =
          GoogleIdTokenCredential.createFrom(
            ((CustomCredential) credential).getData()
          );
        user.put("id", googleIdTokenCredential.getId());
        user.put("name", googleIdTokenCredential.getDisplayName());
        user.put("email", googleIdTokenCredential.getId());
        user.put("familyName", googleIdTokenCredential.getFamilyName());
        user.put("givenName", googleIdTokenCredential.getGivenName());
        user.put("imageUrl", googleIdTokenCredential.getProfilePictureUri());
      }
    }
    return user;
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
