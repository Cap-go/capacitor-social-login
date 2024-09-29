package ee.forgr.capacitor.social.login;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import androidx.annotation.NonNull;
import com.auth0.android.jwt.JWT;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
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

  private String appleAuthURLFull;
  private Dialog appledialog;

  private String idToken;
  private String refreshToken;
  private String accessToken;

  private final String clientId;
  private final String redirectUrl;
  private final Activity activity;
  private final Context context;

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

  public void initialize(JSONObject config) {
    this.idToken = config.optString("idToken", null);
    this.refreshToken = config.optString("refreshToken", null);
    this.accessToken = config.optString("accessToken", null);
    Log.i(
      SocialLoginPlugin.LOG_TAG,
      String.format("Apple restoreState: %s", config)
    );
  }

  @Override
  public void login(PluginCall call, JSONObject config) {
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
      call.resolve(new JSObject().put("code", this.idToken));
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
    call.reject("Not implemented");
  }

  @Override
  public void refresh(PluginCall call) {
    call.reject("Not implemented");
  }

  private class AppleWebViewClient extends WebViewClient {

    private final Activity activity;
    private final String clientId;
    private final String redirectUrl;
    private final PluginCall call;

    public AppleWebViewClient(
      Activity activity,
      PluginCall call,
      String redirectUrl,
      String clientId
    ) {
      this.activity = activity;
      this.redirectUrl = redirectUrl;
      this.clientId = clientId;
      this.call = call;
    }

    @Override
    public boolean shouldOverrideUrlLoading(
      WebView view,
      WebResourceRequest request
    ) {
      String url = request.getUrl().toString();
      if (url.startsWith(redirectUrl)) {
        handleUrl(url);
        if (url.contains("success=")) {
          appledialog.dismiss();
        }
        return true;
      }
      return false;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      super.onPageFinished(view, url);
      Rect displayRectangle = new Rect();
      Window window = activity.getWindow();
      window.getDecorView().getWindowVisibleDisplayFrame(displayRectangle);
      view.setLayoutParams(
        new android.view.ViewGroup.LayoutParams(
          android.view.ViewGroup.LayoutParams.MATCH_PARENT,
          (int) (displayRectangle.height() * 0.9f)
        )
      );
    }

    private void handleUrl(String url) {
      Uri uri = Uri.parse(url);
      String success = uri.getQueryParameter("success");
      if ("true".equals(success)) {
        String accessToken = uri.getQueryParameter("access_token");
        if (accessToken != null) {
          String refreshToken = uri.getQueryParameter("refresh_token");
          String idToken = uri.getQueryParameter("id_token");
          try {
            persistState(idToken, refreshToken, accessToken);
            call.resolve(new JSObject().put("success", true));
          } catch (JSONException e) {
            Log.e(SocialLoginPlugin.LOG_TAG, "Cannot persist state", e);
            call.reject("Cannot persist state", e);
          }
        } else {
          String appleAuthCode = uri.getQueryParameter("code");
          String appleClientSecret = uri.getQueryParameter("client_secret");
          requestForAccessToken(appleAuthCode, appleClientSecret);
        }
      } else {
        call.reject("We couldn't get the Auth Code");
      }
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
              AppleWebViewClient.this.call.reject("Cannot get access_token", e);
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
                AppleWebViewClient.this.call.resolve(
                    new JSObject().put("success", true)
                  );
              } catch (Exception e) {
                AppleWebViewClient.this.call.reject(
                    "Cannot get access_token",
                    e
                  );
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
        .putString(SHARED_PREFERENCE_NAME, object.toString())
        .apply();
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  private void setupWebview(
    Context context,
    Activity activity,
    PluginCall call,
    String url
  ) {
    this.appledialog = new Dialog(context, R.style.CustomDialogTheme);
    Window window = appledialog.getWindow();
    if (window != null) {
      window.setLayout(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT
      );
      window.setGravity(Gravity.TOP);
      window.setBackgroundDrawable(new ColorDrawable(Color.WHITE));
      window.setDimAmount(0.0f);
    }

    View customView = activity
      .getLayoutInflater()
      .inflate(R.layout.dialog_custom_layout, null);
    WebView webView = customView.findViewById(R.id.webview);
    ProgressBar progressBar = customView.findViewById(R.id.progress_bar);

    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);

    AppleWebViewClient webViewClient = new AppleWebViewClient(
      activity,
      call,
      this.redirectUrl,
      this.clientId
    ) {
      @Override
      public void onPageStarted(WebView view, String url, Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        progressBar.setVisibility(View.VISIBLE);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        progressBar.setVisibility(View.GONE);
      }
    };

    webView.setWebViewClient(webViewClient);

    webView.getSettings().setJavaScriptEnabled(true);
    webView.loadUrl(url);

    ImageButton closeButton = customView.findViewById(R.id.close_button);
    closeButton.setOnClickListener(v -> appledialog.dismiss());

    appledialog.setContentView(customView);

    appledialog.show();
  }
}
