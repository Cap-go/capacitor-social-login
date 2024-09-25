package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Looper;
import android.content.Intent;

import androidx.activity.result.ActivityResult;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
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
    public void removeSharedPreferencePrivate(String key) {
      this.activity.getSharedPreferences(SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)
              .edit()
              .remove(key)
              .apply();
    }

    @Override
    public FunctionResult<Void, String> startNamedActivityForResult(Intent intent, String name) {
      return FunctionResult.error("Not implemented for global helpers");
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

  private class SocialLoginPluginWithCallHelper extends SocialLoginPluginHelper {

    PluginCall call;

    public SocialLoginPluginWithCallHelper(SocialLoginPluginHelper helper, PluginCall call) {
      super(helper.context, helper.activity);
      this.call = call;
    }

    @Override
    public FunctionResult<Void, String> startNamedActivityForResult(Intent intent, String name) {
      startActivityForResult(this.call, intent, name);
      return FunctionResult.success(null);
    }
  }

  private SocialLoginPluginHelper helper;


  @PluginMethod
  public void initialize(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      call.reject("Your android device is too old");
      return;
    }

    this.helper = new SocialLoginPluginHelper(this.getContext(), this.getActivity());

    JSObject apple =  call.getObject("apple");
    if (apple != null) {

      String androidAppleRedirect = apple.getString("redirectUrl");
      if (androidAppleRedirect == null || androidAppleRedirect.isEmpty()) {
        call.reject("apple.android.redirectUrl is null or empty");
        return;
      }

      String androidAppleClientId = apple.getString("clientId");
      if (androidAppleClientId == null || androidAppleClientId.isEmpty()) {
        call.reject("apple.android.clientId is null or empty");
        return;
      }

      AppleProvider appleProvider = new AppleProvider(androidAppleRedirect, androidAppleClientId);
      appleProvider.initialize(this.helper);
      this.socialProviderHashMap.put("apple", appleProvider);
    }

    JSObject google =  call.getObject("google");
    if (google != null) {
      GoogleProvider googleProvider = new GoogleProvider(this.getActivity());
      googleProvider.initialize(this.helper, new JSONObject());
      this.socialProviderHashMap.put("google", googleProvider);
    }

//    JSObject facebook = call.getObject("facebook");
//    if (facebook != null) {
//        FacebookProvider facebookProvider = new FacebookProvider(this.getActivity());
//        facebookProvider.initialize(this.helper);
//        this.socialProviderHashMap.put("facebook", facebookProvider);
//    }

    call.resolve();
  }

  @ActivityCallback
  protected void googleSignInResult(PluginCall call, ActivityResult result) {
    if (call == null) return;

    SocialProvider provider = this.socialProviderHashMap.get("google");
    if (!(provider instanceof GoogleProvider provider1)) {
      call.reject("Cannot find google provide, this should never happen");
      return;
    }

    provider1.handleOnActivityResult(result);
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

    provider.login(new SocialLoginPluginWithCallHelper(this.helper, call), options)
            .onError(call::reject)
            .onSuccess(unused -> { call.resolve(); });
  }

  @PluginMethod
  public void logout(PluginCall call) {
    String providerStr = call.getString("provider", "");
    if (providerStr == null || providerStr.isEmpty()) {
      call.reject("provider not provided");
    }

    SocialProvider provider = this.socialProviderHashMap.get(providerStr);
    if (provider == null) {
      call.reject(String.format("Cannot find provider '%s'", providerStr));
      return;
    }

    provider.logout(this.helper)
            .onError(call::reject)
            .onSuccess(unused -> call.resolve());
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
