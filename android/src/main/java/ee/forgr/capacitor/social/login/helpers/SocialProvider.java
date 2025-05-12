package ee.forgr.capacitor.social.login.helpers;

import com.getcapacitor.JSArray;
import com.getcapacitor.PluginCall;
import org.json.JSONObject;

public interface SocialProvider {
    void login(PluginCall call, JSONObject config);
    void logout(PluginCall call);
    void getAuthorizationCode(PluginCall call);
    void isLoggedIn(PluginCall call);
    void refresh(PluginCall call);
}
