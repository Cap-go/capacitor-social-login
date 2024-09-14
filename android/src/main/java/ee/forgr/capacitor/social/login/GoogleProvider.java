//package ee.forgr.capacitor.social.login;
//
//import android.content.Intent;
//import androidx.activity.result.ActivityResult;
//import com.getcapacitor.JSObject;
//import com.getcapacitor.PluginCall;
//import com.google.android.gms.auth.api.identity.BeginSignInRequest;
//import com.google.android.gms.auth.api.identity.Identity;
//import com.google.android.gms.auth.api.identity.SignInClient;
//import com.google.android.gms.auth.api.identity.SignInCredential;
//import com.google.android.gms.common.api.ApiException;
//import com.google.android.gms.common.api.CommonStatusCodes;
//
//public class GoogleProvider {
//  private SignInClient oneTapClient;
//  private BeginSignInRequest signInRequest;
//
//  public void initialize(String googleClientId) {
//    oneTapClient = Identity.getSignInClient(getActivity());
//    signInRequest = BeginSignInRequest.builder()
//        .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
//            .setSupported(true)
//            .setServerClientId(googleClientId)
//            .setFilterByAuthorizedAccounts(false)
//            .build())
//        .build();
//  }
//
//  public void login(PluginCall call, JSObject payload) {
//    String[] scopes = payload.getArrayString("scopes");
//    boolean grantOfflineAccess = payload.getBoolean("grantOfflineAccess", false);
//
//    // Configure sign-in request with scopes and offline access
//    signInRequest = BeginSignInRequest.builder()
//        .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
//            .setSupported(true)
//            .setServerClientId(googleClientId)
//            .setFilterByAuthorizedAccounts(false)
//            .build())
//        .setScopes(scopes)
//        .setGrantOfflineAccess(grantOfflineAccess)
//        .build();
//
//    // Launch Google One Tap UI
//    oneTapClient.beginSignIn(signInRequest)
//        .addOnSuccessListener(result -> {
//          // Handle successful sign-in
//          String googleIdToken = result.getGoogleIdToken();
//          // Resolve the plugin call with the token and other relevant data
//          JSObject response = new JSObject();
//          response.put("accessToken", googleIdToken);
//          call.resolve(response);
//        })
//        .addOnFailureListener(exception -> {
//          // Handle sign-in failure
//          if (exception instanceof ApiException) {
//            ApiException apiException = (ApiException) exception;
//            int statusCode = apiException.getStatusCode();
//            if (statusCode == CommonStatusCodes.CANCELED) {
//              // One Tap dialog was closed
//              call.reject("One Tap dialog closed.");
//            } else {
//              // Handle other error codes
//              call.reject("Error during sign-in: " + exception.getMessage());
//            }
//          } else {
//            // Handle other exceptions
//            call.reject("Error during sign-in: " + exception.getMessage());
//          }
//        });
//  }
//
//  public void logout(PluginCall call) {
//    // Perform logout logic for Google Sign-In
//    // Clear any stored user data or tokens
//    // ...
//
//    oneTapClient.signOut()
//        .addOnSuccessListener(aVoid -> {
//          call.resolve();
//        })
//        .addOnFailureListener(exception -> {
//          call.reject("Error during sign-out: " + exception.getMessage());
//        });
//  }
//
//  public void getCurrentUser(PluginCall call) {
//    // Retrieve the currently logged-in user information
//    // ...
//
//    if (currentUser != null) {
//      JSObject response = new JSObject();
//      response.put("accessToken", currentUser.getAccessToken());
//      response.put("idToken", currentUser.getIdToken());
//      response.put("serverAuthCode", currentUser.getServerAuthCode());
//      call.resolve(response);
//    } else {
//      call.reject("No user currently logged in.");
//    }
//  }
//
//  public void refresh(PluginCall call) {
//    // Perform token refresh logic for Google Sign-In
//    // ...
//
//    oneTapClient.silentSignIn()
//        .addOnSuccessListener(result -> {
//          // Handle successful silent sign-in
//          String accessToken = result.getAccessToken();
//          String idToken = result.getIdToken();
//          String serverAuthCode = result.getServerAuthCode();
//
//          JSObject response = new JSObject();
//          response.put("accessToken", accessToken);
//          response.put("idToken", idToken);
//          response.put("serverAuthCode", serverAuthCode);
//          call.resolve(response);
//        })
//        .addOnFailureListener(exception -> {
//          // Handle silent sign-in failure
//          call.reject("Error during token refresh: " + exception.getMessage());
//        });
//  }
//
//}
