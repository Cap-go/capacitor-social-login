package ee.forgr.capacitor.social.login;

import android.content.Intent;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

    public static String LOG_TAG = "CapgoSocialLogin";

    public HashMap<String, SocialProvider> socialProviderHashMap = new HashMap<>();

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
            GoogleProvider googleProvider = new GoogleProvider(this.getActivity(), this.getContext());
            String googleClientId = google.getString("webClientId");
            if (googleClientId == null || googleClientId.isEmpty()) {
                call.reject("google.clientId is null or empty");
                return;
            }
            String hostedDomain = google.getString("hostedDomain");
            String modestr = google.getString("mode", "online");
            GoogleProvider.GoogleProviderLoginType mode = null;
            switch (modestr) {
                case "online":
                    mode = GoogleProvider.GoogleProviderLoginType.ONLINE;
                    break;
                case "offline":
                    mode = GoogleProvider.GoogleProviderLoginType.OFFLINE;
                    break;
                default:
                    call.reject("google.mode != (online || offline)");
                    return;
            }
            googleProvider.initialize(googleClientId, mode, hostedDomain);
            this.socialProviderHashMap.put("google", googleProvider);
        }

        JSObject facebook = call.getObject("facebook");
        if (facebook != null) {
            String facebookAppId = facebook.getString("appId");
            String facebookClientToken = facebook.getString("clientToken");
            if (facebookAppId == null || facebookAppId.isEmpty()) {
                call.reject("facebook.appId is null or empty");
                return;
            }
            if (facebookClientToken == null || facebookClientToken.isEmpty()) {
                call.reject("facebook.clientToken is null or empty");
                return;
            }
            FacebookProvider facebookProvider = new FacebookProvider(this.getActivity());
            try {
                facebookProvider.initialize(facebook);
                this.socialProviderHashMap.put("facebook", facebookProvider);
            } catch (Exception e) {
                call.reject("Failed to initialize Facebook provider: " + e.getMessage());
                return;
            }
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
        String providerStr = call.getString("provider", "");
        if (providerStr == null || providerStr.isEmpty()) {
            call.reject("provider not provided");
        }

        SocialProvider provider = this.socialProviderHashMap.get(providerStr);
        if (provider == null) {
            call.reject(String.format("Cannot find provider '%s'", providerStr));
            return;
        }

        provider.refresh(call);
    }

    @PluginMethod
    public void providerSpecificCall(PluginCall call) {
        String customCall = call.getString("call");
        if (customCall == null || customCall.isEmpty()) {
            call.reject("Call is required");
            return;
        }

        switch (customCall) {
            case "facebook#getProfile":
                JSObject options = call.getObject("options", new JSObject());
                if (options == null) {
                    call.reject("Options are required");
                    return;
                }

                JSONArray fieldsArray = null;
                try {
                    fieldsArray = options.getJSONArray("fields");
                } catch (JSONException e) {
                    call.reject("Fields array is required");
                    return;
                }

                SocialProvider provider = this.socialProviderHashMap.get("facebook");
                if (provider == null || !(provider instanceof FacebookProvider)) {
                    call.reject("Facebook provider not initialized");
                    return;
                }

                ((FacebookProvider) provider).getProfile(fieldsArray, call);
                break;
            default:
                call.reject("Invalid call. Supported calls: facebook#getProfile");
        }
    }

    public void handleGoogleLoginIntent(int requestCode, Intent intent) {
        try {
            SocialProvider provider = socialProviderHashMap.get("google");
            if (!(provider instanceof GoogleProvider)) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Provider is not a Google provider (could be null)");
                return;
            }
            ((GoogleProvider) provider).handleAuthorizationIntent(requestCode, intent);
        } catch (Throwable t) {
            Log.e(SocialLoginPlugin.LOG_TAG, "Cannot handle Google login intent");
        }
    }

    public void handleAppleLoginIntent(Intent intent) {
        try {
            SocialProvider provider = socialProviderHashMap.get("apple");
            if (!(provider instanceof AppleProvider)) {
                Log.e(SocialLoginPlugin.LOG_TAG, "Provider is not an apple provider (could be null)");
                return;
            }
            ((AppleProvider) provider).handleIntent(intent);
        } catch (Throwable t) {
            Log.e(SocialLoginPlugin.LOG_TAG, "Cannot handle apple login intent");
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        Log.d(LOG_TAG, "SocialLoginPlugin.handleOnActivityResult called");

        // Handle Facebook login result
        SocialProvider facebookProvider = socialProviderHashMap.get("facebook");
        if (facebookProvider instanceof FacebookProvider) {
            boolean handled = ((FacebookProvider) facebookProvider).handleOnActivityResult(requestCode, resultCode, data);
            if (handled) {
                Log.d(LOG_TAG, "Facebook activity result handled");
                return;
            }
        }

        // Handle other providers' activity results if needed
        Log.d(LOG_TAG, "Activity result not handled by any provider");
    }
}
