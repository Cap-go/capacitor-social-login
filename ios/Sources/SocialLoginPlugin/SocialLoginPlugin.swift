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
        CAPPluginMethod(name: "isLoggedIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthorizationCode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUserInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise)
    ]
    private let apple = AppleProvider()
    private let facebook = FacebookProvider()
    private let google = GoogleProvider()

    @objc func initialize(_ call: CAPPluginCall) {
        guard let options = call.options else {
            call.reject("Missing options")
            return
        }

        var initialized = false

        if let facebookSettings = call.getObject("facebook") {
            if let facebookAppId = facebookSettings["appId"] as? String {
                facebook.initialize()
                initialized = true
            }
        }

        if let googleSettings = call.getObject("google") {
            if let googleClientId = googleSettings["clientId"] as? String {
                google.initialize(clientId: googleClientId)
                initialized = true
            }
        }

        if let appleSettings = call.getObject("apple") {
            if let appleClientId = appleSettings["clientId"] as? String,
               let redirectUrl = appleSettings["redirectUrl"] as? String {
                apple.initialize(clientId: appleClientId, redirectUrl: redirectUrl)
                initialized = true
            }
        }

        if initialized {
            call.resolve()
        } else {
            call.reject("No provider was initialized")
        }
    }

    @objc func getAuthorizationCode(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider or options")
            return
        }

        switch provider {
        case "apple": do {
            if let idToken = apple.idToken {
                if !idToken.isEmpty {
                    call.resolve([ "jwt": idToken ])
                } else {
                    call.reject("IdToken is empty")
                }
            } else {
                call.reject("IdToken is nil")
            }
        }
        case "google": do {
            self.google.getAuthorizationCode { res in
                do {
                    let authorizationCode = try res.get()
                    call.resolve([ "jwt": authorizationCode ])
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func isLoggedIn(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider or options")
            return
        }

        switch provider {
        case "apple": do {
            if let idToken = apple.idToken {
                if !idToken.isEmpty {
                    call.resolve([ "isLoggedIn": true ])
                } else {
                    call.resolve([ "isLoggedIn": false ])
                }
            } else {
                call.resolve([ "isLoggedIn": false ])
            }
        }
        case "google": do {
            self.google.isLoggedIn { res in
                do {
                    let isLogged = try res.get()
                    call.resolve([ "isLoggedIn": isLogged ])
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func login(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider"),
              let payload = call.getObject("options") else {
            call.reject("Missing provider or options")
            return
        }

        switch provider {
        case "facebook":
            facebook.login(payload: payload) { (result: Result<FacebookLoginResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "google":
            google.login(payload: payload) { (result: Result<GoogleLoginResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "apple":
            apple.login(payload: payload) { (result: Result<AppleProviderResponse, Error>) in
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
            facebook.refresh(viewController: self.bridge?.viewController) { result in
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

        default:
            call.reject("Invalid provider")
        }
    }

    private func handleLogoutResult<T>(_ result: Result<T, Error>, call: CAPPluginCall) {
        switch result {
        case .success:
            call.resolve()
        case .failure(let error):
            call.reject(error.localizedDescription)
        }
    }

    private func handleRefreshResult<T>(_ result: Result<T, Error>, call: CAPPluginCall) {
        switch result {
        case .success(let response):
            if let user = response as? SocialLoginUser {
                call.resolve([
                    "accessToken": user.accessToken,
                    "idToken": user.idToken,
                    "refreshToken": user.refreshToken,
                    "expiresIn": user.expiresIn
                ])
            } else {
                call.reject("Invalid refresh response")
            }
        case .failure(let error):
            call.reject(error.localizedDescription)
        }
    }

    private func handleCurrentUserResult<T>(_ result: Result<T?, Error>, call: CAPPluginCall) {
        switch result {
        case .success(let response):
            if let user = response as? SocialLoginUser {
                call.resolve([
                    "accessToken": user.accessToken,
                    "idToken": user.idToken ?? "",
                    "refreshToken": user.refreshToken ?? "",
                    "expiresIn": user.expiresIn ?? 0
                ])
            } else {
                call.reject("User not logged in")
            }
        case .failure(let error):
            call.reject(error.localizedDescription)
        }
    }

    private func handleLoginResult<T>(_ result: Result<T, Error>, call: CAPPluginCall) {
        switch result {
        case .success(let response):
            if let appleResponse = response as? AppleProviderResponse {
                call.resolve([
                    "provider": "apple",
                    "result": [
                        "identityToken": appleResponse.identityToken
                    ]
                ])
            } else if let googleResponse = response as? GoogleLoginResponse {
                call.resolve([
                    "provider": "google",
                    "result": [
                        "accessToken": [
                            "token": googleResponse.authentication.accessToken,
                            "userId": googleResponse.id ?? ""
                        ],
                        "idToken": googleResponse.authentication.idToken ?? "",
                        //      ""
                        "profile": [
                            "email": googleResponse.email ?? "",
                            "familyName": googleResponse.familyName ?? "",
                            "givenName": googleResponse.givenName ?? "",
                            "id": googleResponse.id ?? "",
                            "name": googleResponse.name ?? "",
                            "imageUrl": googleResponse.imageUrl ?? ""
                        ]
                    ]
                ])
            } else if let facebookResponse = response as? FacebookLoginResponse {
                call.resolve([
                    "provider": "facebook",
                    "result": [
                        "accessToken": facebookResponse.accessToken,
                        "profile": facebookResponse.profile
                    ]
                ])
            } else {
                call.reject("Unsupported provider response")
            }
        case .failure(let error):
            call.reject(error.localizedDescription)
        }
    }
}

struct SocialLoginUser {
    let accessToken: String
    let idToken: String?
    let refreshToken: String?
    let expiresIn: Int?
}
