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
import java.util.concurrent.Semaphore;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

  public static String LOG_TAG = "CapgoSocialLogin";
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
    public FunctionResult.ThrowableFunctionResult<Void> runOnUiThreadBlocking(Runnable runnable) {
      if (Looper.myLooper() == Looper.getMainLooper()) {
        // This code is running on the UI thread
        runnable.run();
        return new FunctionResult.ThrowableFunctionResult<>(null, null);
      } else {
        // This code is running on a background thread
        // it will block the current background thread

        Semaphore semaphore = new Semaphore(0);
        this.activity.runOnUiThread(() -> {
          runnable.run();
          semaphore.release();
        });
          try {
            semaphore.acquire();
            return new FunctionResult.ThrowableFunctionResult<>(null, null);
          } catch (InterruptedException e) {
            return new FunctionResult.ThrowableFunctionResult<>(null, e);
          }
      }

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

//    JSObject payload = call.getObject("payload");
//
//    if (provider.equals("facebook")) {
//      facebookProvider.login(call, payload);
//    } else if (provider.equals("google")) {
//      googleProvider.login(call, payload);
//    } else if (provider.equals("twitter")) {
//      twitterProvider.login(call, payload);
//    } else if (provider.equals("apple")) {
//      appleProvider.login(call, payload);
//    } else {
//      call.reject("Unsupported social login provider: " + provider);
//    }

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
//
//    if (provider.equals("facebook")) {
//      facebookProvider.logout(call);
//    } else if (provider.equals("google")) {
//      googleProvider.logout(call);
//    } else if (provider.equals("twitter")) {
//      twitterProvider.logout(call);
//    } else if (provider.equals("apple")) {
//      appleProvider.logout(call);
//    } else {
//      call.reject("Unsupported social login provider: " + provider);
//    }
  }

  @PluginMethod
  public void getCurrentUser(PluginCall call) {
    String provider = call.getString("provider");
//
//    if (provider.equals("facebook")) {
//      facebookProvider.getCurrentUser(call);
//    } else if (provider.equals("google")) {
//      googleProvider.getCurrentUser(call);
//    } else if (provider.equals("twitter")) {
//      twitterProvider.getCurrentUser(call);
//    } else if (provider.equals("apple")) {
//      appleProvider.getCurrentUser(call);
//    } else {
//      call.reject("Unsupported social login provider: " + provider);
//    }
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
