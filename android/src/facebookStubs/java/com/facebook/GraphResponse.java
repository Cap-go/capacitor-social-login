package com.facebook;

import androidx.annotation.Nullable;

/**
 * Stub class for Facebook GraphResponse.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class GraphResponse {

    @Nullable
    public FacebookRequestError getError() {
        return new FacebookRequestError();
    }

    public static class FacebookRequestError {
        public String getErrorMessage() {
            return "Facebook SDK is not available (stub)";
        }

        public Exception getException() {
            return new FacebookException("Facebook SDK is not available (stub)");
        }
    }
}
