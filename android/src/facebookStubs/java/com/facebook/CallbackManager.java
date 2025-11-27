package com.facebook;

import android.content.Intent;

/**
 * Stub class for Facebook CallbackManager.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public interface CallbackManager {

    boolean onActivityResult(int requestCode, int resultCode, Intent data);

    class Factory {
        public static CallbackManager create() {
            return new CallbackManager() {
                @Override
                public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
                    return false;
                }
            };
        }
    }
}
