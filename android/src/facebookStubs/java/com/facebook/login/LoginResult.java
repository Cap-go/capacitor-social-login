package com.facebook.login;

import androidx.annotation.Nullable;
import com.facebook.AccessToken;

/**
 * Stub class for Facebook LoginResult.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class LoginResult {

    @Nullable
    public AccessToken getAccessToken() {
        return null;
    }

    @Nullable
    public AuthenticationToken getAuthenticationToken() {
        return null;
    }

    public static class AuthenticationToken {
        public String getToken() {
            return "";
        }
    }
}
