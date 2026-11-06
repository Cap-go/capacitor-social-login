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
    /// True after `SocialLogin.initialize()` includes Facebook settings.
    static var isFacebookIntegrationConfigured = false

    /// Facebook custom schemes are `fb{app-id}`; also accept https hosts Facebook uses for redirects.
    /// Kept outside FBSDK `canImport` so unit tests compile when Facebook deps are disabled.
    static func isLikelyFacebookOpenURL(_ url: URL) -> Bool {
        if let scheme = url.scheme?.lowercased(), scheme.hasPrefix("fb") {
            return true
        }
        let host = (url.host ?? "").lowercased()
        return host == "facebook.com"
            || host.hasSuffix(".facebook.com")
            || host == "fb.com"
            || host.hasSuffix(".fb.com")
            || host == "fb.me"
            || host.hasSuffix(".fb.me")
    }

    /// URLs safe to pass to Facebook SDK `ApplicationDelegate` (OAuth callbacks, Facebook hosts, or App Links).
    static func shouldDeliverURLToFacebookSDK(_ url: URL) -> Bool {
        if isLikelyFacebookOpenURL(url) {
            return true
        }
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return false
        }
        if components.queryItems?.contains(where: { $0.name.caseInsensitiveCompare("al_applink_data") == .orderedSame }) == true {
            return true
        }
        if let fragment = components.fragment,
           fragment.range(of: "al_applink_data", options: .caseInsensitive) != nil {
            return true
        }
        return false
    }

    #if canImport(FBSDKCoreKit)
    private static var pendingFacebookOpenURLs: [(url: URL, options: [UIApplication.OpenURLOptionsKey: Any])] = []
    private static var pendingFacebookUniversalLinkURLs: [URL] = []

    private static func deliverFacebookOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) {
        _ = ApplicationDelegate.shared.application(
            UIApplication.shared,
            open: url,
            sourceApplication: options[.sourceApplication] as? String,
            annotation: options[.annotation]
        )
    }

    /// Facebook SDK `application(_:continue:)` expects an `NSUserActivity` with type browsing web.
    private static func deliverFacebookUniversalLinkURL(_ url: URL) {
        let activity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
        activity.webpageURL = url
        _ = ApplicationDelegate.shared.application(UIApplication.shared, continue: activity)
    }

    /// Delivers Facebook OAuth URLs that arrived before `initialize()` completed.
    static func flushPendingFacebookOpenURLIfNeeded() {
        assert(Thread.isMainThread)
        guard isFacebookIntegrationConfigured, !pendingFacebookOpenURLs.isEmpty else {
            return
        }
        let pending = pendingFacebookOpenURLs
        pendingFacebookOpenURLs.removeAll()
        for item in pending {
            deliverFacebookOpenURL(item.url, options: item.options)
        }
    }

    private static func flushPendingFacebookUniversalLinkURLsIfNeeded() {
        assert(Thread.isMainThread)
        guard isFacebookIntegrationConfigured, !pendingFacebookUniversalLinkURLs.isEmpty else {
            return
        }
        let pending = pendingFacebookUniversalLinkURLs
        pendingFacebookUniversalLinkURLs.removeAll()
        for url in pending {
            deliverFacebookUniversalLinkURL(url)
        }
    }

    /// Call after Facebook `initialize()` from the plugin. Runs on the main queue.
    static func markFacebookIntegrationConfiguredAndFlushPending() {
        let apply = {
            isFacebookIntegrationConfigured = true
            flushPendingFacebookOpenURLIfNeeded()
            flushPendingFacebookUniversalLinkURLsIfNeeded()
        }
        if Thread.isMainThread {
            apply()
        } else {
            DispatchQueue.main.sync(execute: apply)
        }
    }
    #endif

    static func parseOpenURLNotification(_ notification: Notification) -> (url: URL, options: [UIApplication.OpenURLOptionsKey: Any])? {
        guard let data = notification.object as? [String: Any],
              let url = data["url"] as? URL else {
            return nil
        }
        let options = data["options"] as? [UIApplication.OpenURLOptionsKey: Any] ?? [:]
        return (url, options)
    }

    /// Capacitor posts universal links with `["url": webpageURL]` (see `SceneDelegateProxy`).
    static func parseUniversalLinkNotification(_ notification: Notification) -> URL? {
        guard let data = notification.object as? [String: Any],
              let url = data["url"] as? URL else {
            return nil
        }
        return url
    }

    static func handleOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) {
        assert(Thread.isMainThread)
        #if canImport(FBSDKCoreKit)
        if shouldDeliverURLToFacebookSDK(url) {
            if isFacebookIntegrationConfigured {
                deliverFacebookOpenURL(url, options: options)
            } else {
                pendingFacebookOpenURLs.append((url, options))
            }
        }
        #endif

        #if canImport(GoogleSignIn)
        _ = GIDSignIn.sharedInstance.handle(url)
        #endif
    }

    /// Universal links (`capacitorOpenUniversalLink`): Facebook App Links only. Google stays on `capacitorOpenURL`.
    static func handleCapacitorOpenUniversalLinkNotification(_ notification: Notification) {
        let work = {
            guard let url = parseUniversalLinkNotification(notification) else {
                return
            }
            #if canImport(FBSDKCoreKit)
            guard shouldDeliverURLToFacebookSDK(url) else {
                return
            }
            if isFacebookIntegrationConfigured {
                deliverFacebookUniversalLinkURL(url)
            } else {
                pendingFacebookUniversalLinkURLs.append(url)
            }
            #endif
        }
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    static func handleCapacitorOpenURLNotification(_ notification: Notification) {
        let work = {
            guard let parsed = parseOpenURLNotification(notification) else {
                return
            }
            handleOpenURL(parsed.url, options: parsed.options)
        }
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }
}
