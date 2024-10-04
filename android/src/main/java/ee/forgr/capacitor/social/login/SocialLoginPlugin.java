package ee.forgr.capacitor.social.login;

import android.content.Intent;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.HashMap;
import org.json.JSONObject;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

  public static String LOG_TAG = "CapgoSocialLogin";

  public HashMap<String, SocialProvider> socialProviderHashMap =
    new HashMap<>();

  @PluginMethod
  public void initialize(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      call.reject("Your android device is too old");
      return;
    }

    JSObject apple = call.getObject("apple");
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

      AppleProvider appleProvider = new AppleProvider(
        androidAppleRedirect,
        androidAppleClientId,
        this.getActivity(),
        this.getContext()
      );

      appleProvider.initialize();
      this.socialProviderHashMap.put("apple", appleProvider);
    }

    JSObject google = call.getObject("google");
    if (google != null) {
      GoogleProvider googleProvider = new GoogleProvider(
        this.getActivity(),
        this.getContext()
      );
      String googleClientId = google.getString("webClientId");
      if (googleClientId == null || googleClientId.isEmpty()) {
        call.reject("google.clientId is null or empty");
        return;
      }
      googleProvider.initialize(googleClientId);
      this.socialProviderHashMap.put("google", googleProvider);
    }

    JSObject facebook = call.getObject("facebook");
    if (facebook != null) {
      FacebookProvider facebookProvider = new FacebookProvider(
        this.getActivity()
      );
      facebookProvider.initialize(new JSONObject());
      this.socialProviderHashMap.put("facebook", facebookProvider);
    }

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

    provider.login(call, options);
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

    provider.logout(call);
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

    provider.getAuthorizationCode(call);
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

    provider.isLoggedIn(call);
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

  public void handleAppleLoginIntent(Intent intent) {
    try {
      SocialProvider provider = socialProviderHashMap.get("apple");
      if (!(provider instanceof AppleProvider)) {
        Log.e(
          SocialLoginPlugin.LOG_TAG,
          "Provider is not an apple provider (could be null)"
        );
        return;
      }
      ((AppleProvider) provider).handleIntent(intent);
    } catch (Throwable t) {
      Log.e(SocialLoginPlugin.LOG_TAG, "Cannot handle apple login intent");
    }
  }
}
