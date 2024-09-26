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
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

import ee.forgr.capacitor.social.login.helpers.SocialProvider;

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

  public void initialize(String clientId) {
    this.credentialManager = CredentialManager.create(activity);
    this.clientId = clientId;
  }

  @Override
  public void login(PluginCall call, JSONObject config) {
    if (this.clientId == null || this.clientId.isEmpty()) {
      call.reject("Google Sign-In failed: Client ID is not set");
      return;
    }

    GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(false)
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
      new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
        @Override
        public void onResult(GetCredentialResponse result) {
          try {
            JSObject user = handleSignInResult(result);
            JSObject response = new JSObject();
            response.put("provider", "google");
            response.put("status", "success");
            response.put("user", user);
            Log.d(LOG_TAG, "Google Sign-In success: " + response.toString());
            call.resolve(response);
          } catch (JSONException e) {
            call.reject("Error creating success response: " + e.getMessage());
          }
        }

        @Override
        public void onError(GetCredentialException e) {
          Log.e(LOG_TAG, "Google Sign-In failed", e);
          call.reject("Google Sign-In failed: " + e.getMessage());
        }
      }
    );
  }

  private JSObject handleSignInResult(GetCredentialResponse result) throws JSONException {
    JSObject user = new JSObject();
    Log.d(LOG_TAG, "handleSignInResult: " + result.toString());

    Credential credential = result.getCredential();
    if (credential instanceof CustomCredential) {
      if (GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
        GoogleIdTokenCredential googleIdTokenCredential = GoogleIdTokenCredential.createFrom(
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
  public void logout(PluginCall call) {
    // Clear any stored credentials
    call.resolve();
  }

  @Override
  public void getAuthorizationCode(PluginCall call) {
    GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(this.clientId)
        .build();
    GetCredentialRequest request = new GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.getCredentialAsync(
        context,
        request,
        null,
        executor,
        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
            @Override
            public void onResult(GetCredentialResponse result) {
                Credential credential = result.getCredential();
                if (credential instanceof CustomCredential) {
                    if (GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                        GoogleIdTokenCredential googleIdTokenCredential = GoogleIdTokenCredential.createFrom(
                            ((CustomCredential) credential).getData()
                        );
                        String idToken = googleIdTokenCredential.getIdToken();
                        JSObject response = new JSObject();
                        response.put("code", idToken);
                        call.resolve(response);
                    } else {
                        call.reject("Unexpected credential type");
                    }
                } else {
                    call.reject("Invalid credential");
                }
            }

            @Override
            public void onError(GetCredentialException e) {
                Log.e(LOG_TAG, "Failed to get authorization code", e);
                call.reject("Failed to get authorization code: " + e.getMessage());
            }
        }
    );
  }

  @Override
  public void isLoggedIn(PluginCall call) {
    GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(true)
        .setServerClientId(this.clientId)
        .build();
    GetCredentialRequest request = new GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.getCredentialAsync(
        context,
        request,
        null,
        executor,
        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
            @Override
            public void onResult(GetCredentialResponse result) {
                JSObject response = new JSObject();
                response.put("value", true);
                call.resolve(response);
            }

            @Override
            public void onError(GetCredentialException e) {
                JSObject response = new JSObject();
                response.put("value", false);
                call.resolve(response);
            }
        }
    );
  }

  @Override
  public void getCurrentUser(PluginCall call) {
    GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(true)
        .setServerClientId(this.clientId)
        .build();
    GetCredentialRequest request = new GetCredentialRequest.Builder()
        .addCredentialOption(googleIdOption)
        .build();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.getCredentialAsync(
        context,
        request,
        null,
        executor,
        new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
            @Override
            public void onResult(GetCredentialResponse result) {
                try {
                    JSObject user = handleSignInResult(result);
                    call.resolve(user);
                } catch (JSONException e) {
                    call.reject("Error creating user object: " + e.getMessage());
                }
            }

            @Override
            public void onError(GetCredentialException e) {
                call.reject("No current user: " + e.getMessage());
            }
        }
    );
  }

  @Override
  public void refresh(PluginCall call) {
    // Implement refresh logic here
    call.reject("Not implemented");
  }
}
