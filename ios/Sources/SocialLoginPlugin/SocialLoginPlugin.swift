import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(SocialLoginPlugin)
public class SocialLoginPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SocialLoginPlugin"
    public let jsName = "SocialLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAuthenticated", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAccessToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUserInfo", returnType: CAPPluginReturnPromise)
    ]
    private let apple = AppleProvider()
    private let facebook = FacebookProvider()
    private let google = GoogleProvider()
    private let twitter = TwitterProvider()

    @objc func initialize(_ call: CAPPluginCall) {
        guard let options = call.options else {
            call.reject("Missing options")
            return
        }
        
        var initialized = false
        
        if let facebookAppId = options["facebookAppId"] as? String {
            facebook.initialize(appId: facebookAppId)
            initialized = true
        }
        
        if let googleClientId = options["googleClientId"] as? String {
            google.initialize(clientId: googleClientId)
            initialized = true
        }
        
        if let appleClientId = options["appleClientId"] as? String {
            apple.initialize(clientId: appleClientId)
            initialized = true
        }
        
        if let twitterClientId = options["twitterClientId"] as? String,
           let twitterClientSecret = options["twitterClientSecret"] as? String {
            twitter.initialize(clientId: twitterClientId, clientSecret: twitterClientSecret)
            initialized = true
        }
        
        if initialized {
            call.resolve()
        } else {
            call.reject("No provider was initialized")
        }
    }

    @objc func login(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider"),
              let payload = call.getObject("payload") else {
            call.reject("Missing provider or payload")
            return
        }
        
        switch provider {
        case "facebook":
            facebook.login(payload: payload) { result in
                self.handleLoginResult(result, call: call)
            }
        case "google":
            google.login(payload: payload) { result in
                self.handleLoginResult(result, call: call)
            }
        case "apple":
            apple.login(payload: payload) { result in
                self.handleLoginResult(result, call: call)
            }
        case "twitter":
            twitter.login(payload: payload) { result in
                self.handleLoginResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func logout(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider")
            return
        }
        
        switch provider {
        case "facebook":
            facebook.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "google":
            google.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "apple":
            apple.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "twitter":
            twitter.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func getCurrentUser(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider")
            return
        }
        
        switch provider {
        case "facebook":
            facebook.getCurrentUser { result in
                self.handleCurrentUserResult(result, call: call)
            }
        case "google":
            google.getCurrentUser { result in
                self.handleCurrentUserResult(result, call: call)
            }
        case "apple":
            apple.getCurrentUser { result in
                self.handleCurrentUserResult(result, call: call)
            }
        case "twitter":
            twitter.getCurrentUser { result in
                self.handleCurrentUserResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func refresh(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider")
            return
        }
        
        switch provider {
        case "facebook":
            facebook.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "google":
            google.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "apple":
            apple.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "twitter":
            twitter.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }
}
