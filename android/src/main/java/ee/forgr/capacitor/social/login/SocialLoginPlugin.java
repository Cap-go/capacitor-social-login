package ee.forgr.capacitor.social.login;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

  private FacebookProvider facebookProvider = new FacebookProvider();
  private GoogleProvider googleProvider = new GoogleProvider();
  private TwitterProvider twitterProvider = new TwitterProvider();
  private AppleProvider appleProvider = new AppleProvider();

  @PluginMethod
  public void initialize(PluginCall call) {
    String facebookAppId = call.getString("facebookAppId");
    String googleClientId = call.getString("googleClientId");
    String appleClientId = call.getString("appleClientId");
    String twitterClientId = call.getString("twitterClientId");
    String twitterClientSecret = call.getString("twitterClientSecret");

    // Initialize providers with the provided options
    facebookProvider.initialize(facebookAppId);
    googleProvider.initialize(googleClientId);
    appleProvider.initialize(appleClientId);
    twitterProvider.initialize(twitterClientId, twitterClientSecret);

    call.resolve();
  }

  @PluginMethod
  public void login(PluginCall call) {
    String provider = call.getString("provider");
    JSObject payload = call.getObject("payload");

    if (provider.equals("facebook")) {
      facebookProvider.login(call, payload);
    } else if (provider.equals("google")) {
      googleProvider.login(call, payload);
    } else if (provider.equals("twitter")) {
      twitterProvider.login(call, payload);
    } else if (provider.equals("apple")) {
      appleProvider.login(call, payload);
    } else {
      call.reject("Unsupported social login provider: " + provider);
    }
  }

  @PluginMethod
  public void logout(PluginCall call) {
    String provider = call.getString("provider");

    if (provider.equals("facebook")) {
      facebookProvider.logout(call);
    } else if (provider.equals("google")) {
      googleProvider.logout(call);
    } else if (provider.equals("twitter")) {
      twitterProvider.logout(call);
    } else if (provider.equals("apple")) {
      appleProvider.logout(call);
    } else {
      call.reject("Unsupported social login provider: " + provider);
    }
  }

  @PluginMethod
  public void getCurrentUser(PluginCall call) {
    String provider = call.getString("provider");

    if (provider.equals("facebook")) {
      facebookProvider.getCurrentUser(call);
    } else if (provider.equals("google")) {
      googleProvider.getCurrentUser(call);
    } else if (provider.equals("twitter")) {
      twitterProvider.getCurrentUser(call);
    } else if (provider.equals("apple")) {
      appleProvider.getCurrentUser(call);
    } else {
      call.reject("Unsupported social login provider: " + provider);
    }
  }

  @PluginMethod
  public void refresh(PluginCall call) {
    String provider = call.getString("provider");

    if (provider.equals("facebook")) {
      facebookProvider.refresh(call);
    } else if (provider.equals("google")) {
      googleProvider.refresh(call);
    } else if (provider.equals("twitter")) {
      twitterProvider.refresh(call);
    } else if (provider.equals("apple")) {
      appleProvider.refresh(call);
    } else {
      call.reject("Unsupported social login provider: " + provider);
    }
  }
}
