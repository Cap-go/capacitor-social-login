# Google Sign-In Setup

Full setup guide: https://capgo.app/docs/plugins/social-login/

## Android quick reference (Credential Manager)

This plugin uses **Google Credential Manager** on Android. You need OAuth clients in the **same** Google Cloud project:

1. **Web application** client → pass its ID as `webClientId` in `SocialLogin.initialize()`.
2. **Android** client(s) → register package name + SHA-1 for each signing key (debug, release, Play App Signing). Never use the Android client ID as `webClientId`.

### Logcat diagnostics

After `SocialLogin.initialize()` and on failed login, filter Logcat for `GoogleProvider` or `CapgoSocialLogin`. The plugin logs:

- `package`: must match your Android OAuth client
- `signingSha1`: must be registered on that Android OAuth client
- masked `webClientId`: must be the **Web** client ID

### `[28444] Developer console is not set up correctly`

See the **Android troubleshooting** section in [README.md](../README.md#android-troubleshooting-credential-manager-sha-1-and-firebase) for the full checklist. In short: wrong `webClientId` type, missing SHA-1 for the installed APK, package name mismatch, missing Play App Signing SHA-1, or OAuth consent screen test users.

### `[16] Account reauth failed`

See [README.md](../README.md#google-sign-in-16-account-reauth-failed-android). The plugin clears stale Credential Manager credentials and retries once automatically. Persistent failures for specific users are usually OAuth consent (External vs Internal, test users), Family Link accounts, or the user disabling Sign in with Google for your app.

Config changes in Google Cloud can take several hours to take effect.

### Custom scopes and MainActivity (Android)

Default Google login uses Credential Manager with OIDC scopes (`openid`, email, profile). By default the plugin still calls `AuthorizationClient` after sign-in so online login can return an OAuth `accessToken` when Google provides one.

Set `skipAuthOnlyAuthorizationAfterSignIn: true` in `SocialLogin.initialize({ google: ... })` to skip that authorize step for authentication-only online scopes. That avoids hangs on stock `BridgeActivity`, or login rejecting when Google returns an authorization resolution the stock activity cannot route, but login may return `accessToken: null` while still providing `idToken` and profile.

If you pass an explicit `scopes` array, including the default scopes, or use **offline** mode, you must:

1. Implement `ModifiedMainActivityForSocialLoginPlugin` on your `MainActivity`.
2. Forward `onActivityResult` to the social login plugin so Google authorization UI results are not dropped.

Without that wiring, login can hang or fail when Google shows an authorization resolution. See the example app `MainActivity` in this repository.

## iOS setup

See also the [Google iOS section in README.md](../README.md#ios-configuration-2).

### Automatic OAuth redirect handling

When the Google Sign-In iOS SDK is linked in your app, this plugin listens for Capacitor's `Notification.Name.capacitorOpenURL` and calls `GIDSignIn.sharedInstance.handle(url)` for you. That notification is posted from both `ApplicationDelegateProxy` (legacy AppDelegate URL opens) and `SceneDelegateProxy` (Capacitor 8.5+ UIScene URL opens), so Google login redirects work without custom URL code in many apps.

You still need `SocialLogin.initialize({ google: { iOSClientId: ... } })` and the reversed iOS client ID in `Info.plist` (`CFBundleURLTypes`). Add explicit handlers below only if you disable the plugin, use a custom URL flow, or want the handlers visible in your project.

### Using Google login on iOS

Add your iOS OAuth client reversed ID to `ios/App/App/Info.plist`. If `CFBundleURLTypes` already exists (for example Facebook or another provider), append the Google entry to that array instead of adding a second `CFBundleURLTypes` key:

```xml
<key>CFBundleURLTypes</key>
<array>
    <!-- existing URL type dicts stay here -->
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.YOUR_REVERSED_IOS_CLIENT_ID_SUFFIX</string>
        </array>
    </dict>
</array>
```

#### URL opens with Capacitor 8.5+ (UIScene)

From [Capacitor 8.5](https://capacitorjs.com/docs/updating/8-5), apps with `UIApplicationSceneManifest` in `Info.plist` receive custom URL scheme opens in `SceneDelegate.swift`, not in `AppDelegate.application(_:open:options:)`. Keep Capacitor's `SceneDelegateProxy` forwarding call.

In `ios/App/App/SceneDelegate.swift`:

```swift
import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
```

Use this when your app has migrated with `npx cap migrate` or follows the Capacitor 8.5 SceneDelegate template.

#### URL opens before Capacitor 8.5 (AppDelegate only)

If your app does **not** use the scene manifest, forward every URL to Capacitor in `ios/App/App/AppDelegate.swift`:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}
```

The plugin listens for Capacitor's `capacitorOpenURL` notification and calls `GIDSignIn.sharedInstance.handle(url)` once for you. Forwarding every URL keeps `App.getLaunchUrl()` and other `appUrlOpen` listeners working, so do not return early when Google handles a URL.

If your app does not load this plugin and uses the Google SDK directly, call `GIDSignIn.sharedInstance.handle(url)` yourself before forwarding the URL to `ApplicationDelegateProxy`.

See [Combine facebook and google URL handler](../README.md#combine-facebook-and-google-url-handler) in the README if you use multiple providers.

**Capgo website:** mirror this section on [capgo.app Google iOS docs](https://capgo.app/docs/plugins/social-login/google/ios/) from the `Cap-go/capgo` content tree (typically under `content/docs/plugins/social-login/google/ios.md` or the equivalent MDX path used by the docs site).

