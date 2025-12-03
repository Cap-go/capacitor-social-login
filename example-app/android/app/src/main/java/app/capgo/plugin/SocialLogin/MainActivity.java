package app.capgo.plugin.SocialLogin;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

// ModifiedMainActivityForSocialLoginPlugin is VERY VERY important !!!!!!
public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    // This function will never be called, leave it empty
    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}

    /**
     * Handle Apple Sign-In deep link callback
     * This is called when the backend redirects back to the app with the identity token
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent); // Important: update the intent so getIntent() returns the latest
        
        String action = intent.getAction();
        Uri data = intent.getData();
        
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            // Check if this is an Apple Sign-In callback (contains id_token)
            String idToken = data.getQueryParameter("id_token");
            if (idToken != null) {
                PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
                if (pluginHandle == null) {
                    Log.i("Apple Login Intent", "SocialLogin plugin handle is null");
                    return;
                }
                Plugin plugin = pluginHandle.getInstance();
                if (!(plugin instanceof SocialLoginPlugin)) {
                    Log.i("Apple Login Intent", "SocialLogin plugin instance is not SocialLoginPlugin");
                    return;
                }
                // Handle the Apple Sign-In intent with the identity token
                ((SocialLoginPlugin) plugin).handleAppleLoginIntent(intent);
                return;
            }
        }
    }
}
