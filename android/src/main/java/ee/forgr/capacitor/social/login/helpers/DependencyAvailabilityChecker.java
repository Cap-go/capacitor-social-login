package ee.forgr.capacitor.social.login.helpers;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;

/**
 * Helper class to check if required dependencies are available at runtime using reflection.
 * Results are cached to avoid repeated checks.
 */
public class DependencyAvailabilityChecker {

    private static final String LOG_TAG = "DependencyAvailabilityChecker";

    // Static reference to plugin for config access
    private static Plugin pluginInstance = null;

    // Cached availability flags
    private static Boolean googleDependenciesAvailable = null;
    private static Boolean facebookDependenciesAvailable = null;
    private static Boolean appleDependenciesAvailable = null;
    private static Boolean twitterDependenciesAvailable = null;

    /**
     * Set the plugin instance for config access
     */
    public static void setPluginInstance(Plugin plugin) {
        pluginInstance = plugin;
    }

    /**
     * Check if a provider is enabled in Capacitor config.
     * Returns true if not set (default enabled).
     */
    private static boolean isProviderEnabledInConfig(String providerName) {
        if (pluginInstance == null) {
            return true; // Default to enabled if plugin not available
        }

        try {
            JSObject config = JSObject.fromJSONObject(pluginInstance.getConfig().getConfigJSON());

            JSObject providers = config.getJSObject("providers");
            if (providers == null) {
                return true;
            }

            // Check if provider is explicitly set to false
            if (providers.has(providerName)) {
                Object value = providers.get(providerName);
                if (value instanceof Boolean) {
                    return (Boolean) value;
                }
                // If it's a string "false", treat as disabled
                if (value instanceof String && "false".equalsIgnoreCase((String) value)) {
                    return false;
                }
            }

            return true; // Default to enabled
        } catch (Exception e) {
            Log.w(LOG_TAG, "Failed to read config for provider " + providerName + ": " + e.getMessage());
            return true; // Default to enabled on error
        }
    }

    /**
     * Check if a provider's dependencies are available.
     * @param providerName Provider name: "google", "facebook", "apple", or "twitter"
     * @return true if dependencies are available, false otherwise
     */
    public static boolean isProviderAvailable(String providerName) {
        if (providerName == null) {
            return false;
        }

        switch (providerName.toLowerCase()) {
            case "google":
                return isGoogleAvailable();
            case "facebook":
                return isFacebookAvailable();
            case "apple":
                return isAppleAvailable();
            case "twitter":
                return isTwitterAvailable();
            default:
                Log.w(LOG_TAG, "Unknown provider: " + providerName);
                return false;
        }
    }

    /**
     * Check if Google Sign-In dependencies are available.
     * Checks multiple classes to be resilient.
     * Result is cached after first check.
     */
    private static boolean isGoogleAvailable() {
        if (googleDependenciesAvailable != null) {
            return googleDependenciesAvailable;
        }

        // Check multiple critical classes to be resilient
        String[] googleClasses = {
            "com.google.android.gms.auth.api.identity.AuthorizationRequest",
            "com.google.android.gms.auth.api.identity.AuthorizationResult",
            "com.google.android.gms.auth.api.identity.Identity",
            "com.google.android.gms.common.api.ApiException",
            "com.google.android.libraries.identity.googleid.GetGoogleIdOption",
            "com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption",
            "com.google.android.libraries.identity.googleid.GoogleIdTokenCredential"
        };

        boolean allAvailable = true;
        for (String className : googleClasses) {
            if (!isClassAvailable(className)) {
                allAvailable = false;
                Log.w(LOG_TAG, "Google dependency class not available: " + className);
            }
        }

        googleDependenciesAvailable = allAvailable;

        if (!allAvailable) {
            Log.w(
                LOG_TAG,
                "Google Sign-In dependencies are not available. " +
                    "Ensure Google Play Services Auth dependencies are included in your app's build.gradle"
            );
        }

        return allAvailable;
    }

    /**
     * Check if Facebook SDK dependencies are available.
     * Checks multiple classes to be resilient.
     * Result is cached after first check.
     */
    private static boolean isFacebookAvailable() {
        if (facebookDependenciesAvailable != null) {
            return facebookDependenciesAvailable;
        }

        // Check multiple critical classes to be resilient
        String[] facebookClasses = {
            "com.facebook.FacebookSdk",
            "com.facebook.login.LoginManager",
            "com.facebook.AccessToken",
            "com.facebook.CallbackManager",
            "com.facebook.GraphRequest",
            "com.facebook.login.LoginResult"
        };

        boolean allAvailable = true;
        for (String className : facebookClasses) {
            if (!isClassAvailable(className)) {
                allAvailable = false;
                Log.w(LOG_TAG, "Facebook dependency class not available: " + className);
            }
        }

        facebookDependenciesAvailable = allAvailable;

        if (!allAvailable) {
            Log.w(
                LOG_TAG,
                "Facebook SDK dependencies are not available. " +
                    "Ensure Facebook Login dependencies are included in your app's build.gradle"
            );
        }

        return allAvailable;
    }

    /**
     * Check if Apple Sign-In dependencies are available.
     * Checks config first (for "fake disable"), then checks classes.
     * Result is cached after first check.
     */
    private static boolean isAppleAvailable() {
        if (appleDependenciesAvailable != null) {
            return appleDependenciesAvailable;
        }

        // First check config - if disabled via config, return false immediately
        if (!isProviderEnabledInConfig("apple")) {
            appleDependenciesAvailable = false;
            Log.d(LOG_TAG, "Apple provider is disabled via config");
            return false;
        }

        // Check multiple critical classes to be resilient
        String[] appleClasses = {
            "com.auth0.android.jwt.JWT",
            "androidx.browser.customtabs.CustomTabsSession",
            "androidx.browser.customtabs.CustomTabsServiceConnection",
            "androidx.browser.customtabs.CustomTabsClient",
            "androidx.browser.customtabs.CustomTabsIntent"
        };

        boolean allAvailable = true;
        for (String className : appleClasses) {
            if (!isClassAvailable(className)) {
                allAvailable = false;
                Log.w(LOG_TAG, "Apple dependency class not available: " + className);
            }
        }

        appleDependenciesAvailable = allAvailable;

        if (!allAvailable) {
            Log.w(
                LOG_TAG,
                "Apple Sign-In dependencies are not available. " +
                    "Ensure JWT decode and CustomTabs dependencies are included in your app's build.gradle"
            );
        }

        return allAvailable;
    }

    /**
     * Check if Twitter OAuth dependencies are available.
     * Checks config first (for "fake disable"), then checks classes.
     * Result is cached after first check.
     */
    private static boolean isTwitterAvailable() {
        if (twitterDependenciesAvailable != null) {
            return twitterDependenciesAvailable;
        }

        // First check config - if disabled via config, return false immediately
        if (!isProviderEnabledInConfig("twitter")) {
            twitterDependenciesAvailable = false;
            Log.d(LOG_TAG, "Twitter provider is disabled via config");
            return false;
        }

        // Check multiple critical classes to be resilient
        // Twitter uses OkHttp and standard Android APIs, but we check anyway for user control
        String[] twitterClasses = { "okhttp3.OkHttpClient", "okhttp3.Request", "okhttp3.Response", "okhttp3.FormBody" };

        boolean allAvailable = true;
        for (String className : twitterClasses) {
            if (!isClassAvailable(className)) {
                allAvailable = false;
                Log.w(LOG_TAG, "Twitter dependency class not available: " + className);
            }
        }

        twitterDependenciesAvailable = allAvailable;

        if (!allAvailable) {
            Log.w(
                LOG_TAG,
                "Twitter OAuth dependencies are not available. " + "Ensure OkHttp dependencies are included in your app's build.gradle"
            );
        }

        return allAvailable;
    }

    /**
     * Check if a specific class is available using reflection.
     */
    private static boolean isClassAvailable(String className) {
        try {
            Class.forName(className);
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        } catch (Exception e) {
            Log.e(LOG_TAG, "Unexpected error checking class availability: " + className, e);
            return false;
        }
    }

    /**
     * Reset cached availability checks (useful for testing).
     */
    public static void resetCache() {
        googleDependenciesAvailable = null;
        facebookDependenciesAvailable = null;
        appleDependenciesAvailable = null;
        twitterDependenciesAvailable = null;
    }
}
