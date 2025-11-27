package com.facebook;

import android.os.Bundle;
import androidx.annotation.Nullable;
import org.json.JSONObject;

/**
 * Stub class for Facebook GraphRequest.
 * This is used when Facebook login is disabled to allow compilation without the Facebook SDK.
 */
public class GraphRequest {

    private Bundle parameters;
    private Callback callback;

    public static GraphRequest newMeRequest(AccessToken accessToken, GraphJSONObjectCallback callback) {
        GraphRequest request = new GraphRequest();
        request.callback = new Callback() {
            @Override
            public void onCompleted(GraphResponse response) {
                if (callback != null) {
                    callback.onCompleted(null, response);
                }
            }
        };
        return request;
    }

    public void setParameters(Bundle parameters) {
        this.parameters = parameters;
    }

    public void executeAsync() {
        // Stub - no-op, just call callback with empty response
        if (callback != null) {
            GraphResponse response = new GraphResponse();
            callback.onCompleted(response);
        }
    }

    public void executeAndWait() {
        // Stub - no-op, just call callback with empty response
        if (callback != null) {
            GraphResponse response = new GraphResponse();
            callback.onCompleted(response);
        }
    }

    public interface Callback {
        void onCompleted(GraphResponse response);
    }

    public interface GraphJSONObjectCallback {
        void onCompleted(@Nullable JSONObject object, @Nullable GraphResponse response);
    }
}
