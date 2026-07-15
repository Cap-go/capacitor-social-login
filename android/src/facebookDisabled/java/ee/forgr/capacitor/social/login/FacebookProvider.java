package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import com.getcapacitor.PluginCall;
import ee.forgr.capacitor.social.login.helpers.SocialProvider;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Compile-time stub used when Facebook is disabled via provider pinning
 * ({@code socialLogin.facebook.include=false}).
 * <p>
 * Lives in the plugin package (not {@code com.facebook.*}) so disabled builds
 * ship zero Facebook Login class signatures for privacy scanners.
 */
public class FacebookProvider implements SocialProvider {

    private static final String DISABLED_MESSAGE =
        "Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your app's build.gradle";

    public FacebookProvider(Activity activity) {
        // Stub - activity unused
    }

    public void initialize(JSONObject config) {
        throw new RuntimeException(DISABLED_MESSAGE);
    }

    @Override
    public void login(PluginCall call, JSONObject config) {
        call.reject(DISABLED_MESSAGE);
    }

    @Override
    public void logout(PluginCall call) {
        call.reject(DISABLED_MESSAGE);
    }

    @Override
    public void getAuthorizationCode(PluginCall call) {
        call.reject(DISABLED_MESSAGE);
    }

    @Override
    public void isLoggedIn(PluginCall call) {
        call.reject(DISABLED_MESSAGE);
    }

    @Override
    public void refresh(PluginCall call) {
        call.reject(DISABLED_MESSAGE);
    }

    public boolean handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        return false;
    }

    public void getProfile(JSONArray fieldsArray, PluginCall call) {
        call.reject(DISABLED_MESSAGE);
    }
}
