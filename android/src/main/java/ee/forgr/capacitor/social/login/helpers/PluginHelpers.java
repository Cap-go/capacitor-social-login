package ee.forgr.capacitor.social.login.helpers;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import androidx.annotation.Nullable;

import java.util.Map;

public interface PluginHelpers {
    void runOnUiThread(Runnable runnable);
    public static final int REQUEST_CODE_GOOGLE_LOGIN = 1001;

    FunctionResult<Object, String> notifyListener(String name, Map<String, Object> data);

    void putSharedPreferencePrivate(String key, String value);

    void removeSharedPreferencePrivate(String key);

    FunctionResult<Void, String> startNamedActivityForResult(Intent intent, String name);

    @Nullable
    public String getSharedPreferencePrivate(String key);

    @Nullable
    Activity getActivity();

    @Nullable
    Context getContext();
}
