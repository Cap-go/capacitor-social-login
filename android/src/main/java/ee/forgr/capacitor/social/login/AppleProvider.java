package ee.forgr.capacitor.social.login;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.reflect.TypeToken;
import net.openid.appauth.*;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

public class AppleProvider {
  private static final String APPLE_AUTHORIZATION_ENDPOINT = "https://appleid.apple.com/auth/authorize";
  private static final String APPLE_TOKEN_ENDPOINT = "https://appleid.apple.com/auth/token";

  private AuthorizationService authService;
  private String clientId;
  private String redirectUri;

  public void initialize(String clientId) {
    this.clientId = clientId;
    this.authService = new AuthorizationService(getActivity());
  }

  public void login(PluginCall call, JSObject payload) {
    String[] scopes = payload.getArrayString("scopes");
    String redirectUri = payload.getString("redirectURI");
    String nonce = payload.getString("nonce");
    String state = payload.getString("state");

    this.redirectUri = redirectUri;

    AuthorizationRequest.Builder authRequestBuilder = new AuthorizationRequest.Builder(
        new AuthorizationServiceConfiguration(
            Uri.parse(APPLE_AUTHORIZATION_ENDPOINT),
            Uri.parse(APPLE_TOKEN_ENDPOINT)
        ),
        clientId,
        ResponseTypeValues.CODE,
        Uri.parse(redirectUri)
    ).setScopes(scopes);

    if (nonce != null) {
      authRequestBuilder.setNonce(nonce);
    }

    if (state != null) {
      authRequestBuilder.setState(state);
    }

    AuthorizationRequest authRequest = authRequestBuilder.build();
    Intent authIntent = authService.getAuthorizationRequestIntent(authRequest);
    startActivityForResult(call, authIntent, 0);
  }

  @Override
  protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == 0) {
      AuthorizationResponse authResponse = AuthorizationResponse.fromIntent(data);
      AuthorizationException authException = AuthorizationException.fromIntent(data);

      if (authResponse != null) {
        // Exchange authorization code for access token
        TokenRequest tokenRequest = new TokenRequest.Builder(
            new AuthorizationServiceConfiguration(
                Uri.parse(APPLE_AUTHORIZATION_ENDPOINT),
                Uri.parse(APPLE_TOKEN_ENDPOINT)
            ),
            clientId
        ).setGrantType(GrantTypeValues.AUTHORIZATION_CODE)
            .setRedirectUri(Uri.parse(redirectUri))
            .setAuthorizationCode(authResponse.authorizationCode)
            .build();

        authService.performTokenRequest(tokenRequest, new AuthorizationService.TokenResponseCallback() {
          @Override
          public void onTokenRequestCompleted(TokenResponse tokenResponse, AuthorizationException ex) {
            if (tokenResponse != null) {
              // Handle successful token response
              String accessToken = tokenResponse.accessToken;
              String idToken = tokenResponse.idToken;

              // Parse ID token to get user information
              JsonObject idTokenObject = JsonParser.parseString(new String(Base64.decode(idToken.split("\\.")[1], Base64.DEFAULT))).getAsJsonObject();
              String userId = idTokenObject.get("sub").getAsString();
              String email = idTokenObject.has("email") ? idTokenObject.get("email").getAsString() : null;
              String givenName = idTokenObject.has("given_name") ? idTokenObject.get("given_name").getAsString() : null;
              String familyName = idTokenObject.has("family_name") ? idTokenObject.get("family_name").getAsString() : null;

              // Resolve the plugin call with the token and user information
              JSObject response = new JSObject();
              response.put("user", userId);
              response.put("email", email);
              response.put("givenName", givenName);
              response.put("familyName", familyName);
              response.put("identityToken", idToken);
              response.put("authorizationCode", authResponse.authorizationCode);
              savedCall.resolve(response);
            } else {
              // Handle token request failure
              savedCall.reject("Error exchanging authorization code for access token: " + ex.getMessage());
            }
          }
        });
      } else if (authException != null) {
        // Handle authorization failure
        savedCall.reject("Error during authorization: " + authException.getMessage());
      } else {
        // Handle unknown error
        savedCall.reject("Unknown error occurred.");
      }
    }
  }

  public void logout(PluginCall call) {
    // Perform logout logic for Apple Sign-In
    // Clear any stored user data or tokens
    // ...

    call.resolve();
  }

  public void getCurrentUser(PluginCall call) {
    // Retrieve the currently logged-in user information
    // ...

    if (currentUser != null) {
      JSObject response = new JSObject();
      response.put("user", currentUser.userId);
      response.put("email", currentUser.email);
      response.put("givenName", currentUser.givenName);
      response.put("familyName", currentUser.familyName);
      response.put("identityToken", currentUser.identityToken);
      call.resolve(response);
    } else {
      call.reject("No user currently logged in.");
    }
  }

  public void refresh(PluginCall call) {
    // Perform token refresh logic for Apple Sign-In
    // ...

    if (refreshedToken != null) {
      JSObject response = new JSObject();
      response.put("accessToken", refreshedToken);
      call.resolve(response);
    } else {
      call.reject("Failed to refresh token.");
    }
  }
}
