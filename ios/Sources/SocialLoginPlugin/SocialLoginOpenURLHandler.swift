import Foundation
import UIKit
import Capacitor

#if canImport(FBSDKCoreKit)
import FBSDKCoreKit
#endif

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

enum SocialLoginOpenURLHandler {
    static func parseOpenURLNotification(_ notification: Notification) -> (url: URL, options: [UIApplication.OpenURLOptionsKey: Any])? {
        guard let data = notification.object as? [String: Any],
              let url = data["url"] as? URL else {
            return nil
        }
        let options = data["options"] as? [UIApplication.OpenURLOptionsKey: Any] ?? [:]
        return (url, options)
    }

    static func handleOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) {
        #if canImport(FBSDKCoreKit)
        _ = ApplicationDelegate.shared.application(
            UIApplication.shared,
            open: url,
            sourceApplication: options[.sourceApplication] as? String,
            annotation: options[.annotation]
        )
        #endif

        #if canImport(GoogleSignIn)
        _ = GIDSignIn.sharedInstance.handle(url)
        #endif
    }

    @objc static func handleCapacitorOpenURLNotification(_ notification: Notification) {
        guard let parsed = parseOpenURLNotification(notification) else {
            return
        }
        handleOpenURL(parsed.url, options: parsed.options)
    }
}
