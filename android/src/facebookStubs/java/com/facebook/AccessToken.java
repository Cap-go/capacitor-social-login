package com.facebook;

import androidx.annotation.Nullable;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;

/**
 * Stub class for Facebook AccessToken.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class AccessToken {

    @Nullable
    public static AccessToken getCurrentAccessToken() {
        return null;
    }

    public static void refreshCurrentAccessTokenAsync(AccessTokenRefreshCallback callback) {
        if (callback != null) {
            callback.OnTokenRefreshFailed(null);
        }
    }

    public String getToken() {
        return "";
    }

    public String getApplicationId() {
        return "";
    }

    public String getUserId() {
        return "";
    }

    public Date getExpires() {
        return new Date();
    }

    public Date getLastRefresh() {
        return new Date();
    }

    public boolean isExpired() {
        return true;
    }

    public boolean isDataAccessExpired() {
        return true;
    }

    public Collection<String> getPermissions() {
        return Collections.emptyList();
    }

    public Collection<String> getDeclinedPermissions() {
        return Collections.emptyList();
    }

    public interface AccessTokenRefreshCallback {
        void OnTokenRefreshed(@Nullable AccessToken accessToken);
        void OnTokenRefreshFailed(@Nullable FacebookException e);
    }
}
