package ee.forgr.capacitor.social.login.helpers;

import org.json.JSONObject;

import java.util.Map;

public interface SocialProvider {
    FunctionResult<Void, String> login(PluginHelpers helpers, JSONObject config);
    FunctionResult<Void, String> logout();
    FunctionResult<String, String> getAuthorizationCode();
    FunctionResult<Boolean, String> isLoggedIn();
    FunctionResult<Map<String, Object>, String> getCurrentUser();
    FunctionResult<Void, String> refresh();
}
