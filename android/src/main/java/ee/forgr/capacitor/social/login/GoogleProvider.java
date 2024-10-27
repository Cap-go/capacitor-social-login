package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
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
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.Scopes;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

@RequiresApi(api = Build.VERSION_CODES.N)
public class GoogleProvider implements SocialProvider {

  private static final String LOG_TAG = "GoogleProvider";
  private static final String SHARED_PREFERENCE_NAME =
    "GOOGLE_LOGIN_F13oz0I_SHARED_PERF";
  private static final String GOOGLE_DATA_PREFERENCE =
    "GOOGLE_LOGIN_GOOGLE_DATA_9158025e-947d-4211-ba51-40451630cc47";
  private static final Integer FUTURE_LIST_LENGTH = 128;
  private static final String USERINFO_URL =
    "https://openidconnect.googleapis.com/v1/userinfo";
  private static final String TOKEN_REQUEST_URL =
    "https://www.googleapis.com/oauth2/v3/tokeninfo";

  public static final Integer REQUEST_AUTHORIZE_GOOGLE_MIN = 583892990;
  public static final Integer REQUEST_AUTHORIZE_GOOGLE_MAX =
    REQUEST_AUTHORIZE_GOOGLE_MIN + GoogleProvider.FUTURE_LIST_LENGTH;

  private final Activity activity;
  private final Context context;
  private CredentialManager credentialManager;
  private String clientId;
  private String[] scopes;
  private List<CompletableFuture<AccessToken>> futuresList = new ArrayList<>(
    FUTURE_LIST_LENGTH
  );

  private String savedAccessToken = null;

  public GoogleProvider(Activity activity, Context context) {
    this.activity = activity;
    this.context = context;

    for (int i = 0; i < FUTURE_LIST_LENGTH; i++) {
      futuresList.add(null);
    }
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
      GoogleProvider.this.savedAccessToken = object.optString(
        "savedAccessToken",
        null
      );

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

    // Extract scopes from the config
    JSONArray scopesArray = config.optJSONArray("scopes");
    if (scopesArray != null) {
      this.scopes = new String[scopesArray.length()];
      for (int i = 0; i < scopesArray.length(); i++) {
        this.scopes[i] = scopesArray.optString(i);
      }
    } else {
      // Default scopes if not provided
      this.scopes = new String[] { "profile", "email" };
    }

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

  private void persistState(String savedAccessToken) throws JSONException {
    JSONObject object = new JSONObject();
    object.put("savedAccessToken", savedAccessToken);

    GoogleProvider.this.savedAccessToken = savedAccessToken;

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
      JSObject profile = new JSObject();
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
          //          resultObj.put("idToken", idToken);

          // Use ExecutorService to retrieve the access token
          ExecutorService executor = Executors.newSingleThreadExecutor();
          CompletableFuture<AccessToken> future = getAccessToken(call);

          executor.execute(
            new Runnable() {
              @Override
              public void run() {
                try {
                  AccessToken accessToken = future.get();

                  OkHttpClient client = new OkHttpClient();
                  Request request = new Request.Builder()
                    .url(USERINFO_URL)
                    .get()
                    .addHeader("Authorization", "Bearer " + accessToken.token)
                    .build();

                  CompletableFuture<Date> tokenExpiresIn =
                    new CompletableFuture<>();
                  Request tokenRequest = new Request.Builder()
                    .url(
                      TOKEN_REQUEST_URL +
                      "?" +
                      "access_token=" +
                      accessToken.token
                    )
                    .get()
                    .build();

                  client
                    .newCall(tokenRequest)
                    .enqueue(
                      new Callback() {
                        @Override
                        public void onFailure(
                          @NonNull Call call,
                          @NonNull IOException e
                        ) {}

                        @Override
                        public void onResponse(
                          @NonNull Call httpCall,
                          @NonNull Response httpResponse
                        ) throws IOException {
                          if (!httpResponse.isSuccessful()) {
                            tokenExpiresIn.completeExceptionally(
                              new RuntimeException(
                                String.format(
                                  "Invalid response from %s. Response not successful. Status code: %s",
                                  TOKEN_REQUEST_URL,
                                  httpResponse.code()
                                )
                              )
                            );
                            Log.e(
                              LOG_TAG,
                              String.format(
                                "Invalid response from %s. Response not successful. Status code: %s",
                                TOKEN_REQUEST_URL,
                                httpResponse.code()
                              )
                            );
                            return;
                          }

                          ResponseBody responseBody = httpResponse.body();
                          if (responseBody == null) {
                            tokenExpiresIn.completeExceptionally(
                              new RuntimeException(
                                String.format(
                                  "Invalid response from %s. Response body is null",
                                  TOKEN_REQUEST_URL
                                )
                              )
                            );
                            Log.e(
                              LOG_TAG,
                              String.format(
                                "Invalid response from %s. Response body is null",
                                TOKEN_REQUEST_URL
                              )
                            );
                            return;
                          }

                          String responseString = responseBody.string();
                          JSONObject jsonObject;
                          try {
                            jsonObject = (JSONObject) new JSONTokener(
                              responseString
                            ).nextValue();
                          } catch (JSONException e) {
                            tokenExpiresIn.completeExceptionally(
                              new RuntimeException(
                                String.format(
                                  "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                  TOKEN_REQUEST_URL,
                                  e
                                )
                              )
                            );
                            Log.e(
                              LOG_TAG,
                              String.format(
                                "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                TOKEN_REQUEST_URL,
                                e
                              )
                            );
                            return;
                          }

                          String expiresIn;
                          try {
                            expiresIn = jsonObject.getString("expires_in");
                          } catch (JSONException e) {
                            tokenExpiresIn.completeExceptionally(
                              new RuntimeException(
                                String.format(
                                  "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                                  TOKEN_REQUEST_URL,
                                  e
                                )
                              )
                            );
                            Log.e(
                              LOG_TAG,
                              String.format(
                                "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                                TOKEN_REQUEST_URL,
                                e
                              )
                            );
                            return;
                          }

                          Integer expressInInt;
                          try {
                            expressInInt = Integer.parseInt(expiresIn);
                          } catch (Exception e) {
                            tokenExpiresIn.completeExceptionally(
                              new RuntimeException(
                                String.format(
                                  "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                                  TOKEN_REQUEST_URL,
                                  expiresIn,
                                  e
                                )
                              )
                            );
                            Log.e(
                              LOG_TAG,
                              String.format(
                                "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                                TOKEN_REQUEST_URL,
                                expiresIn,
                                e
                              )
                            );
                            return;
                          }

                          Date instant = new Date();
                          Calendar calendar = Calendar.getInstance();
                          calendar.setTime(instant);
                          calendar.add(Calendar.SECOND, expressInInt);
                          tokenExpiresIn.complete(calendar.getTime());
                        }
                      }
                    );

                  client
                    .newCall(request)
                    .enqueue(
                      new Callback() {
                        @Override
                        public void onResponse(
                          @NonNull Call httpCall,
                          @NonNull Response httpResponse
                        ) throws IOException {
                          try {
                            if (!httpResponse.isSuccessful()) {
                              call.reject(
                                String.format(
                                  "Invalid response from %s. Response not successful. Status code: %s",
                                  USERINFO_URL,
                                  httpResponse.code()
                                )
                              );
                              Log.e(
                                LOG_TAG,
                                String.format(
                                  "Invalid response from %s. Response not successful. Status code: %s",
                                  USERINFO_URL,
                                  httpResponse.code()
                                )
                              );
                              return;
                            }
                            ResponseBody responseBody = httpResponse.body();
                            if (responseBody == null) {
                              call.reject(
                                String.format(
                                  "Invalid response from %s. Response body is null",
                                  USERINFO_URL
                                )
                              );
                              Log.e(
                                LOG_TAG,
                                String.format(
                                  "Invalid response from %s. Response body is null",
                                  USERINFO_URL
                                )
                              );
                              return;
                            }

                            String responseString = responseBody.string();
                            JSONObject jsonObject;
                            try {
                              jsonObject = (JSONObject) new JSONTokener(
                                responseString
                              ).nextValue();
                            } catch (JSONException e) {
                              call.reject(
                                String.format(
                                  "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                  USERINFO_URL,
                                  e
                                )
                              );
                              Log.e(
                                LOG_TAG,
                                String.format(
                                  "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                                  USERINFO_URL,
                                  e
                                )
                              );
                              return;
                            }

                            try {
                              String name = jsonObject.getString("name");
                              String givenName = jsonObject.getString(
                                "given_name"
                              );
                              String familyName = jsonObject.getString(
                                "family_name"
                              );
                              String picture = jsonObject.getString("picture");
                              String email = jsonObject.getString("email");
                              String sub = jsonObject.getString("sub");

                              // now, let's try to get the expiry
                              try {
                                Date expiryDate = tokenExpiresIn.get(
                                  5,
                                  TimeUnit.SECONDS
                                );
                                long seconds =
                                  (expiryDate.getTime() -
                                    (new Date()).getTime()) /
                                  1000;
                                accessToken.expires = String.valueOf(seconds);
                              } catch (
                                ExecutionException
                                | InterruptedException
                                | TimeoutException e
                              ) {
                                Log.e(LOG_TAG, "Cannot get expiry date", e);
                                // it's a non-fatal error
                              }

                              profile.put("email", email);
                              profile.put("familyName", familyName);
                              profile.put("givenName", givenName);
                              profile.put("id", sub);
                              profile.put("name", name);
                              profile.put("imageUrl", picture);

                              JSObject accessTokenObj = new JSObject();
                              accessTokenObj.put("token", accessToken.token);
                              if (accessToken.expires != null) {
                                accessTokenObj.put(
                                  "expires",
                                  accessToken.expires
                                );
                              }

                              resultObj.put("accessToken", accessTokenObj);
                              resultObj.put("profile", profile);
                              response.put("result", resultObj);
                              persistState(accessToken.token);
                              call.resolve(response);
                            } catch (JSONException e) {
                              call.reject(
                                String.format(
                                  "Invalid response from %s. Could not get some value from JSON. Error: %s",
                                  USERINFO_URL,
                                  e
                                )
                              );
                              Log.e(
                                LOG_TAG,
                                String.format(
                                  "Invalid response from %s. Could not get some value from JSON. Error: %s",
                                  USERINFO_URL,
                                  e
                                )
                              );
                              return;
                            }
                          } finally {
                            httpResponse.close();
                          }
                        }

                        @Override
                        public void onFailure(
                          @NonNull Call httpCall,
                          @NonNull IOException e
                        ) {
                          call.reject(
                            String.format(
                              "Invalid response from %s. Error: %s",
                              USERINFO_URL,
                              e
                            )
                          );
                          Log.e(
                            LOG_TAG,
                            String.format(
                              "Invalid response from %s",
                              USERINFO_URL
                            ),
                            e
                          );
                        }
                      }
                    );
                } catch (Exception e) {
                  call.reject(
                    "Error retrieving access token: " + e.getMessage()
                  );
                } finally {
                  executor.shutdown();
                }
              }
            }
          );

          return; // The call will be resolved in the Runnable
        }
      }

      // If we reach here, something went wrong
      call.reject("Failed to get Google credentials");
    } catch (Exception e) {
      call.reject("Error handling sign-in result: " + e.getMessage());
    }
  }

  private CompletableFuture<AccessToken> getAccessToken(PluginCall call) {
    //      Account account = new Account(credential.getId(), "com.google");
    //      String scopesString = "oauth2:" + TextUtils.join(" ", this.scopes);
    //      String token = GoogleAuthUtil.getToken(
    //        this.context,
    //        account,
    //        scopesString
    //      );
    //
    //      AccessToken accessToken = new AccessToken();
    //      accessToken.token = token;
    //      accessToken.userId = credential.getId();
    //      // Note: We don't have exact expiration time, so we're not setting it here
    //
    //      return accessToken;

    CompletableFuture<AccessToken> future = new CompletableFuture<>();
    List<Scope> scopes = Arrays.asList(
      new Scope(Scopes.EMAIL),
      new Scope(Scopes.PROFILE),
      new Scope(Scopes.OPEN_ID)
    );
    AuthorizationRequest authorizationRequest = AuthorizationRequest.builder()
      .setRequestedScopes(scopes)
      // .requestOfflineAccess(this.clientId)
      .build();

    Identity.getAuthorizationClient(context)
      .authorize(authorizationRequest)
      .addOnSuccessListener(authorizationResult -> {
        if (authorizationResult.hasResolution()) {
          // Access needs to be granted by the user
          PendingIntent pendingIntent = authorizationResult.getPendingIntent();
          if (pendingIntent == null) {
            future.completeExceptionally(
              new RuntimeException("pendingIntent is null")
            );
            Log.e(LOG_TAG, "pendingIntent is null");
            return;
          }

          // Find an index to put the future into.
          int fututeIndex = -1;
          for (int i = 0; i < futuresList.size(); i++) {
            if (futuresList.get(i) == null) {
              fututeIndex = i;
              break;
            }
          }

          if (fututeIndex == -1) {
            future.completeExceptionally(
              new RuntimeException("Cannot find index for future")
            );
            Log.e(
              LOG_TAG,
              "Cannot find index for future. Too many login requests??"
            );
            return;
          }

          futuresList.set(fututeIndex, future);

          try {
            activity.startIntentSenderForResult(
              pendingIntent.getIntentSender(),
              GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN + fututeIndex,
              null,
              0,
              0,
              0,
              null
            );
          } catch (IntentSender.SendIntentException e) {
            Log.e(
              LOG_TAG,
              "Couldn't start Authorization UI: " + e.getLocalizedMessage()
            );
            future.completeExceptionally(e);
          }
        } else {
          // Access already granted, continue with user action
          //saveToDriveAppFolder(authorizationResult);
          assert authorizationResult.getAccessToken() != null;
          Log.i("TAG", authorizationResult.getAccessToken());
          //                  if (authorizationResult.getServerAuthCode() != null)
          //                    Log.i("TAG", authorizationResult.getServerAuthCode());

          AccessToken accessToken = new AccessToken();
          accessToken.token = authorizationResult.getAccessToken();
          future.complete(accessToken);
        }
      })
      .addOnFailureListener(e -> {
        future.completeExceptionally(
          new RuntimeException("Failed to authorize")
        );
        Log.e("TAG", "Failed to authorize", e);
      });

    return future;
  }

  public void handleAuthorizationIntent(int requestCode, Intent data) {
    int futureIndex = requestCode - GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN;
    if (futureIndex < 0 || futureIndex >= futuresList.size()) {
      Log.e(
        LOG_TAG,
        String.format(
          "Invalid future index. REQUEST_AUTHORIZE_GOOGLE_MIN: %d, requestCode: %d, futures list length: %d, futureIndex: %d",
          REQUEST_AUTHORIZE_GOOGLE_MIN,
          requestCode,
          futuresList.size(),
          futureIndex
        )
      );
      return;
    }

    CompletableFuture<AccessToken> future = futuresList.get(futureIndex);

    try {
      AuthorizationResult authorizationResult = Identity.getAuthorizationClient(
        this.activity
      ).getAuthorizationResultFromIntent(data);
      AccessToken accessToken = new AccessToken();
      accessToken.token = authorizationResult.getAccessToken();
      future.complete(accessToken);
    } catch (ApiException e) {
      Log.e(LOG_TAG, "Cannot get getAuthorizationResultFromIntent", e);
      future.completeExceptionally(
        new RuntimeException("Cannot get getAuthorizationResultFromIntent")
      );
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

  private void rawLogout(CredentialManagerCallback<Void, Exception> handler) {
    Log.i(LOG_TAG, "Logout requested");
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
          GoogleProvider.this.savedAccessToken = null;
          handler.onResult(null);
        }

        @Override
        public void onError(ClearCredentialException e) {
          Log.e(LOG_TAG, "Failed to clear credential state", e);
          handler.onError(e);
        }
      }
    );
  }

  @Override
  public void logout(PluginCall call) {
    rawLogout(
      new CredentialManagerCallback<Void, Exception>() {
        @Override
        public void onResult(Void unused) {}

        @Override
        public void onError(@NonNull Exception e) {
          call.reject("Failed to clear credential state: " + e.getMessage());
        }
      }
    );
  }

  public CompletableFuture<Boolean> accessTokenIsValid(String accessToken) {
    CompletableFuture<Boolean> accessTokenIsValid = new CompletableFuture<>();

    OkHttpClient client = new OkHttpClient();
    Request tokenRequest = new Request.Builder()
      .url(TOKEN_REQUEST_URL + "?" + "access_token=" + accessToken)
      .get()
      .build();

    client
      .newCall(tokenRequest)
      .enqueue(
        new Callback() {
          @Override
          public void onFailure(@NonNull Call call, @NonNull IOException e) {}

          @Override
          public void onResponse(
            @NonNull Call httpCall,
            @NonNull Response httpResponse
          ) throws IOException {
            if (!httpResponse.isSuccessful()) {
              accessTokenIsValid.complete(false);
              Log.i(
                LOG_TAG,
                String.format(
                  "Invalid response from %s. Response not successful. Status code: %s. Assuming that the token is not valid",
                  TOKEN_REQUEST_URL,
                  httpResponse.code()
                )
              );
              return;
            }

            ResponseBody responseBody = httpResponse.body();
            if (responseBody == null) {
              accessTokenIsValid.completeExceptionally(
                new RuntimeException(
                  String.format(
                    "Invalid response from %s. Response body is null",
                    TOKEN_REQUEST_URL
                  )
                )
              );
              Log.e(
                LOG_TAG,
                String.format(
                  "Invalid response from %s. Response body is null",
                  TOKEN_REQUEST_URL
                )
              );
              return;
            }

            String responseString = responseBody.string();
            JSONObject jsonObject;
            try {
              jsonObject = (JSONObject) new JSONTokener(
                responseString
              ).nextValue();
            } catch (JSONException e) {
              accessTokenIsValid.completeExceptionally(
                new RuntimeException(
                  String.format(
                    "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                    TOKEN_REQUEST_URL,
                    e
                  )
                )
              );
              Log.e(
                LOG_TAG,
                String.format(
                  "Invalid response from %s. Response body is not a valid JSON. Error: %s",
                  TOKEN_REQUEST_URL,
                  e
                )
              );
              return;
            }

            String expiresIn;
            try {
              expiresIn = jsonObject.getString("expires_in");
            } catch (JSONException e) {
              accessTokenIsValid.completeExceptionally(
                new RuntimeException(
                  String.format(
                    "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                    TOKEN_REQUEST_URL,
                    e
                  )
                )
              );
              Log.e(
                LOG_TAG,
                String.format(
                  "Invalid response from %s. Response JSON does not include expires_in. Error: %s",
                  TOKEN_REQUEST_URL,
                  e
                )
              );
              return;
            }

            Integer expressInInt;
            try {
              expressInInt = Integer.parseInt(expiresIn);
            } catch (Exception e) {
              accessTokenIsValid.completeExceptionally(
                new RuntimeException(
                  String.format(
                    "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                    TOKEN_REQUEST_URL,
                    expiresIn,
                    e
                  )
                )
              );
              Log.e(
                LOG_TAG,
                String.format(
                  "Invalid response from %s. expires_in: %s is not a valid int. Error: %s",
                  TOKEN_REQUEST_URL,
                  expiresIn,
                  e
                )
              );
              return;
            }

            accessTokenIsValid.complete(expressInInt > 5);
          }
        }
      );

    return accessTokenIsValid;
  }

  @Override
  public void getAuthorizationCode(PluginCall call) {
    if (GoogleProvider.this.savedAccessToken == null) {
      call.reject("User is not logged in");
      return;
    }
    CompletableFuture<Boolean> isAccessTokenValid = accessTokenIsValid(
      GoogleProvider.this.savedAccessToken
    );
    try {
      Boolean isValid = isAccessTokenValid.get(10, TimeUnit.SECONDS);
      if (isValid) {
        call.resolve(
          new JSObject()
            .put("accessToken", GoogleProvider.this.savedAccessToken)
        );
      } else {
        rawLogout(
          new CredentialManagerCallback<Void, Exception>() {
            @Override
            public void onResult(Void unused) {
              call.reject("User is not logged in");
            }

            @Override
            public void onError(@NonNull Exception e) {
              // This is a non-fatal error. Let's log it
              Log.e(
                LOG_TAG,
                "Saved access token isn't valid, but logout failed",
                e
              );
              call.reject("User is not logged in");
            }
          }
        );
      }
    } catch (ExecutionException | InterruptedException | TimeoutException e) {
      Log.e(LOG_TAG, "isAccessTokenValid failed", e);
      call.reject(String.format("isAccessTokenValid failed %s", e));
    }
  }

  @Override
  public void isLoggedIn(PluginCall call) {
    if (GoogleProvider.this.savedAccessToken == null) {
      call.resolve(new JSObject().put("isLoggedIn", false));
      return;
    }
    CompletableFuture<Boolean> isAccessTokenValid = accessTokenIsValid(
      GoogleProvider.this.savedAccessToken
    );
    try {
      Boolean isValid = isAccessTokenValid.get(10, TimeUnit.SECONDS);
      if (isValid) {
        call.resolve(new JSObject().put("isLoggedIn", true));
      } else {
        rawLogout(
          new CredentialManagerCallback<Void, Exception>() {
            @Override
            public void onResult(Void unused) {
              call.resolve(new JSObject().put("isLoggedIn", false));
            }

            @Override
            public void onError(@NonNull Exception e) {
              // This is a non-fatal error. Let's log it
              Log.e(
                LOG_TAG,
                "Saved access token isn't valid, but logout failed",
                e
              );
              call.resolve(new JSObject().put("isLoggedIn", false));
            }
          }
        );
      }
    } catch (ExecutionException | InterruptedException | TimeoutException e) {
      Log.e(LOG_TAG, "isAccessTokenValid failed", e);
      call.reject(String.format("isAccessTokenValid failed %s", e));
    }
  }

  @Override
  public void refresh(PluginCall call) {
    // Implement refresh logic here
    call.reject("Not implemented");
  }

  private static class AccessToken {

    String token;
    String expires;
    // Add other fields as needed (expires, isExpired, etc.)
  }
}
