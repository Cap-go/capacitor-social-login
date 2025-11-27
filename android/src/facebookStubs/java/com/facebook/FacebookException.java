package com.facebook;

/**
 * Stub class for Facebook FacebookException.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class FacebookException extends RuntimeException {

    public FacebookException() {
        super();
    }

    public FacebookException(String message) {
        super(message);
    }

    public FacebookException(String message, Throwable cause) {
        super(message, cause);
    }

    public FacebookException(Throwable cause) {
        super(cause);
    }
}
