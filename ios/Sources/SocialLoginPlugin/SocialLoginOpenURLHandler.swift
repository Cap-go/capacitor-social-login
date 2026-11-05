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

    #if canImport(FBSDKCoreKit)
    private static var pendingFacebookOpenURLs: [(url: URL, options: [UIApplication.OpenURLOptionsKey: Any])] = []

    /// Facebook custom schemes are `fb{app-id}`; also accept https hosts Facebook uses for redirects.
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

    private static func deliverFacebookOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) {
        _ = ApplicationDelegate.shared.application(
            UIApplication.shared,
            open: url,
            sourceApplication: options[.sourceApplication] as? String,
            annotation: options[.annotation]
        )
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

    /// Call after Facebook `initialize()` from the plugin. Runs on the main queue.
    static func markFacebookIntegrationConfiguredAndFlushPending() {
        let apply = {
            isFacebookIntegrationConfigured = true
            flushPendingFacebookOpenURLIfNeeded()
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

    static func handleOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) {
        assert(Thread.isMainThread)
        #if canImport(FBSDKCoreKit)
        if isFacebookIntegrationConfigured {
            deliverFacebookOpenURL(url, options: options)
        } else if isLikelyFacebookOpenURL(url) {
            pendingFacebookOpenURLs.append((url, options))
        }
        #endif

        #if canImport(GoogleSignIn)
        _ = GIDSignIn.sharedInstance.handle(url)
        #endif
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
