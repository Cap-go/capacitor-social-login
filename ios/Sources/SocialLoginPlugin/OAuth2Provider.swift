import Foundation
import AuthenticationServices
import CryptoKit
import UIKit

struct OAuth2TokenResponse: Codable {
    let token_type: String
    let expires_in: Int?
    let access_token: String
    let scope: String?
    let refresh_token: String?
    let id_token: String?
}

struct OAuth2StoredTokens: Codable {
    let accessToken: String
    let refreshToken: String?
    let idToken: String?
    let expiresAt: Date
    let scope: [String]
    let tokenType: String
}

struct OAuth2LoginResponse {
    let providerId: String
    let accessToken: OAuth2AccessToken
    let idToken: String?
    let refreshToken: String?
    let resourceData: [String: Any]?
    let scope: [String]
    let tokenType: String
    let expiresIn: Int?
}

struct OAuth2AccessToken {
    let token: String
    let tokenType: String
    let expires: String?
    let refreshToken: String?
}

struct OAuth2ProviderConfig {
    let appId: String
    let issuerUrl: String?
    var authorizationBaseUrl: String?
    var accessTokenEndpoint: String?
    let redirectUrl: String
    let resourceUrl: String?
    let responseType: String
    let pkceEnabled: Bool
    let scope: String
    let additionalParameters: [String: String]?
    let loginHint: String?
    let prompt: String?
    let additionalTokenParameters: [String: String]?
    let additionalResourceHeaders: [String: String]?
    var logoutUrl: String?
    let postLogoutRedirectUrl: String?
    let additionalLogoutParameters: [String: String]?
    let iosPrefersEphemeralWebBrowserSession: Bool
    let logsEnabled: Bool
}

class OAuth2Provider: NSObject {
    private var providers: [String: OAuth2ProviderConfig] = [:]
    private var currentSession: ASWebAuthenticationSession?
    private var currentState: String?
    private var currentCodeVerifier: String?
    private var currentProviderId: String?
    private let tokenStorageKeyPrefix = "CapgoOAuth2ProviderTokens_"

    func initializeProviders(configs: [String: [String: Any]]) -> [String] {
        var errors: [String] = []

        for (providerId, config) in configs {
            let appId = (config["appId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let clientId = (config["clientId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let resolvedAppId = (appId?.isEmpty == false ? appId : nil) ?? (clientId?.isEmpty == false ? clientId : nil) else {
                errors.append("oauth2.\(providerId).appId (or clientId) is required")
                continue
            }
            let issuerUrl = (config["issuerUrl"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            let authorizationBaseUrl =
                (config["authorizationBaseUrl"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ??
                (config["authorizationEndpoint"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            guard let redirectUrl = config["redirectUrl"] as? String, !redirectUrl.isEmpty else {
                errors.append("oauth2.\(providerId).redirectUrl is required")
                continue
            }
            if (authorizationBaseUrl == nil || authorizationBaseUrl?.isEmpty == true) && (issuerUrl == nil || issuerUrl?.isEmpty == true) {
                errors.append("oauth2.\(providerId).authorizationBaseUrl (or authorizationEndpoint) or issuerUrl is required")
                continue
            }

            let providerConfig = OAuth2ProviderConfig(
                appId: resolvedAppId,
                issuerUrl: issuerUrl,
                authorizationBaseUrl: (authorizationBaseUrl?.isEmpty == false ? authorizationBaseUrl : nil),
                accessTokenEndpoint:
                    (config["accessTokenEndpoint"] as? String) ??
                    (config["tokenEndpoint"] as? String),
                redirectUrl: redirectUrl,
                resourceUrl: config["resourceUrl"] as? String,
                responseType: config["responseType"] as? String ?? "code",
                pkceEnabled: config["pkceEnabled"] as? Bool ?? true,
                scope: config["scope"] as? String ?? "",
                additionalParameters: config["additionalParameters"] as? [String: String],
                loginHint: config["loginHint"] as? String,
                prompt: config["prompt"] as? String,
                additionalTokenParameters: config["additionalTokenParameters"] as? [String: String],
                additionalResourceHeaders: config["additionalResourceHeaders"] as? [String: String],
                logoutUrl: (config["logoutUrl"] as? String) ?? (config["endSessionEndpoint"] as? String),
                postLogoutRedirectUrl: config["postLogoutRedirectUrl"] as? String,
                additionalLogoutParameters: config["additionalLogoutParameters"] as? [String: String],
                iosPrefersEphemeralWebBrowserSession:
                    (config["iosPrefersEphemeralWebBrowserSession"] as? Bool) ??
                    (config["iosPrefersEphemeralSession"] as? Bool) ??
                    true,
                logsEnabled: config["logsEnabled"] as? Bool ?? false
            )

            providers[providerId] = providerConfig

            if providerConfig.logsEnabled {
                print(
                    "[OAuth2Provider] Initialized provider '\(providerId)' with appId: \(resolvedAppId), issuerUrl: \(issuerUrl ?? "nil"), authorizationBaseUrl: \(authorizationBaseUrl ?? "nil")"
                )
            }
        }

        return errors
    }

    private func getProvider(_ providerId: String) -> OAuth2ProviderConfig? {
        return providers[providerId]
    }

    private func discoveryUrl(for issuerUrl: String) -> URL? {
        let trimmed = issuerUrl.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        return URL(string: "\(trimmed)/.well-known/openid-configuration")
    }

    private func ensureDiscovered(providerId: String, completion: @escaping (Result<OAuth2ProviderConfig, Error>) -> Void) {
        guard var config = getProvider(providerId) else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -1, userInfo: [NSLocalizedDescriptionKey: "OAuth2 provider '\(providerId)' not configured. Call initialize()."])))
            return
        }
        guard let issuerUrl = config.issuerUrl, !issuerUrl.isEmpty else {
            completion(.success(config))
            return
        }

        // Already resolved enough for auth.
        if config.authorizationBaseUrl != nil && (config.responseType != "code" || config.accessTokenEndpoint != nil) {
            completion(.success(config))
            return
        }

        guard let url = discoveryUrl(for: issuerUrl) else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -20, userInfo: [NSLocalizedDescriptionKey: "Invalid issuerUrl for provider '\(providerId)'."])))
            return
        }

        if config.logsEnabled {
            print("[OAuth2Provider] Discovering OIDC configuration at: \(url.absoluteString)")
        }

        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode), let data = data else {
                completion(.failure(NSError(domain: "OAuth2Provider", code: -21, userInfo: [NSLocalizedDescriptionKey: "OIDC discovery failed for provider '\(providerId)'."])))
                return
            }
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                let auth = json?["authorization_endpoint"] as? String
                let token = json?["token_endpoint"] as? String
                let endSession = json?["end_session_endpoint"] as? String

                if config.authorizationBaseUrl == nil, let auth = auth, !auth.isEmpty {
                    config.authorizationBaseUrl = auth
                }
                if config.accessTokenEndpoint == nil, let token = token, !token.isEmpty {
                    config.accessTokenEndpoint = token
                }
                if config.logoutUrl == nil, let endSession = endSession, !endSession.isEmpty {
                    config.logoutUrl = endSession
                }

                // Persist updated config back into map
                self?.providers[providerId] = config
                completion(.success(config))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    private func tokenStorageKey(for providerId: String) -> String {
        return "\(tokenStorageKeyPrefix)\(providerId)"
    }

    func login(providerId: String, payload: [String: Any], completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        ensureDiscovered(providerId: providerId) { [weak self] res in
            guard let self = self else { return }
            switch res {
            case .failure(let err):
                completion(.failure(err))
            case .success(let config):
                guard let authorizationBaseUrl = config.authorizationBaseUrl, !authorizationBaseUrl.isEmpty else {
                    completion(.failure(NSError(domain: "OAuth2Provider", code: -2, userInfo: [NSLocalizedDescriptionKey: "Missing authorization endpoint (discovery may have failed)."])))
                    return
                }

                let loginScope = payload["scope"] as? String ?? config.scope
                let state = payload["state"] as? String ?? UUID().uuidString
                let codeVerifier = payload["codeVerifier"] as? String ?? self.generateCodeVerifier()
                let redirect = payload["redirectUrl"] as? String ?? config.redirectUrl
                let additionalLoginParams = payload["additionalParameters"] as? [String: String]

                self.currentState = state
                self.currentCodeVerifier = codeVerifier
                self.currentProviderId = providerId

                var components = URLComponents(string: authorizationBaseUrl)
                var queryItems: [URLQueryItem] = [
                    URLQueryItem(name: "response_type", value: config.responseType),
                    URLQueryItem(name: "client_id", value: config.appId),
                    URLQueryItem(name: "redirect_uri", value: redirect),
                    URLQueryItem(name: "state", value: state)
                ]

                if !loginScope.isEmpty {
                    queryItems.append(URLQueryItem(name: "scope", value: loginScope))
                }

                // Add PKCE for code flow
                if config.responseType == "code" && config.pkceEnabled {
                    let codeChallenge = self.generateCodeChallenge(from: codeVerifier)
                    queryItems.append(URLQueryItem(name: "code_challenge", value: codeChallenge))
                    queryItems.append(URLQueryItem(name: "code_challenge_method", value: "S256"))
                }

                // Merge additional parameters (config + per-login)
                var merged: [String: String] = [:]
                if let base = config.additionalParameters {
                    for (k, v) in base { merged[k] = v }
                }
                if let login = additionalLoginParams {
                    for (k, v) in login { merged[k] = v }
                }
                if let loginHint = payload["loginHint"] as? String ?? config.loginHint, merged["login_hint"] == nil {
                    merged["login_hint"] = loginHint
                }
                if let prompt = payload["prompt"] as? String ?? config.prompt, merged["prompt"] == nil {
                    merged["prompt"] = prompt
                }
                for (k, v) in merged {
                    queryItems.append(URLQueryItem(name: k, value: v))
                }

                components?.queryItems = queryItems

                guard let authUrl = components?.url, let callbackScheme = URL(string: redirect)?.scheme else {
                    completion(.failure(NSError(domain: "OAuth2Provider", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid redirect URL configuration."])))
                    return
                }

                if config.logsEnabled {
                    print("[OAuth2Provider] Opening authorization URL: \(authUrl.absoluteString)")
                }

                let session = ASWebAuthenticationSession(url: authUrl, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                    guard let self = self else { return }
                    if let error = error {
                        if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                            completion(.failure(NSError(domain: "OAuth2Provider", code: -3, userInfo: [NSLocalizedDescriptionKey: "User cancelled login."])))
                        } else {
                            completion(.failure(error))
                        }
                        return
                    }

                    guard let callbackURL = callbackURL else {
                        completion(.failure(NSError(domain: "OAuth2Provider", code: -4, userInfo: [NSLocalizedDescriptionKey: "Invalid callback URL."])))
                        return
                    }

                    self.handleCallback(providerId: providerId, config: config, callbackURL: callbackURL, redirectUri: redirect, completion: completion)
                }

                session.presentationContextProvider = self
                session.prefersEphemeralWebBrowserSession = config.iosPrefersEphemeralWebBrowserSession
                self.currentSession = session
                session.start()
            }
        }
    }

    private func handleCallback(providerId: String, config: OAuth2ProviderConfig, callbackURL: URL, redirectUri: String, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        // Parse both query params and fragment
        var params: [String: String] = [:]

        if let queryItems = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems {
            for item in queryItems {
                params[item.name] = item.value
            }
        }

        // Parse fragment for implicit flow
        if let fragment = callbackURL.fragment {
            let fragmentParams = fragment.components(separatedBy: "&")
            for param in fragmentParams {
                let parts = param.components(separatedBy: "=")
                if parts.count == 2 {
                    params[parts[0]] = parts[1].removingPercentEncoding
                }
            }
        }

        // Validate state
        if let returnedState = params["state"], returnedState != currentState {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -5, userInfo: [NSLocalizedDescriptionKey: "State mismatch detected during OAuth2 login."])))
            return
        }

        // Check for error
        if let errorCode = params["error"] {
            let errorDescription = params["error_description"] ?? errorCode
            completion(.failure(NSError(domain: "OAuth2Provider", code: -6, userInfo: [NSLocalizedDescriptionKey: errorDescription])))
            return
        }

        // Handle code flow
        if let code = params["code"] {
            guard let codeVerifier = currentCodeVerifier else {
                completion(.failure(NSError(domain: "OAuth2Provider", code: -7, userInfo: [NSLocalizedDescriptionKey: "Missing code verifier."])))
                return
            }
            exchangeCode(providerId: providerId, config: config, code: code, redirectUri: redirectUri, codeVerifier: codeVerifier, completion: completion)
            return
        }

        // Handle implicit flow
        if let accessToken = params["access_token"] {
            let tokenResponse = OAuth2TokenResponse(
                token_type: params["token_type"] ?? "bearer",
                expires_in: params["expires_in"].flatMap { Int($0) },
                access_token: accessToken,
                scope: params["scope"],
                refresh_token: nil,
                id_token: params["id_token"]
            )
            handleTokenSuccess(providerId: providerId, config: config, tokenResponse: tokenResponse, fallbackRefreshToken: nil, completion: completion)
            return
        }

        completion(.failure(NSError(domain: "OAuth2Provider", code: -8, userInfo: [NSLocalizedDescriptionKey: "No authorization code or access token in callback."])))
    }

    func logout(providerId: String, completion: @escaping (Result<Void, Error>) -> Void) {
        UserDefaults.standard.removeObject(forKey: tokenStorageKey(for: providerId))
        ensureDiscovered(providerId: providerId) { [weak self] res in
            guard let self = self else {
                completion(.success(()))
                return
            }
            if case .success(let config) = res, let logoutUrl = config.logoutUrl, let base = URL(string: logoutUrl) {
                var url = base
                if var components = URLComponents(url: base, resolvingAgainstBaseURL: false) {
                    var items = components.queryItems ?? []
                    if let idToken = self.loadTokens(for: providerId)?.idToken, !idToken.isEmpty {
                        items.append(URLQueryItem(name: "id_token_hint", value: idToken))
                    }
                    if let post = config.postLogoutRedirectUrl, !post.isEmpty {
                        items.append(URLQueryItem(name: "post_logout_redirect_uri", value: post))
                    }
                    if let extra = config.additionalLogoutParameters {
                        for (k, v) in extra {
                            items.append(URLQueryItem(name: k, value: v))
                        }
                    }
                    components.queryItems = items
                    if let composed = components.url {
                        url = composed
                    }
                }
                DispatchQueue.main.async {
                    UIApplication.shared.open(url)
                }
            }
            completion(.success(()))
        }

    }

    func isLoggedIn(providerId: String, completion: @escaping (Result<Bool, Error>) -> Void) {
        if let tokens = loadTokens(for: providerId) {
            completion(.success(tokens.expiresAt > Date()))
        } else {
            completion(.success(false))
        }
    }

    func getAuthorizationCode(providerId: String, completion: @escaping (Result<OAuth2AccessToken, Error>) -> Void) {
        guard let tokens = loadTokens(for: providerId) else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -9, userInfo: [NSLocalizedDescriptionKey: "User not logged in."])))
            return
        }
        completion(.success(OAuth2AccessToken(
            token: tokens.accessToken,
            tokenType: tokens.tokenType,
            expires: ISO8601DateFormatter().string(from: tokens.expiresAt),
            refreshToken: tokens.refreshToken
        )))
    }

    func refresh(providerId: String, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        refreshToken(providerId: providerId, refreshToken: nil, additionalParameters: nil, completion: completion)
    }

    func refreshToken(providerId: String, refreshToken: String?, additionalParameters: [String: String]?, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        ensureDiscovered(providerId: providerId) { [weak self] res in
            guard let self = self else { return }
            switch res {
            case .failure(let err):
                completion(.failure(err))
            case .success(let config):
                let stored = self.loadTokens(for: providerId)
                let effectiveRefreshToken = refreshToken ?? stored?.refreshToken
                guard let rt = effectiveRefreshToken, !rt.isEmpty else {
                    completion(.failure(NSError(domain: "OAuth2Provider", code: -10, userInfo: [NSLocalizedDescriptionKey: "No refresh token available. Include offline_access scope."])))
                    return
                }
                self.refreshTokens(providerId: providerId, config: config, refreshToken: rt, additionalParameters: additionalParameters, completion: completion)
            }
        }
    }

    private func exchangeCode(providerId: String, config: OAuth2ProviderConfig, code: String, redirectUri: String, codeVerifier: String, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        guard let accessTokenEndpoint = config.accessTokenEndpoint else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -11, userInfo: [NSLocalizedDescriptionKey: "Missing accessTokenEndpoint for code exchange."])))
            return
        }

        var body: [String: String] = [
            "grant_type": "authorization_code",
            "client_id": config.appId,
            "code": code,
            "redirect_uri": redirectUri
        ]

        if config.pkceEnabled {
            body["code_verifier"] = codeVerifier
        }

        if let extra = config.additionalTokenParameters {
            for (k, v) in extra { body[k] = v }
        }

        if config.logsEnabled {
            print("[OAuth2Provider] Exchanging code at: \(accessTokenEndpoint)")
        }

        performTokenRequest(endpoint: accessTokenEndpoint, body: body) { [weak self] result in
            switch result {
            case .success(let tokenResponse):
                self?.handleTokenSuccess(providerId: providerId, config: config, tokenResponse: tokenResponse, fallbackRefreshToken: nil, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func refreshTokens(providerId: String, config: OAuth2ProviderConfig, refreshToken: String, additionalParameters: [String: String]? = nil, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        guard let accessTokenEndpoint = config.accessTokenEndpoint else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -12, userInfo: [NSLocalizedDescriptionKey: "Missing accessTokenEndpoint for token refresh."])))
            return
        }

        var body: [String: String] = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": config.appId
        ]

        if let extra = config.additionalTokenParameters {
            for (k, v) in extra { body[k] = v }
        }
        if let extra = additionalParameters {
            for (k, v) in extra { body[k] = v }
        }

        performTokenRequest(endpoint: accessTokenEndpoint, body: body) { [weak self] result in
            switch result {
            case .success(let tokenResponse):
                self?.handleTokenSuccess(providerId: providerId, config: config, tokenResponse: tokenResponse, fallbackRefreshToken: refreshToken, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func performTokenRequest(endpoint: String, body: [String: String], completion: @escaping (Result<OAuth2TokenResponse, Error>) -> Void) {
        guard let url = URL(string: endpoint) else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -13, userInfo: [NSLocalizedDescriptionKey: "Invalid token endpoint."])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = body.percentEncoded()

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NSError(domain: "OAuth2Provider", code: -14, userInfo: [NSLocalizedDescriptionKey: "Invalid response."])))
                return
            }
            guard let data = data, httpResponse.statusCode == 200 else {
                let message = String(data: data ?? Data(), encoding: .utf8) ?? "Unknown error"
                completion(.failure(NSError(domain: "OAuth2Provider", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: message])))
                return
            }

            do {
                let decoded = try JSONDecoder().decode(OAuth2TokenResponse.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(error))
            }
        }
        .resume()
    }

    private func handleTokenSuccess(providerId: String, config: OAuth2ProviderConfig, tokenResponse: OAuth2TokenResponse, fallbackRefreshToken: String?, completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void) {
        let expiresAt = tokenResponse.expires_in.map { Date().addingTimeInterval(TimeInterval($0)) } ?? Date().addingTimeInterval(3600)
        let scopeArray = tokenResponse.scope?.split(separator: " ").map { String($0) } ?? []
        let effectiveRefreshToken = tokenResponse.refresh_token ?? fallbackRefreshToken

        // Fetch resource data if configured
        if let resourceUrl = config.resourceUrl {
            fetchResource(config: config, accessToken: tokenResponse.access_token) { [weak self] resourceResult in
                guard let self = self else { return }

                let resourceData: [String: Any]?
                switch resourceResult {
                case .success(let data):
                    resourceData = data
                case .failure(let error):
                    if config.logsEnabled {
                        print("[OAuth2Provider] Failed to fetch resource: \(error.localizedDescription)")
                    }
                    resourceData = nil
                }

                self.completeLogin(
                    providerId: providerId,
                    tokenResponse: tokenResponse,
                    effectiveRefreshToken: effectiveRefreshToken,
                    expiresAt: expiresAt,
                    scopeArray: scopeArray,
                    resourceData: resourceData,
                    completion: completion
                )
            }
        } else {
            completeLogin(
                providerId: providerId,
                tokenResponse: tokenResponse,
                effectiveRefreshToken: effectiveRefreshToken,
                expiresAt: expiresAt,
                scopeArray: scopeArray,
                resourceData: nil,
                completion: completion
            )
        }
    }

    private func completeLogin(
        providerId: String,
        tokenResponse: OAuth2TokenResponse,
        effectiveRefreshToken: String?,
        expiresAt: Date,
        scopeArray: [String],
        resourceData: [String: Any]?,
        completion: @escaping (Result<OAuth2LoginResponse, Error>) -> Void
    ) {
        let stored = OAuth2StoredTokens(
            accessToken: tokenResponse.access_token,
            refreshToken: effectiveRefreshToken,
            idToken: tokenResponse.id_token,
            expiresAt: expiresAt,
            scope: scopeArray,
            tokenType: tokenResponse.token_type
        )
        persistTokens(tokens: stored, for: providerId)

        let response = OAuth2LoginResponse(
            providerId: providerId,
            accessToken: OAuth2AccessToken(
                token: tokenResponse.access_token,
                tokenType: tokenResponse.token_type,
                expires: ISO8601DateFormatter().string(from: expiresAt),
                refreshToken: effectiveRefreshToken
            ),
            idToken: tokenResponse.id_token,
            refreshToken: effectiveRefreshToken,
            resourceData: resourceData,
            scope: scopeArray,
            tokenType: tokenResponse.token_type,
            expiresIn: tokenResponse.expires_in
        )
        completion(.success(response))
    }

    private func fetchResource(config: OAuth2ProviderConfig, accessToken: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        guard let resourceUrl = config.resourceUrl, let url = URL(string: resourceUrl) else {
            completion(.failure(NSError(domain: "OAuth2Provider", code: -15, userInfo: [NSLocalizedDescriptionKey: "Invalid resource URL."])))
            return
        }

        var request = URLRequest(url: url)
        request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        if let additionalHeaders = config.additionalResourceHeaders {
            for (key, value) in additionalHeaders {
                request.addValue(value, forHTTPHeaderField: key)
            }
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NSError(domain: "OAuth2Provider", code: -16, userInfo: [NSLocalizedDescriptionKey: "Invalid response."])))
                return
            }
            guard let data = data, httpResponse.statusCode == 200 else {
                let message = String(data: data ?? Data(), encoding: .utf8) ?? "Unknown error"
                completion(.failure(NSError(domain: "OAuth2Provider", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: message])))
                return
            }

            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    completion(.success(json))
                } else {
                    completion(.failure(NSError(domain: "OAuth2Provider", code: -17, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response."])))
                }
            } catch {
                completion(.failure(error))
            }
        }
        .resume()
    }

    private func persistTokens(tokens: OAuth2StoredTokens, for providerId: String) {
        do {
            let data = try JSONEncoder().encode(tokens)
            UserDefaults.standard.set(data, forKey: tokenStorageKey(for: providerId))
        } catch {
            print("OAuth2Provider persistTokens error: \(error.localizedDescription)")
        }
    }

    private func loadTokens(for providerId: String) -> OAuth2StoredTokens? {
        guard let data = UserDefaults.standard.data(forKey: tokenStorageKey(for: providerId)) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(OAuth2StoredTokens.self, from: data)
        } catch {
            print("OAuth2Provider loadTokens error: \(error.localizedDescription)")
            return nil
        }
    }

    func getAccessTokenExpirationDate(providerId: String) -> Date? {
        return loadTokens(for: providerId)?.expiresAt
    }

    func isAccessTokenAvailable(providerId: String) -> Bool {
        guard let token = loadTokens(for: providerId)?.accessToken else { return false }
        return !token.isEmpty
    }

    func isAccessTokenExpired(providerId: String) -> Bool {
        guard let expiresAt = loadTokens(for: providerId)?.expiresAt else { return true }
        return expiresAt <= Date()
    }

    func isRefreshTokenAvailable(providerId: String) -> Bool {
        guard let rt = loadTokens(for: providerId)?.refreshToken else { return false }
        return !rt.isEmpty
    }

    private func generateCodeVerifier() -> String {
        var data = Data(count: 64)
        _ = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 64, $0.baseAddress!) }
        return data.base64EncodedString()
            .replacingOccurrences(of: "=", with: "")
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
    }

    private func generateCodeChallenge(from verifier: String) -> String {
        let data = verifier.data(using: .utf8) ?? Data()
        let digest = SHA256.hash(data: data)
        return Data(digest).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

extension OAuth2Provider: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

private extension Dictionary where Key == String, Value == String {
    func percentEncoded() -> Data? {
        map { key, value in
            "\(key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? key)=\(value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value)"
        }
        .joined(separator: "&")
        .data(using: .utf8)
    }
}
