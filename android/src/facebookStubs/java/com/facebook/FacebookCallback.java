package com.facebook;

/**
 * Stub interface for Facebook FacebookCallback.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public interface FacebookCallback<RESULT> {
    void onSuccess(RESULT result);
    void onCancel();
    void onError(FacebookException error);
}
