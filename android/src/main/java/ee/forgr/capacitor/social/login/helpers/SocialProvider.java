package ee.forgr.capacitor.social.login.helpers;

import com.getcapacitor.PluginCall;
import java.util.Map;
import org.json.JSONObject;

public interface SocialProvider {
  FutureFunctionResult<JSONObject, String> login(
    PluginHelpers helpers,
    JSONObject config
  );
  FunctionResult<Void, String> logout(PluginHelpers helpers);
  FunctionResult<String, String> getAuthorizationCode();
  FunctionResult<Boolean, String> isLoggedIn();
  FunctionResult<Map<String, Object>, String> getCurrentUser();
  FunctionResult<Void, String> refresh();
}
