import UIKit

/// Resolves the window that authentication UI should be presented from.
///
/// Order:
/// 1. The window hosting the Capacitor bridge view controller, so multi-scene iPad apps present
///    in the scene that started the call instead of an arbitrary key window.
/// 2. A key window in a foreground-active scene, then in a foreground-inactive scene
///    (scene transitions, system sheets).
/// 3. The application key window, then any application window, for app-delegate hosts
///    that have no matching connected scene.
enum PresentationWindowResolver {
    static func window(hostViewController: UIViewController?) -> UIWindow? {
        if let hostWindow = hostViewController?.viewIfLoaded?.window {
            return hostWindow
        }

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for state in [UIScene.ActivationState.foregroundActive, .foregroundInactive] {
            let windows = scenes.filter { $0.activationState == state }.flatMap { $0.windows }
            if let keyWindow = windows.first(where: { $0.isKeyWindow }) ?? windows.first {
                return keyWindow
            }
        }

        let appWindows = UIApplication.shared.windows
        return appWindows.first(where: { $0.isKeyWindow }) ?? appWindows.first
    }
}
