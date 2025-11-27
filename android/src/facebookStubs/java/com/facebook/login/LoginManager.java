package com.facebook.login;

import androidx.activity.result.ActivityResultRegistryOwner;
import com.facebook.CallbackManager;
import com.facebook.FacebookCallback;
import java.util.Collection;

/**
 * Stub class for Facebook LoginManager.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class LoginManager {

    private static final LoginManager instance = new LoginManager();

    public static LoginManager getInstance() {
        return instance;
    }

    public void registerCallback(CallbackManager callbackManager, FacebookCallback<LoginResult> callback) {
        // Stub - no-op
    }

    public void setLoginBehavior(LoginBehavior loginBehavior) {
        // Stub - no-op
    }

    public void logIn(ActivityResultRegistryOwner activityResultRegistryOwner, CallbackManager callbackManager, Collection<String> permissions) {
        // Stub - no-op
    }

    public void logIn(ActivityResultRegistryOwner activityResultRegistryOwner, CallbackManager callbackManager, Collection<String> permissions, String nonce) {
        // Stub - no-op
    }

    public void logOut() {
        // Stub - no-op
    }
}
