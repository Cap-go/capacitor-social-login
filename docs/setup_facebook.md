# Facebook Login Setup

Documentation for this plugin moved to: https://capgo.app/docs/plugins/social-login/

## iOS URL handling (Capacitor 8.5+ UIScene)

Facebook login redirects must be handled in `SceneDelegate.scene(_:openURLContexts:)` when your app uses the Capacitor 8.5 scene manifest. See the Facebook **iOS configuration** section in [README.md](../README.md) and the combined examples in [setup_google.md](./setup_google.md) (Google section documents the same `SceneDelegateProxy` pattern).

This plugin also handles Facebook URL callbacks automatically via Capacitor's `capacitorOpenURL` notification when the Facebook SDK is linked.

**Capgo website:** mirror UIScene Facebook URL steps on the capgo.app Facebook iOS docs page (same content tree as [Google iOS on capgo.app](https://capgo.app/docs/plugins/social-login/google/ios/)).
