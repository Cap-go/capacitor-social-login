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
    private static var pendingFacebookOpenURL: (url: URL, options: [UIApplication.OpenURLOptionsKey: Any])?

    private static func deliverFacebookOpenURL(_ url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) {
        _ = ApplicationDelegate.shared.application(
            UIApplication.shared,
            open: url,
            sourceApplication: options[.sourceApplication] as? String,
            annotation: options[.annotation]
        )
    }

    /// Delivers a Facebook OAuth URL that arrived before `initialize()` completed.
    static func flushPendingFacebookOpenURLIfNeeded() {
        assert(Thread.isMainThread)
        guard isFacebookIntegrationConfigured, let pending = pendingFacebookOpenURL else {
            return
        }
        pendingFacebookOpenURL = nil
        deliverFacebookOpenURL(pending.url, options: pending.options)
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
        } else {
            pendingFacebookOpenURL = (url, options)
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
