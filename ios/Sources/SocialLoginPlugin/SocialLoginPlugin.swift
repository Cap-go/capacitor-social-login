import Foundation
import Capacitor
import AuthenticationServices

#if canImport(FBSDKLoginKit)
import FBSDKLoginKit
#endif

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(SocialLoginPlugin)
public class SocialLoginPlugin: CAPPlugin, CAPBridgedPlugin {
    private let pluginVersion: String = "8.2.25"
    public let identifier = "SocialLoginPlugin"
    public let jsName = "SocialLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "login", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "logout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isLoggedIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAuthorizationCode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUserInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "handleRedirectCallback", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "decodeIdToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAccessTokenExpirationDate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAccessTokenAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAccessTokenExpired", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isRefreshTokenAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "providerSpecificCall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPluginVersion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSecureWindow", returnType: CAPPluginReturnPromise)
    ]

    // Providers - conditionally initialized based on available dependencies
    #if canImport(Alamofire)
    private let apple = AppleProvider()
    #else
    private let apple: AppleProvider? = nil
    #endif

    #if canImport(FBSDKLoginKit)
    private let facebook = FacebookProvider()
    #else
    private let facebook: FacebookProvider? = nil
    #endif

    #if canImport(GoogleSignIn)
    private let google = GoogleProvider()
    #else
    private let google: GoogleProvider? = nil
    #endif

    private let twitter = TwitterProvider()
    private let oauth2 = OAuth2Provider()
    private var openSecureWindowCall: CAPPluginCall?

    // Helper to get Facebook provider (returns nil if unavailable)
    private var facebookProvider: FacebookProvider? {
        #if canImport(FBSDKLoginKit)
        return facebook
        #else
        return nil
        #endif
    }

    // Helper to get Google provider (returns nil if unavailable)
    private var googleProvider: GoogleProvider? {
        #if canImport(GoogleSignIn)
        return google
        #else
        return nil
        #endif
    }

    // Helper to get Apple provider (returns nil if unavailable)
    private var appleProvider: AppleProvider? {
        #if canImport(Alamofire)
        return apple
        #else
        return nil
        #endif
    }

    /**
     * Check if a provider is enabled in Capacitor config.
     * Returns true if not set (default enabled).
     */
    private func isProviderEnabledInConfig(_ providerName: String) -> Bool {
        let config = self.getConfig().getConfigJSON()

        guard let providers = config["providers"] as? [String: Any] else {
            return true
        }

        // Check if provider is explicitly set to false
        if let value = providers[providerName] {
            if let boolValue = value as? Bool {
                return boolValue
            }
            // If it's a string "false", treat as disabled
            if let stringValue = value as? String, stringValue.lowercased() == "false" {
                return false
            }
        }

        return true // Default to enabled
    }

    /**
     * Check if a provider is available (dependencies are included or enabled via config)
     */
    private func isProviderAvailable(_ provider: String) -> Bool {
        switch provider.lowercased() {
        case "apple":
            // Check config first (for "fake disable"), then check Alamofire dependency
            if !isProviderEnabledInConfig("apple") {
                return false
            }
            #if canImport(Alamofire)
            return true
            #else
            return false
            #endif
        case "facebook":
            #if canImport(FBSDKLoginKit)
            return true
            #else
            return false
            #endif
        case "google":
            #if canImport(GoogleSignIn)
            return true
            #else
            return false
            #endif
        case "twitter":
            // Check config first (for "fake disable")
            return isProviderEnabledInConfig("twitter")
        default:
            return false
        }
    }

    @objc func getPluginVersion(_ call: CAPPluginCall) {
        call.resolve(["version": self.pluginVersion])
    }

    @objc func initialize(_ call: CAPPluginCall) {
        var initialized = false

        if let facebookSettings = call.getObject("facebook") {
            if facebookSettings["appId"] is String {
                // Check if Facebook dependencies are available
                guard let fbProvider = facebookProvider else {
                    call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                    return
                }
                fbProvider.initialize()
                initialized = true
            }
        }

        if let googleSettings = call.getObject("google") {
            let iOSClientId = googleSettings["iOSClientId"] as? String
            let iOSServerClientId = googleSettings["iOSServerClientId"] as? String
            let hostedDomain = googleSettings["hostedDomain"] as? String

            let modeStr = googleSettings["mode"] as? String
            var mode = GoogleProviderLoginType.ONLINE
            if let modeStr = modeStr {
                switch modeStr {
                case "online":
                    mode = GoogleProviderLoginType.ONLINE
                case "offline":
                    mode = GoogleProviderLoginType.OFFLINE
                case _:
                    call.reject("google.mode != (online || offline)")
                    return
                }
            }

            if let clientId = iOSClientId {
                // Check if Google dependencies are available
                guard let gProvider = googleProvider else {
                    call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                    return
                }
                gProvider.initialize(clientId: clientId, mode: mode, serverClientId: iOSServerClientId, hostedDomain: hostedDomain)
                initialized = true
            }
        }

        if let appleSettings = call.getObject("apple") {
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            let redirectUrl = appleSettings["redirectUrl"] as? String
            let useProperTokenExchange = appleSettings["useProperTokenExchange"] as? Bool ?? false
            apProvider.initialize(redirectUrl: redirectUrl, useProperTokenExchange: useProperTokenExchange)
            initialized = true
        }

        if let twitterSettings = call.getObject("twitter") {
            guard let clientId = twitterSettings["clientId"] as? String, !clientId.isEmpty else {
                call.reject("twitter.clientId is required")
                return
            }
            guard let redirectUrl = twitterSettings["redirectUrl"] as? String, !redirectUrl.isEmpty else {
                call.reject("twitter.redirectUrl is required")
                return
            }
            let defaultScopes = twitterSettings["defaultScopes"] as? [String]
            let forceLogin = twitterSettings["forceLogin"] as? Bool ?? false
            let audience = twitterSettings["audience"] as? String
            twitter.initialize(clientId: clientId, redirectUri: redirectUrl, defaultScopes: defaultScopes, forceLogin: forceLogin, audience: audience)
            initialized = true
        }

        if let oauth2Settings = call.getObject("oauth2"), !oauth2Settings.isEmpty {
            // oauth2Settings is now a dictionary of provider configs: { "github": {...}, "azure": {...} }
            var oauth2Configs: [String: [String: Any]] = [:]
            for (providerId, value) in oauth2Settings {
                if let config = value as? [String: Any] {
                    oauth2Configs[providerId] = config
                }
            }

            if !oauth2Configs.isEmpty {
                let errors = oauth2.initializeProviders(configs: oauth2Configs)
                if !errors.isEmpty {
                    call.reject(errors.joined(separator: ", "))
                    return
                }
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
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            if let idToken = apProvider.idToken {
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
            guard let gProvider = googleProvider else {
                call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                return
            }
            gProvider.getAuthorizationCode { res in
                do {
                    let authorizationCode = try res.get()
                    call.resolve([ "jwt": authorizationCode.idToken ?? "", "accessToken": authorizationCode.accessToken ])
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        case "facebook": do {
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            fbProvider.getAuthorizationCode { res in
                do {
                    let result = try res.get()
                    var response: [String: String] = [:]
                    if let accessToken = result.accessToken {
                        response["accessToken"] = accessToken
                    }
                    if let jwt = result.jwt {
                        response["jwt"] = jwt
                    }
                    call.resolve(response)
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        case "twitter": do {
            self.twitter.getAuthorizationCode { res in
                do {
                    let token = try res.get()
                    var response: [String: Any] = [
                        "accessToken": token.token,
                        "tokenType": token.tokenType as Any
                    ]
                    if let expiresIn = token.expiresIn {
                        response["expiresIn"] = expiresIn
                    }
                    if let refreshToken = token.refreshToken {
                        response["refreshToken"] = refreshToken
                    }
                    call.resolve(response)
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        case "oauth2": do {
            guard let providerId = call.getString("providerId") else {
                call.reject("providerId is required for oauth2 getAuthorizationCode")
                return
            }
            self.oauth2.getAuthorizationCode(providerId: providerId) { res in
                do {
                    let token = try res.get()
                    var response: [String: Any] = [
                        "accessToken": token.token,
                        "tokenType": token.tokenType
                    ]
                    if let expires = token.expires {
                        response["expires"] = expires
                    }
                    if let refreshToken = token.refreshToken {
                        response["refreshToken"] = refreshToken
                    }
                    call.resolve(response)
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
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            if let idToken = apProvider.idToken {
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
            guard let gProvider = googleProvider else {
                call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                return
            }
            gProvider.isLoggedIn { res in
                do {
                    let isLogged = try res.get()
                    call.resolve([ "isLoggedIn": isLogged ])
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        case "facebook": do {
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            call.resolve([ "isLoggedIn": fbProvider.isLoggedIn() ])
        }
        case "twitter": do {
            self.twitter.isLoggedIn { res in
                do {
                    let status = try res.get()
                    call.resolve([ "isLoggedIn": status ])
                } catch {
                    call.reject(error.localizedDescription)
                }
            }
        }
        case "oauth2": do {
            guard let providerId = call.getString("providerId") else {
                call.reject("providerId is required for oauth2 isLoggedIn")
                return
            }
            self.oauth2.isLoggedIn(providerId: providerId) { res in
                do {
                    let status = try res.get()
                    call.resolve([ "isLoggedIn": status ])
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
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            fbProvider.login(payload: payload) { (result: Result<FacebookLoginResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "google":
            guard let gProvider = googleProvider else {
                call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                return
            }
            gProvider.login(payload: payload) { (result: Result<GoogleLoginResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "apple":
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            apProvider.login(payload: payload) { (result: Result<AppleProviderResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "twitter":
            twitter.login(payload: payload) { (result: Result<TwitterProfileResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        case "oauth2":
            guard let providerId = payload["providerId"] as? String else {
                call.reject("providerId is required for oauth2 login")
                return
            }
            oauth2.login(providerId: providerId, payload: payload) { (result: Result<OAuth2LoginResponse, Error>) in
                self.handleLoginResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func providerSpecificCall(_ call: CAPPluginCall) {
        guard let customCall = call.getString("call") else {
            call.reject("Call is required")
            return
        }
        switch customCall {
        case "facebook#getProfile":
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            guard let options = call.getObject("options") else {
                call.reject("options are required")
                return
            }
            guard let fields = options["fields"] as? [String] else {
                call.reject("options are required")
                return
            }

            fbProvider.getProfile(fields: fields, completion: { res in
                switch res {
                case .success(let profile):
                    call.resolve(["profile": profile as Any])
                case .failure(let error):
                    call.reject(error.localizedDescription)
                }
            })
        case "facebook#requestTracking":
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            fbProvider.requestTracking(completion: { res in
                switch res {
                case .success(let status):
                    call.resolve(["status": status])
                case .failure(let error):
                    call.reject(error.localizedDescription)
                }
            })
        default:
            call.reject("Invalid call. Supported calls: facebook#getProfile, facebook#requestTracking")
        }
    }

    @objc func logout(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider")
            return
        }

        switch provider {
        case "facebook":
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            fbProvider.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "google":
            guard let gProvider = googleProvider else {
                call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                return
            }
            gProvider.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "apple":
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            apProvider.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "twitter":
            twitter.logout { result in
                self.handleLogoutResult(result, call: call)
            }
        case "oauth2":
            guard let providerId = call.getString("providerId") else {
                call.reject("providerId is required for oauth2 logout")
                return
            }
            oauth2.logout(providerId: providerId) { result in
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
            guard let fbProvider = facebookProvider else {
                call.reject("Facebook provider is disabled. Dependencies are not available. Ensure Facebook Login dependencies are included in your Podfile")
                return
            }
            fbProvider.refresh(viewController: self.bridge?.viewController) { result in
                self.handleRefreshResult(result, call: call)
            }
        case "google":
            guard let gProvider = googleProvider else {
                call.reject("Google Sign-In provider is disabled. Dependencies are not available. Ensure Google Sign-In dependencies are included in your Podfile")
                return
            }
            gProvider.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "apple":
            guard let apProvider = appleProvider else {
                call.reject("Apple Sign-In provider is disabled. Dependencies are not available. Ensure Alamofire dependency is included in your Podfile")
                return
            }
            apProvider.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "twitter":
            twitter.refresh { result in
                self.handleRefreshResult(result, call: call)
            }
        case "oauth2":
            guard let options = call.getObject("options"), let providerId = options["providerId"] as? String else {
                call.reject("providerId is required for oauth2 refresh")
                return
            }
            oauth2.refresh(providerId: providerId) { result in
                self.handleRefreshResult(result, call: call)
            }
        default:
            call.reject("Invalid provider")
        }
    }

    @objc func refreshToken(_ call: CAPPluginCall) {
        guard let provider = call.getString("provider") else {
            call.reject("Missing provider")
            return
        }
        if provider != "oauth2" {
            call.reject("refreshToken is only implemented for oauth2")
            return
        }
        guard let providerId = call.getString("providerId") else {
            call.reject("providerId is required for oauth2 refreshToken")
            return
        }
        let refreshToken = call.getString("refreshToken")
        var additionalParameters: [String: String]?
        if let raw = call.getObject("additionalParameters") {
            var out: [String: String] = [:]
            for (k, v) in raw {
                if let s = v as? String {
                    out[k] = s
                }
            }
            if !out.isEmpty {
                additionalParameters = out
            }
        }

        oauth2.refreshToken(providerId: providerId, refreshToken: refreshToken, additionalParameters: additionalParameters) { result in
            switch result {
            case .success(let oauth2Response):
                let accessToken: [String: Any] = [
                    "token": oauth2Response.accessToken.token,
                    "tokenType": oauth2Response.accessToken.tokenType,
                    "expires": oauth2Response.accessToken.expires ?? NSNull(),
                    "refreshToken": oauth2Response.accessToken.refreshToken ?? NSNull()
                ]
                let out: [String: Any] = [
                    "providerId": oauth2Response.providerId,
                    "accessToken": accessToken,
                    "idToken": oauth2Response.idToken ?? NSNull(),
                    "refreshToken": oauth2Response.refreshToken ?? NSNull(),
                    "resourceData": oauth2Response.resourceData ?? NSNull(),
                    "scope": oauth2Response.scope,
                    "tokenType": oauth2Response.tokenType,
                    "expiresIn": oauth2Response.expiresIn ?? NSNull()
                ]
                call.resolve(out)
            case .failure(let err):
                call.reject(err.localizedDescription)
            }
        }
    }

    @objc func handleRedirectCallback(_ call: CAPPluginCall) {
        call.reject("handleRedirectCallback is only available on web")
    }

    @objc func decodeIdToken(_ call: CAPPluginCall) {
        let idToken = call.getString("idToken") ?? call.getString("token")
        guard let idToken = idToken, !idToken.isEmpty else {
            call.reject("idToken (or token) is required")
            return
        }
        do {
            let claims = try self.decodeJwtClaims(idToken: idToken)
            call.resolve(["claims": claims])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @objc func getAccessTokenExpirationDate(_ call: CAPPluginCall) {
        guard let ms = call.getDouble("accessTokenExpirationDate") else {
            call.reject("accessTokenExpirationDate is required")
            return
        }
        let date = Date(timeIntervalSince1970: ms / 1000.0)
        call.resolve(["date": ISO8601DateFormatter().string(from: date)])
    }

    @objc func isAccessTokenAvailable(_ call: CAPPluginCall) {
        let token = call.getString("accessToken")
        call.resolve(["isAvailable": (token?.isEmpty == false)])
    }

    @objc func isAccessTokenExpired(_ call: CAPPluginCall) {
        guard let ms = call.getDouble("accessTokenExpirationDate") else {
            call.reject("accessTokenExpirationDate is required")
            return
        }
        let nowMs = Date().timeIntervalSince1970 * 1000.0
        call.resolve(["isExpired": ms <= nowMs])
    }

    @objc func isRefreshTokenAvailable(_ call: CAPPluginCall) {
        let token = call.getString("refreshToken")
        call.resolve(["isAvailable": (token?.isEmpty == false)])
    }

    @objc func openSecureWindow(_ call: CAPPluginCall) {
        guard let urlString = call.getString("authEndpoint") else {
            call.reject("authEndpoint is required")
            return
        }

        guard let url = URL(string: urlString) else {
            call.reject("Invalid URL")
            return
        }

        guard let redirectUri = call.getString("redirectUri") else {
            call.reject("Redirect URI is required")
            return
        }

        // Store the call for later resolution
        self.openSecureWindowCall = call

        // Open the URL in a secure browser window
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: url.scheme) {
                callbackURL, error in

                // Clean up the stored call
                self.openSecureWindowCall = nil

                if let error = error {
                    // Handle error (e.g., user cancelled)
                    call.reject(error.localizedDescription)
                    return
                }

                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received")
                    return
                }

                if !callbackURL.absoluteString.hasPrefix(redirectUri) {
                    call.reject("Redirect URI does not match, expected " + redirectUri + " but got " + callbackURL.absoluteString)
                    return
                }

                // Resolve the call with the callback URL
                call.resolve(["redirectedUri": callbackURL.absoluteString])
            }

            // Present the session
            session.presentationContextProvider = self
            session.start()
        }
    }

    private func decodeJwtClaims(idToken: String) throws -> [String: Any] {
        let parts = idToken.split(separator: ".")
        if parts.count < 2 {
            throw NSError(domain: "SocialLogin", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid JWT"])
        }
        let payload = String(parts[1])
        guard let data = base64UrlDecode(payload) else {
            throw NSError(domain: "SocialLogin", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid JWT payload encoding"])
        }
        let obj = try JSONSerialization.jsonObject(with: data)
        return obj as? [String: Any] ?? [:]
    }

    private func base64UrlDecode(_ value: String) -> Data? {
        var base64 = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        let padding = 4 - (base64.count % 4)
        if padding < 4 {
            base64 += String(repeating: "=", count: padding)
        }
        return Data(base64Encoded: base64)
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
            } else if let twitterResponse = response as? TwitterProfileResponse {
                call.resolve([
                    "accessToken": twitterResponse.accessToken.token,
                    "idToken": NSNull(),
                    "refreshToken": twitterResponse.accessToken.refreshToken ?? NSNull(),
                    "expiresIn": twitterResponse.accessToken.expiresIn ?? NSNull()
                ])
            } else if let oauth2Response = response as? OAuth2LoginResponse {
                call.resolve([
                    "accessToken": oauth2Response.accessToken.token,
                    "idToken": oauth2Response.idToken ?? NSNull(),
                    "refreshToken": oauth2Response.refreshToken ?? NSNull(),
                    "expiresIn": oauth2Response.expiresIn ?? NSNull()
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
                        "token": accessToken.token
                        // Add other AccessToken fields if needed
                    ]
                }

                let profileObject: [String: Any] = [
                    "user": appleResponse.profile.user,
                    "email": appleResponse.profile.email ?? "",
                    "givenName": appleResponse.profile.givenName ?? "",
                    "familyName": appleResponse.profile.familyName ?? ""
                ]

                var appleResult: [String: Any] = [
                    "accessToken": accessTokenObject ?? NSNull(),
                    "profile": profileObject,
                    "idToken": appleResponse.idToken ?? ""
                ]

                if let authorizationCode = appleResponse.authorizationCode {
                    appleResult["authorizationCode"] = authorizationCode
                }

                call.resolve([
                    "provider": "apple",
                    "result": appleResult
                ])
            } else if let googleResponse = response as? GoogleLoginResponse {
                if let serverAuthCode = googleResponse.serverAuthCode {
                    let googleResult: [String: Any] = [
                        "serverAuthCode": serverAuthCode,
                        "responseType": "offline"
                    ]
                    call.resolve([
                        "provider": "google",
                        "result": googleResult
                    ])
                    return
                }
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
                    "profile": profile,
                    "responseType": "online"
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
            } else if let twitterResponse = response as? TwitterProfileResponse {
                let profile: [String: Any] = [
                    "id": twitterResponse.profile.id,
                    "username": twitterResponse.profile.username,
                    "name": twitterResponse.profile.name ?? "",
                    "profileImageUrl": twitterResponse.profile.profile_image_url ?? "",
                    "verified": twitterResponse.profile.verified ?? false,
                    "email": twitterResponse.profile.email ?? NSNull()
                ]
                let accessToken: [String: Any] = [
                    "token": twitterResponse.accessToken.token,
                    "expiresIn": twitterResponse.accessToken.expiresIn ?? NSNull(),
                    "refreshToken": twitterResponse.accessToken.refreshToken ?? NSNull(),
                    "tokenType": twitterResponse.accessToken.tokenType ?? NSNull()
                ]
                let twitterResult: [String: Any] = [
                    "accessToken": accessToken,
                    "profile": profile,
                    "scope": twitterResponse.scope,
                    "tokenType": twitterResponse.tokenType,
                    "expiresIn": twitterResponse.expiresIn
                ]
                call.resolve([
                    "provider": "twitter",
                    "result": twitterResult
                ])
            } else if let oauth2Response = response as? OAuth2LoginResponse {
                let accessToken: [String: Any] = [
                    "token": oauth2Response.accessToken.token,
                    "tokenType": oauth2Response.accessToken.tokenType,
                    "expires": oauth2Response.accessToken.expires ?? NSNull(),
                    "refreshToken": oauth2Response.accessToken.refreshToken ?? NSNull()
                ]
                var oauth2Result: [String: Any] = [
                    "providerId": oauth2Response.providerId,
                    "accessToken": accessToken,
                    "idToken": oauth2Response.idToken ?? NSNull(),
                    "refreshToken": oauth2Response.refreshToken ?? NSNull(),
                    "resourceData": oauth2Response.resourceData ?? NSNull(),
                    "scope": oauth2Response.scope,
                    "tokenType": oauth2Response.tokenType,
                    "expiresIn": oauth2Response.expiresIn ?? NSNull()
                ]
                call.resolve([
                    "provider": "oauth2",
                    "result": oauth2Result
                ])
            } else {
                call.reject("Unsupported provider response")
            }
        case .failure(let error):
            call.reject(error.localizedDescription)
        }
    }
}

extension SocialLoginPlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}

struct SocialLoginUser {
    let accessToken: String
    let idToken: String?
    let refreshToken: String?
    let expiresIn: Int?
}
