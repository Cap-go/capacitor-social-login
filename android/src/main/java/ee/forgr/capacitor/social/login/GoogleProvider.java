package ee.forgr.capacitor.social.login;

import android.accounts.Account;
import android.app.Activity;
import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

public class GoogleProvider implements SocialProvider {

  private static final String LOG_TAG = "GoogleProvider";
  private static final String SHARED_PREFERENCE_NAME =
    "GOOGLE_LOGIN_F13oz0I_SHARED_PERF";
  private static final String GOOGLE_DATA_PREFERENCE =
    "GOOGLE_LOGIN_GOOGLE_DATA_9158025e-947d-4211-ba51-40451630cc47";

  private final Activity activity;
  private final Context context;
  private CredentialManager credentialManager;
  private String clientId;

  private String idToken = null;

  public GoogleProvider(Activity activity, Context context) {
    this.activity = activity;
    this.context = context;
  }

  public void initialize(String clientId) {
    this.credentialManager = CredentialManager.create(activity);
    this.clientId = clientId;

    String data = context
      .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
      .getString(GOOGLE_DATA_PREFERENCE, null);

    if (data == null || data.isEmpty()) {
      Log.i(SocialLoginPlugin.LOG_TAG, "No data to restore for google login");
      return;
    }
    try {
      JSONObject object = new JSONObject(data);
      GoogleProvider.this.idToken = object.optString("idToken", null);

      Log.i(
        SocialLoginPlugin.LOG_TAG,
        String.format("Google restoreState: %s", object)
      );
    } catch (JSONException e) {
      Log.e(
        SocialLoginPlugin.LOG_TAG,
        "Google restoreState: Failed to parse JSON",
        e
      );
    }
  }

  @Override
  public void login(PluginCall call, JSONObject config) {
    if (this.clientId == null || this.clientId.isEmpty()) {
      call.reject("Google Sign-In failed: Client ID is not set");
      return;
    }

    String nonce = call.getString("nonce");

    // First attempt with setFilterByAuthorizedAccounts(true)
    //    GetGoogleIdOption.Builder googleIdOptionBuilder =
    //      new GetGoogleIdOption.Builder()
    //        .setFilterByAuthorizedAccounts(true)
    //        .setServerClientId(this.clientId)
    //        .setAutoSelectEnabled(true);
    GetSignInWithGoogleOption.Builder googleIdOptionBuilder =
      new GetSignInWithGoogleOption.Builder(this.clientId);

    if (nonce != null && !nonce.isEmpty()) {
      googleIdOptionBuilder.setNonce(nonce);
    }

    GetSignInWithGoogleOption googleIdOptionFiltered =
      googleIdOptionBuilder.build();
    GetCredentialRequest filteredRequest = new GetCredentialRequest.Builder()
      .addCredentialOption(googleIdOptionFiltered)
      .build();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.getCredentialAsync(
      context,
      filteredRequest,
      null,
      executor,
      new CredentialManagerCallback<
        GetCredentialResponse,
        GetCredentialException
      >() {
        @Override
        public void onResult(GetCredentialResponse result) {
          handleSignInResult(result, call);
        }

        @Override
        public void onError(GetCredentialException e) {
          // If no authorized accounts, try again without filtering
          handleSignInError(e, call);
        }
      }
    );
  }

  private void persistState(String idToken) throws JSONException {
    JSONObject object = new JSONObject();
    object.put("idToken", idToken);

    GoogleProvider.this.idToken = idToken;

    activity
      .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(GOOGLE_DATA_PREFERENCE, object.toString())
      .apply();
  }

  private void handleSignInResult(
    GetCredentialResponse result,
    PluginCall call
  ) {
    try {
      JSObject user = handleSignInResult(result);
      JSObject response = new JSObject();
      response.put("provider", "google");
      JSObject resultObj = new JSObject();

      Credential credential = result.getCredential();
      if (credential instanceof CustomCredential) {
        if (
          GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(
            credential.getType()
          )
        ) {
          GoogleIdTokenCredential googleIdTokenCredential =
            GoogleIdTokenCredential.createFrom(credential.getData());
          String idToken = googleIdTokenCredential.getIdToken();
          resultObj.put("idToken", idToken);

          // Start a new task to retrieve the access token
          new AccessTokenRetrievalTask(this, call, resultObj, user).execute(
            googleIdTokenCredential
          );

          return; // The call will be resolved in the AsyncTask
        }
      }

      // If we reach here, something went wrong
      call.reject("Failed to get Google credentials");
    } catch (Exception e) {
      call.reject("Error handling sign-in result: " + e.getMessage());
    }
  }

  private static class AccessTokenRetrievalTask
    extends AsyncTask<GoogleIdTokenCredential, Void, AccessToken> {

    private final WeakReference<GoogleProvider> providerRef;
    private final PluginCall call;
    private final JSObject resultObj;
    private final JSObject user;

    AccessTokenRetrievalTask(
      GoogleProvider provider,
      PluginCall call,
      JSObject resultObj,
      JSObject user
    ) {
      this.providerRef = new WeakReference<>(provider);
      this.call = call;
      this.resultObj = resultObj;
      this.user = user;
    }

    @Override
    protected AccessToken doInBackground(GoogleIdTokenCredential... params) {
      GoogleProvider provider = providerRef.get();
      if (provider == null) return null;

      GoogleIdTokenCredential credential = params[0];
      try {
        Account account = new Account(credential.getId(), "com.google");
        String scopes = "oauth2:profile email";
        String token = GoogleAuthUtil.getToken(
          provider.context,
          account,
          scopes
        );

        AccessToken accessToken = new AccessToken();
        accessToken.token = token;
        accessToken.userId = credential.getId();
        // Note: We don't have exact expiration time, so we're not setting it here

        return accessToken;
      } catch (IOException | GoogleAuthException e) {
        Log.e(LOG_TAG, "Failed to get access token: " + e.getMessage(), e);
        return null;
      }
    }

    @Override
    protected void onPostExecute(AccessToken accessToken) {
      if (accessToken != null) {
        JSObject accessTokenObj = new JSObject();
        accessTokenObj.put("token", accessToken.token);
        accessTokenObj.put("userId", accessToken.userId);

        resultObj.put("accessToken", accessTokenObj);
        resultObj.put("profile", user);
        JSObject response = new JSObject();
        response.put("provider", "google");
        response.put("result", resultObj);
        call.resolve(response);
      } else {
        call.reject("Failed to get access token");
      }
    }
  }

  private void handleSignInError(GetCredentialException e, PluginCall call) {
    Log.e(LOG_TAG, "Google Sign-In failed", e);
    if (e instanceof NoCredentialException) {
      call.reject(
        "No Google accounts available. Please add a Google account to your device and try again."
      );
    } else {
      call.reject("Google Sign-In failed: " + e.getMessage());
    }
  }

  private JSObject handleSignInResult(GetCredentialResponse result)
    throws JSONException {
    JSObject user = new JSObject();
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
  public void logout(PluginCall call) {
    ClearCredentialStateRequest request = new ClearCredentialStateRequest();

    Executor executor = Executors.newSingleThreadExecutor();
    credentialManager.clearCredentialStateAsync(
      request,
      null,
      executor,
      new CredentialManagerCallback<Void, ClearCredentialException>() {
        @Override
        public void onResult(Void result) {
          context
            .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply();
          GoogleProvider.this.idToken = null;
          call.resolve();
        }

        @Override
        public void onError(ClearCredentialException e) {
          Log.e(LOG_TAG, "Failed to clear credential state", e);
          call.reject("Failed to clear credential state: " + e.getMessage());
        }
      }
    );
  }

  @Override
  public void getAuthorizationCode(PluginCall call) {
    JSObject response = new JSObject();
    if (GoogleProvider.this.idToken == null) {
      call.reject("Not logged in to google, cannot get authorization code!");
      return;
    }
    response.put("jwt", GoogleProvider.this.idToken);
    call.resolve(response);
  }

  @Override
  public void isLoggedIn(PluginCall call) {
    call.resolve(
      new JSObject().put("isLoggedIn", GoogleProvider.this.idToken != null)
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
      new CredentialManagerCallback<
        GetCredentialResponse,
        GetCredentialException
      >() {
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

  private static class AccessToken {

    String token;
    String userId;
    // Add other fields as needed (expires, isExpired, etc.)
  }
}
