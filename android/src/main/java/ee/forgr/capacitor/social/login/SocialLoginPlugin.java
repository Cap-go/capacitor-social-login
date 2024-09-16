package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Looper;

import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

import ee.forgr.capacitor.social.login.helpers.FunctionResult;
import ee.forgr.capacitor.social.login.helpers.JsonHelper;
import ee.forgr.capacitor.social.login.helpers.PluginHelpers;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import ee.forgr.capacitor.social.login.helpers.ThrowableFunctionResult;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

  public static String LOG_TAG = "CapgoSocialLogin";
  private static String SHARED_PREFERENCE_NAME = "d4e8c13e-ae60-4993-8ae1-0c7c12cabe2a-social-login-capgo";
  private boolean isInitialized = false;

  private HashMap<String, SocialProvider> socialProviderHashMap = new HashMap<>();

  private class SocialLoginPluginHelper implements PluginHelpers {

    private Activity activity;
    private Context context;

    public SocialLoginPluginHelper(Context context, Activity activity) {
      this.activity = activity;
      this.context = context;
    }

    @Override
    public void runOnUiThread(Runnable runnable) {
      if (Looper.myLooper() == Looper.getMainLooper()) {
        // This code is running on the UI thread
        runnable.run();
      } else {
        // This code is running on a background thread
        this.activity.runOnUiThread(runnable::run);
      }
    }

    @Override
    public FunctionResult<Object, String> notifyListener(String name, Map<String, Object> data) {
      ThrowableFunctionResult<JSObject> transcodeResult = JsonHelper.mapToJsonObject(data)
              .transformSuccess(val -> JSObject.fromJSONObject(val));
      if (transcodeResult.isError()) {
        return transcodeResult.convertThrowableToString().disregardSuccess();
      }

      transcodeResult.onSuccess(val -> SocialLoginPlugin.this.notifyListeners(name, val));
      return FunctionResult.success(null);
    }

    @Override
    public void putSharedPreferencePrivate(String key, String value) {
      this.activity.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
              .edit()
              .putString(key, value)
              .apply();
    }

    @Override
    @Nullable
    public String getSharedPreferencePrivate(String key) {
      return this.activity.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
              .getString(key, "");
    }

    @Nullable
    @Override
    public Activity getActivity() {
      return activity;
    }

    @Nullable
    @Override
    public Context getContext() {
      return context;
    }
  }

  private SocialLoginPluginHelper helper;


  @PluginMethod
  public void initialize(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      call.reject("Your android device is too old");
      return;
    }
    if (isInitialized) {
      call.reject("The plugin is already initialized");
      return;
    }

    this.helper = new SocialLoginPluginHelper(this.getContext(), this.getActivity());

    JSObject apple =  call.getObject("apple");
    if (apple != null) {
      JSObject androidApple = apple.getJSObject("android");
      if (androidApple == null) {
        call.reject("Cannot configure apple login, android config is null");
        return;
      }

      String androidAppleRedirect = androidApple.getString("redirectUrl");
      if (androidAppleRedirect == null || androidAppleRedirect.isEmpty()) {
        call.reject("apple.android.redirectUrl is null or empty");
        return;
      }

      String androidAppleClientId = androidApple.getString("clientId");
      if (androidAppleClientId == null || androidAppleClientId.isEmpty()) {
        call.reject("apple.android.clientId is null or empty");
        return;
      }

      AppleLogin appleLogin = new AppleLogin(androidAppleRedirect, androidAppleClientId);
      appleLogin.initialize(this.helper);
      this.socialProviderHashMap.put("apple", appleLogin);
    }


    this.isInitialized = true;
    call.resolve();
  }

  @PluginMethod
  public void login(PluginCall call) {
    String providerStr = call.getString("provider", "");
    if (providerStr == null || providerStr.isEmpty()) {
      call.reject("provider not provided");
    }

    JSONObject options = call.getObject("options", new JSObject());

    SocialProvider provider = this.socialProviderHashMap.get(providerStr);
    if (provider == null) {
      call.reject(String.format("Cannot find provider '%s'", providerStr));
      return;
    }

    provider.login(this.helper, options)
            .onError(call::reject)
            .onSuccess(unused -> call.resolve());
  }

  @PluginMethod
  public void logout(PluginCall call) {
    String provider = call.getString("provider");
  }

  @PluginMethod
  public void getAuthorizationCode(PluginCall call) {
    String providerStr = call.getString("provider", "");
    if (providerStr == null || providerStr.isEmpty()) {
      call.reject("provider not provided");
    }

    SocialProvider provider = this.socialProviderHashMap.get(providerStr);
    if (provider == null) {
      call.reject(String.format("Cannot find provider '%s'", providerStr));
      return;
    }

    provider.getAuthorizationCode()
            .onError(call::reject)
            .onSuccess(value -> {
              JSObject ret = new JSObject();
              ret.put("jwt", value);
              call.resolve(ret);
            });
  }

  @PluginMethod
  public void isLoggedIn(PluginCall call) {
    String providerStr = call.getString("provider", "");
    if (providerStr == null || providerStr.isEmpty()) {
      call.reject("provider not provided");
    }

    SocialProvider provider = this.socialProviderHashMap.get(providerStr);
    if (provider == null) {
      call.reject(String.format("Cannot find provider '%s'", providerStr));
      return;
    }

    provider.isLoggedIn()
            .onError(call::reject)
            .onSuccess(value -> {
              JSObject ret = new JSObject();
              ret.put("isLoggedIn", value);
              call.resolve(ret);
            });
  }

  @PluginMethod
  public void refresh(PluginCall call) {
    String provider = call.getString("provider");

//    if (provider.equals("facebook")) {
//      facebookProvider.refresh(call);
//    } else if (provider.equals("google")) {
//      googleProvider.refresh(call);
//    } else if (provider.equals("twitter")) {
//      twitterProvider.refresh(call);
//    } else if (provider.equals("apple")) {
//      appleProvider.refresh(call);
//    } else {
//      call.reject("Unsupported social login provider: " + provider);
//    }
  }
}
