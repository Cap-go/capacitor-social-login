package ee.forgr.capacitor.social.login;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.auth0.android.jwt.JWT;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.io.IOException;
import java.util.Objects;
import java.util.UUID;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONTokener;

public class AppleProvider implements SocialProvider {

  private static final String SCOPE = "name%20email";
  private static final String AUTHURL =
    "https://appleid.apple.com/auth/authorize";
  private static final String TOKENURL = "https://appleid.apple.com/auth/token";
  private static final String SHARED_PREFERENCE_NAME =
    "APPLE_LOGIN_Q16ob0k_SHARED_PERF";
  private static final String APPLE_DATA_PREFERENCE =
    "APPLE_LOGIN_APPLE_DATA_83b2d6db-17fe-49c9-8c33-e3f5d02f9f84";

  private PluginCall lastcall;
  private String appleAuthURLFull;

  private String idToken;
  private String refreshToken;
  private String accessToken;

  private final String clientId;
  private final String redirectUrl;
  private final Activity activity;
  private final Context context;

  private CustomTabsClient customTabsClient;
  private CustomTabsSession currentSession;
  CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
    @Override
    public void onCustomTabsServiceConnected(
      @NonNull ComponentName name,
      CustomTabsClient client
    ) {
      customTabsClient = client;
      client.warmup(0);
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {}
  };

  public AppleProvider(
    String redirectUrl,
    String clientId,
    Activity activity,
    Context context
  ) {
    this.redirectUrl = redirectUrl;
    this.clientId = clientId;
    this.activity = activity;
    this.context = context;
  }

  public void initialize() {
    String data = context
      .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
      .getString(APPLE_DATA_PREFERENCE, null);

    if (data == null || data.isEmpty()) {
      Log.i(SocialLoginPlugin.LOG_TAG, "No data to restore for apple login");
      return;
    }
    try {
      JSONObject object = new JSONObject(data);
      String idToken = object.optString("idToken", null);
      String refreshToken = object.optString("refreshToken", null);
      String accessToken = object.optString("accessToken", null);
      AppleProvider.this.idToken = idToken;
      AppleProvider.this.refreshToken = refreshToken;
      AppleProvider.this.accessToken = accessToken;
      Log.i(
        SocialLoginPlugin.LOG_TAG,
        String.format("Apple restoreState: %s", object)
      );
    } catch (JSONException e) {
      Log.e(
        SocialLoginPlugin.LOG_TAG,
        "Apple restoreState: Failed to parse JSON",
        e
      );
    }
  }

  public void handleIntent(Intent intent) {
    // Extract information from the URI
    Uri data = intent.getData();

    // Data should never be null
    assert data != null;

    String scheme = data.getScheme(); // "capgo-demo-app"
    String host = data.getHost(); // "path"
    String path = data.getPath(); // Additional path segments
    String query = data.getQuery(); // Query parameters

    Log.i(
      SocialLoginPlugin.LOG_TAG,
      String.format(
        "Recieved apple login intent: %s, %s, %s, %s",
        scheme,
        host,
        path,
        query
      )
    );

    handleUrl(data.toString());
    //    if (data.toString().contains("success=")) {
    //      this.currentSession.
    //    }
  }

  @Override
  public void login(PluginCall call, JSONObject config) {
    if (this.lastcall != null) {
      call.reject("Last call is not null");
    }

    String state = UUID.randomUUID().toString();
    this.appleAuthURLFull = AUTHURL +
    "?client_id=" +
    this.clientId +
    "&redirect_uri=" +
    this.redirectUrl +
    "&response_type=code&scope=" +
    SCOPE +
    "&response_mode=form_post&state=" +
    state;

    if (context == null || activity == null) {
      call.reject("Context or Activity is null");
      return;
    }

    this.lastcall = call;
    call.setKeepAlive(true);
    activity.runOnUiThread(() ->
      setupWebview(context, activity, call, appleAuthURLFull)
    );
  }

  @Override
  public void logout(PluginCall call) {
    if (this.idToken == null || this.idToken.isEmpty()) {
      call.reject("Not logged in; Cannot logout");
      return;
    }

    context
      .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
      .edit()
      .clear()
      .apply();
    this.idToken = null;
    this.refreshToken = null;
    this.accessToken = null;

    call.resolve();
  }

  @Override
  public void getAuthorizationCode(PluginCall call) {
    if (this.idToken != null && !this.idToken.isEmpty()) {
      call.resolve(new JSObject().put("jwt", this.idToken));
    } else {
      call.reject("Apple-login not logged in!");
    }
  }

  @Override
  public void isLoggedIn(PluginCall call) {
    if (this.idToken != null && !this.idToken.isEmpty()) {
      try {
        JWT jwt = new JWT(this.idToken);
        boolean isLoggedIn = !jwt.isExpired(0);
        call.resolve(new JSObject().put("isLoggedIn", isLoggedIn));
      } catch (Exception e) {
        call.reject("Error checking login status", e);
      }
    } else {
      call.resolve(new JSObject().put("isLoggedIn", false));
    }
  }

  @Override
  public void getCurrentUser(PluginCall call) {
    if (this.idToken != null && !this.idToken.isEmpty()) {
      JSObject result = new JSObject();
      result.put("accessToken", createAccessTokenObject(this.accessToken));
      result.put("profile", createProfileObject(this.idToken));
      result.put("idToken", this.idToken);
      result.put("authorizationCode", ""); // Apple doesn't provide this after initial login
      call.resolve(result);
    } else {
      call.reject("Not logged in");
    }
  }

  @Override
  public void refresh(PluginCall call) {
    call.reject("Not implemented");
  }

  public void handleUrl(String url) {
    Uri uri = Uri.parse(url);
    String success = uri.getQueryParameter("success");
    if ("true".equals(success)) {
      String accessToken = uri.getQueryParameter("access_token");
      if (accessToken != null) {
        String refreshToken = uri.getQueryParameter("refresh_token");
        String idToken = uri.getQueryParameter("id_token");
        try {
          persistState(idToken, refreshToken, accessToken);
          JSObject result = new JSObject();
          result.put("accessToken", createAccessTokenObject(accessToken));
          result.put("profile", createProfileObject(idToken));
          result.put("idToken", idToken);
          result.put("authorizationCode", ""); // Apple doesn't provide this in the response

          JSObject response = new JSObject();
          response.put("provider", "apple");
          response.put("result", result);

          this.lastcall.resolve(response);
        } catch (JSONException e) {
          Log.e(SocialLoginPlugin.LOG_TAG, "Cannot persist state", e);
          this.lastcall.reject("Cannot persist state", e);
        }
      } else {
        String appleAuthCode = uri.getQueryParameter("code");
        String appleClientSecret = uri.getQueryParameter("client_secret");
        requestForAccessToken(appleAuthCode, appleClientSecret);
      }
    } else {
      this.lastcall.reject("We couldn't get the Auth Code");
    }
    this.lastcall = null;
  }

  private void requestForAccessToken(String code, String clientSecret) {
    OkHttpClient client = new OkHttpClient();
    FormBody formBody = new FormBody.Builder()
      .add("grant_type", "authorization_code")
      .add("code", code)
      .add("redirect_uri", redirectUrl)
      .add("client_id", clientId)
      .add("client_secret", clientSecret)
      .build();

    Request request = new Request.Builder()
      .url(TOKENURL)
      .post(formBody)
      .build();

    client
      .newCall(request)
      .enqueue(
        new Callback() {
          @Override
          public void onFailure(@NonNull Call call, @NonNull IOException e) {
            AppleProvider.this.lastcall.reject("Cannot get access_token", e);
            AppleProvider.this.lastcall = null;
          }

          @Override
          public void onResponse(
            @NonNull Call call,
            @NonNull Response response
          ) throws IOException {
            try {
              if (!response.isSuccessful()) throw new IOException(
                "Unexpected code " + response
              );

              String responseData = Objects.requireNonNull(
                response.body()
              ).string();
              JSONObject jsonObject = (JSONObject) new JSONTokener(
                responseData
              ).nextValue();
              String accessToken = jsonObject.getString("access_token");
              String refreshToken = jsonObject.getString("refresh_token");
              String idToken = jsonObject.getString("id_token");

              persistState(idToken, refreshToken, accessToken);
              AppleProvider.this.lastcall.resolve(
                  new JSObject()
                    .put("provider", "apple")
                    .put("result", new JSObject().put("identityToken", idToken))
                );
              AppleProvider.this.lastcall = null;
            } catch (Exception e) {
              AppleProvider.this.lastcall.reject("Cannot get access_token", e);
              AppleProvider.this.lastcall = null;
            } finally {
              response.close();
            }
          }
        }
      );
  }

  private void persistState(
    String idToken,
    String refreshToken,
    String accessToken
  ) throws JSONException {
    JSONObject object = new JSONObject();
    object.put("idToken", idToken);
    object.put("refreshToken", refreshToken);
    object.put("accessToken", accessToken);

    AppleProvider.this.idToken = idToken;
    AppleProvider.this.refreshToken = refreshToken;
    AppleProvider.this.accessToken = accessToken;

    activity
      .getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(APPLE_DATA_PREFERENCE, object.toString())
      .apply();
  }

  public CustomTabsSession getCustomTabsSession() {
    if (customTabsClient == null) {
      return null;
    }

    if (currentSession == null) {
      currentSession = customTabsClient.newSession(new CustomTabsCallback() {});
    }
    return currentSession;
  }

  @SuppressLint("SetJavaScriptEnabled")
  private void setupWebview(
    Context context,
    Activity activity,
    PluginCall call,
    String url
  ) {
    CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder(
      getCustomTabsSession()
    );

    builder.build().launchUrl(context, Uri.parse(url));
  }

  private JSObject createAccessTokenObject(String accessToken) {
    JSObject tokenObject = new JSObject();
    tokenObject.put("token", accessToken);
    // Add other fields if available
    return tokenObject;
  }

  private JSObject createProfileObject(String idToken) {
    JSObject profileObject = new JSObject();
    // Parse the ID token to extract user information
    // This is a simplified example. In practice, you should properly decode and verify the JWT.
    String[] parts = idToken.split("\\.");
    if (parts.length == 3) {
      try {
        String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE));
        JSONObject claims = new JSONObject(payload);
        profileObject.put("user", claims.optString("sub"));
        profileObject.put("email", claims.optString("email"));
        // Apple doesn't provide given name and family name in the ID token
        profileObject.put("givenName", JSONObject.NULL);
        profileObject.put("familyName", JSONObject.NULL);
      } catch (JSONException e) {
        Log.e(LOG_TAG, "Error parsing ID token", e);
      }
    }
    return profileObject;
  }
}
