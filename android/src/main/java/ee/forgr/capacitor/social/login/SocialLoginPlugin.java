package ee.forgr.capacitor.social.login;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import ee.forgr.capacitor.social.login.helpers.DependencyAvailabilityChecker;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "SocialLogin")
public class SocialLoginPlugin extends Plugin {

    private final String pluginVersion = "8.3.3";

    public static String LOG_TAG = "CapgoSocialLogin";

    public HashMap<String, SocialProvider> socialProviderHashMap = new HashMap<>();

    private PluginCall openSecureWindowSavedCall;
    private String openSecureWindowRedirectUri;

    @PluginMethod
    public void initialize(PluginCall call) {
        // Set plugin instance for config access
        DependencyAvailabilityChecker.setPluginInstance(this);

        JSObject apple = call.getObject("apple");
        if (apple != null) {
            // Check if Apple dependencies are available
            if (!DependencyAvailabilityChecker.isProviderAvailable("apple")) {
                call.reject(
                    "Apple Sign-In provider is disabled. " +
                        "Dependencies are not available. Ensure JWT decode and CustomTabs dependencies are included in your app's build.gradle"
                );
                return;
            }

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

            boolean useProperTokenExchange = apple.has("useProperTokenExchange") ? apple.getBool("useProperTokenExchange") : false;
            boolean useBroadcastChannel = apple.has("useBroadcastChannel") ? apple.getBool("useBroadcastChannel") : false;

            AppleProvider appleProvider = new AppleProvider(
                androidAppleRedirect,
                androidAppleClientId,
                this.getActivity(),
                this.getContext(),
                useProperTokenExchange,
                useBroadcastChannel
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
            // Check if Facebook dependencies are available
            if (!DependencyAvailabilityChecker.isProviderAvailable("facebook")) {
                call.reject(
                    "Facebook provider is disabled. " +
                        "Dependencies are not available. Ensure Facebook Login dependencies are included in your app's build.gradle"
                );
                return;
            }

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

        JSObject twitter = call.getObject("twitter");
        if (twitter != null) {
            // Check if Twitter dependencies are available
            if (!DependencyAvailabilityChecker.isProviderAvailable("twitter")) {
                call.reject(
                    "Twitter provider is disabled. " +
                        "Dependencies are not available. Ensure OkHttp dependencies are included in your app's build.gradle"
                );
                return;
            }

            String twitterClientId = twitter.getString("clientId");
            String twitterRedirect = twitter.getString("redirectUrl");
            if (twitterClientId == null || twitterClientId.isEmpty()) {
                call.reject("twitter.clientId is null or empty");
                return;
            }
            if (twitterRedirect == null || twitterRedirect.isEmpty()) {
                call.reject("twitter.redirectUrl is null or empty");
                return;
            }
            TwitterProvider twitterProvider = new TwitterProvider(this.getActivity(), this.getContext());
            try {
                twitterProvider.initialize(twitter);
                this.socialProviderHashMap.put("twitter", twitterProvider);
            } catch (JSONException e) {
                call.reject("Failed to initialize Twitter provider: " + e.getMessage());
                return;
            }
        }

        JSObject oauth2 = call.getObject("oauth2");
        if (oauth2 != null && oauth2.length() > 0) {
            // oauth2 is now a map of providerId -> config: { "github": {...}, "azure": {...} }
            OAuth2Provider oauth2Provider = new OAuth2Provider(this.getActivity(), this.getContext());
            try {
                java.util.List<String> errors = oauth2Provider.initializeProviders(oauth2);
                if (!errors.isEmpty()) {
                    call.reject(String.join(", ", errors));
                    return;
                }
                this.socialProviderHashMap.put("oauth2", oauth2Provider);
            } catch (JSONException e) {
                call.reject("Failed to initialize OAuth2 provider: " + e.getMessage());
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
            // Check if provider is disabled (dependencies not available)
            if (!DependencyAvailabilityChecker.isProviderAvailable(providerStr)) {
                call.reject(
                    String.format(
                        "Provider '%s' is disabled. Dependencies are not available. " +
                            "Ensure required dependencies are included in your app's build.gradle",
                        providerStr
                    )
                );
            } else {
                call.reject(String.format("Cannot find provider '%s'. Provider was not initialized.", providerStr));
            }
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
            // Check if provider is disabled (dependencies not available)
            if (!DependencyAvailabilityChecker.isProviderAvailable(providerStr)) {
                call.reject(
                    String.format(
                        "Provider '%s' is disabled. Dependencies are not available. " +
                            "Ensure required dependencies are included in your app's build.gradle",
                        providerStr
                    )
                );
            } else {
                call.reject(String.format("Cannot find provider '%s'. Provider was not initialized.", providerStr));
            }
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
            // Check if provider is disabled (dependencies not available)
            if (!DependencyAvailabilityChecker.isProviderAvailable(providerStr)) {
                call.reject(
                    String.format(
                        "Provider '%s' is disabled. Dependencies are not available. " +
                            "Ensure required dependencies are included in your app's build.gradle",
                        providerStr
                    )
                );
            } else {
                call.reject(String.format("Cannot find provider '%s'. Provider was not initialized.", providerStr));
            }
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
            // Check if provider is disabled (dependencies not available)
            if (!DependencyAvailabilityChecker.isProviderAvailable(providerStr)) {
                call.reject(
                    String.format(
                        "Provider '%s' is disabled. Dependencies are not available. " +
                            "Ensure required dependencies are included in your app's build.gradle",
                        providerStr
                    )
                );
            } else {
                call.reject(String.format("Cannot find provider '%s'. Provider was not initialized.", providerStr));
            }
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
            // Check if provider is disabled (dependencies not available)
            if (!DependencyAvailabilityChecker.isProviderAvailable(providerStr)) {
                call.reject(
                    String.format(
                        "Provider '%s' is disabled. Dependencies are not available. " +
                            "Ensure required dependencies are included in your app's build.gradle",
                        providerStr
                    )
                );
            } else {
                call.reject(String.format("Cannot find provider '%s'. Provider was not initialized.", providerStr));
            }
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

        SocialProvider twitterProvider = socialProviderHashMap.get("twitter");
        if (twitterProvider instanceof TwitterProvider) {
            boolean handled = ((TwitterProvider) twitterProvider).handleActivityResult(requestCode, resultCode, data);
            if (handled) {
                Log.d(LOG_TAG, "Twitter activity result handled");
                return;
            }
        }

        SocialProvider oauth2Provider = socialProviderHashMap.get("oauth2");
        if (oauth2Provider instanceof OAuth2Provider) {
            boolean handled = ((OAuth2Provider) oauth2Provider).handleActivityResult(requestCode, resultCode, data);
            if (handled) {
                Log.d(LOG_TAG, "OAuth2 activity result handled");
                return;
            }
        }

        // Handle other providers' activity results if needed
        Log.d(LOG_TAG, "Activity result not handled by any provider");
    }

    @PluginMethod
    public void getPluginVersion(final PluginCall call) {
        try {
            final JSObject ret = new JSObject();
            ret.put("version", this.pluginVersion);
            call.resolve(ret);
        } catch (final Exception e) {
            call.reject("Could not get plugin version", e);
        }
    }

    @PluginMethod
    public void refreshToken(final PluginCall call) {
        String provider = call.getString("provider", "");
        if (!"oauth2".equals(provider)) {
            call.reject("refreshToken is only implemented for oauth2");
            return;
        }
        String providerId = call.getString("providerId");
        if (providerId == null || providerId.isEmpty()) {
            call.reject("providerId is required for oauth2 refreshToken");
            return;
        }
        SocialProvider p = socialProviderHashMap.get("oauth2");
        if (!(p instanceof OAuth2Provider)) {
            call.reject("OAuth2 provider is not initialized");
            return;
        }
        String refreshToken = call.getString("refreshToken");
        JSObject additionalParams = call.getObject("additionalParameters");
        ((OAuth2Provider) p).refreshTokenRaw(call, providerId, refreshToken, additionalParams);
    }

    @PluginMethod
    public void handleRedirectCallback(final PluginCall call) {
        call.reject("handleRedirectCallback is only available on web");
    }

    @PluginMethod
    public void decodeIdToken(final PluginCall call) {
        String idToken = call.getString("idToken");
        if (idToken == null || idToken.isEmpty()) {
            idToken = call.getString("token");
        }
        if (idToken == null || idToken.isEmpty()) {
            call.reject("idToken (or token) is required");
            return;
        }
        try {
            String[] parts = idToken.split("\\\\.");
            if (parts.length < 2) {
                call.reject("Invalid JWT");
                return;
            }
            byte[] decoded = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
            String json = new String(decoded, StandardCharsets.UTF_8);
            JSONObject claims = new JSONObject(json);
            JSObject ret = new JSObject();
            ret.put("claims", claims);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to decode idToken", e);
        }
    }

    @PluginMethod
    public void getAccessTokenExpirationDate(final PluginCall call) {
        Long expiresAt = call.getLong("accessTokenExpirationDate");
        if (expiresAt == null) {
            call.reject("accessTokenExpirationDate is required");
            return;
        }
        String iso = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX").format(new java.util.Date(expiresAt));
        call.resolve(new JSObject().put("date", iso));
    }

    @PluginMethod
    public void isAccessTokenAvailable(final PluginCall call) {
        String token = call.getString("accessToken");
        boolean ok = token != null && !token.isEmpty();
        call.resolve(new JSObject().put("isAvailable", ok));
    }

    @PluginMethod
    public void isAccessTokenExpired(final PluginCall call) {
        Long expiresAt = call.getLong("accessTokenExpirationDate");
        if (expiresAt == null) {
            call.reject("accessTokenExpirationDate is required");
            return;
        }
        boolean expired = expiresAt <= System.currentTimeMillis();
        call.resolve(new JSObject().put("isExpired", expired));
    }

    @PluginMethod
    public void isRefreshTokenAvailable(final PluginCall call) {
        String token = call.getString("refreshToken");
        boolean ok = token != null && !token.isEmpty();
        call.resolve(new JSObject().put("isAvailable", ok));
    }

    @PluginMethod
    public void openSecureWindow(PluginCall call) {
        String authEndpoint = call.getString("authEndpoint");

        if (authEndpoint == null || authEndpoint.isEmpty()) {
            call.reject("Auth endpoint is required");
            return;
        }

        String redirectUri = call.getString("redirectUri");
        if (redirectUri == null || redirectUri.isEmpty()) {
            call.reject("Redirect URI is required");
            return;
        }

        openSecureWindowSavedCall = call;
        openSecureWindowRedirectUri = redirectUri;

        // Launch OAuth in custom tab
        launchCustomTab(authEndpoint);
    }

    private void launchCustomTab(String url) {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();

        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.intent.setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
        customTabsIntent.intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        customTabsIntent.intent.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING", true);
        customTabsIntent.intent.putExtra("android.support.customtabs.extra.EXTRA_ENABLE_INSTANT_APPS", false);
        customTabsIntent.intent.putExtra("android.support.customtabs.extra.SEND_TO_EXTERNAL_HANDLER", false);
        customTabsIntent.intent.putExtra("androidx.browser.customtabs.extra.SHARE_STATE", 2);
        customTabsIntent.intent.putExtra("androidx.browser.customtabs.extra.DISABLE_BACKGROUND_INTERACTION", false);
        customTabsIntent.intent.putExtra("org.chromium.chrome.browser.customtabs.EXTRA_DISABLE_DOWNLOAD_BUTTON", true);
        customTabsIntent.intent.putExtra("org.chromium.chrome.browser.customtabs.EXTRA_DISABLE_STAR_BUTTON", true);

        customTabsIntent.launchUrl(getActivity(), Uri.parse(url));
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();

        // If we have a saved call and user returned without callback, reject
        if (openSecureWindowSavedCall != null) {
            openSecureWindowSavedCall.reject("OAuth cancelled or no callback received");
            openSecureWindowSavedCall = null;
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);

        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }

        Uri uri = intent.getData();
        if (uri == null) {
            return;
        }

        if (openSecureWindowRedirectUri == null) {
            return;
        }

        if (uri.getHost() == null || !uri.toString().startsWith(openSecureWindowRedirectUri)) {
            return;
        }

        try {
            // Resolve the original call with the callback url
            if (openSecureWindowSavedCall != null) {
                final JSObject ret = new JSObject();
                ret.put("redirectedUri", uri.toString());
                openSecureWindowSavedCall.resolve(ret);
                openSecureWindowSavedCall = null;
            }
        } catch (Exception e) {
            if (openSecureWindowSavedCall != null) {
                openSecureWindowSavedCall.reject("Failed to process OAuth callback", e);
                openSecureWindowSavedCall = null;
            }
        }
    }
}
