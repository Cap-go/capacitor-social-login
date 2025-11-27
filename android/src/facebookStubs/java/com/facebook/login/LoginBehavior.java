package com.facebook.login;

/**
 * Stub enum for Facebook LoginBehavior.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public enum LoginBehavior {
    NATIVE_WITH_FALLBACK,
    NATIVE_ONLY,
    KATANA_ONLY,
    WEB_ONLY,
    WEB_VIEW_ONLY,
    DEVICE_AUTH
}
