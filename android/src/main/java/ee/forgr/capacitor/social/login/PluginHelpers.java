package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Context;

import androidx.annotation.Nullable;

public interface PluginHelpers {
    FunctionResult.ThrowableFunctionResult<Void> runOnUiThreadBlocking(Runnable runnable);

    @Nullable
    Activity getActivity();

    @Nullable
    Context getContext();
}
