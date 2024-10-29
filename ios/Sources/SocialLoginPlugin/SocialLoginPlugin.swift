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
        var initialized = false

        if let facebookSettings = call.getObject("facebook") {
            if facebookSettings["appId"] is String {
                facebook.initialize()
                initialized = true
            }
        }

        if let googleSettings = call.getObject("google") {
            let iOSClientId = googleSettings["iOSClientId"] as? String
            let iOSServerClientId = googleSettings["iOSServerClientId"] as? String

            if let clientId = iOSClientId {
                if let serverClientId = iOSServerClientId {
                    google.initialize(clientId: clientId, serverClientId: serverClientId)
                } else {
                    google.initialize(clientId: clientId, serverClientId: nil)
                }
                initialized = true
            }
        }

        if let appleSettings = call.getObject("apple") {
            if let redirectUrl = appleSettings["redirectUrl"] as? String {
                apple.initialize(redirectUrl: redirectUrl)
                initialized = true
            } else {
                apple.initialize()
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
                    "idToken": user.idToken as Any,
                    "refreshToken": user.refreshToken as Any,
                    "expiresIn": user.expiresIn as Any
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
                let accessTokenObject = appleResponse.accessToken.map { accessToken in
                    [
                        "token": accessToken.token,
                        // Add other AccessToken fields if needed
                    ]
                }
                
                let profileObject: [String: Any] = [
                    "user": appleResponse.profile.user,
                    "email": appleResponse.profile.email ?? "",
                    "givenName": appleResponse.profile.givenName ?? "",
                    "familyName": appleResponse.profile.familyName ?? ""
                ]
                
                let appleResult: [String: Any] = [
                    "accessToken": accessTokenObject ?? NSNull(),
                    "profile": profileObject,
                    "idToken": appleResponse.idToken ?? "",
                    "authorizationCode": appleResponse.authorizationCode ?? ""
                ]
                
                call.resolve([
                    "provider": "apple",
                    "result": appleResult
                ])
            } else if let googleResponse = response as? GoogleLoginResponse {
                let accessToken: [String: Any] = [
                    "token": googleResponse.authentication.accessToken,
                    "refreshToken": googleResponse.authentication.refreshToken as Any,
                    "userId": googleResponse.id ?? ""
                ]
                let profile: [String: Any] = [
                    "email": googleResponse.email ?? "",
                    "familyName": googleResponse.familyName ?? "",
                    "givenName": googleResponse.givenName ?? "",
                    "id": googleResponse.id ?? "",
                    "name": googleResponse.name ?? "",
                    "imageUrl": googleResponse.imageUrl ?? ""
                ]
                let googleResult: [String: Any] = [
                    "accessToken": accessToken,
                    "idToken": googleResponse.authentication.idToken ?? "",
                    "profile": profile
                ]
                call.resolve([
                    "provider": "google",
                    "result": googleResult
                ])
            } else if let facebookResponse = response as? FacebookLoginResponse {
                let facebookResult: [String: Any] = [
                    "accessToken": facebookResponse.accessToken,
                    "profile": facebookResponse.profile,
                    "idToken": facebookResponse.idToken ?? ""
                ]
                call.resolve([
                    "provider": "facebook",
                    "result": facebookResult
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
