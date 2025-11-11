import Foundation
import AuthenticationServices
import CryptoKit
import UIKit

struct TwitterTokenResponse: Codable {
    let token_type: String
    let expires_in: Int
    let access_token: String
    let scope: String
    let refresh_token: String?
}

struct TwitterUserEnvelope: Codable {
    struct TwitterUserData: Codable {
        let id: String
        let name: String?
        let username: String
        let profile_image_url: String?
        let verified: Bool?
        let email: String?
    }

    let data: TwitterUserData
}

struct TwitterProfileResponse {
    let accessToken: TwitterAccessToken
    let profile: TwitterUserEnvelope.TwitterUserData
    let scope: [String]
    let expiresIn: Int
    let tokenType: String
}

struct TwitterAccessToken: Codable {
    let token: String
    let expiresIn: Int?
    let refreshToken: String?
    let tokenType: String?
}

struct TwitterStoredTokens: Codable {
    let accessToken: String
    let refreshToken: String?
    let expiresAt: Date
    let scope: [String]
    let tokenType: String
    let userId: String?
}

class TwitterProvider: NSObject {
    private var clientId: String?
    private var redirectUri: String?
    private var defaultScopes = ["tweet.read", "users.read"]
    private var forceLogin = false
    private var audience: String?

    private var currentSession: ASWebAuthenticationSession?
    private var currentState: String?
    private let tokenStorageKey = "CapgoTwitterProviderTokens"

    func initialize(clientId: String, redirectUri: String, defaultScopes: [String]?, forceLogin: Bool, audience: String?) {
        self.clientId = clientId
        self.redirectUri = redirectUri
        if let scopes = defaultScopes, !scopes.isEmpty {
            self.defaultScopes = scopes
        }
        self.forceLogin = forceLogin
        self.audience = audience
    }

    func login(payload: [String: Any], completion: @escaping (Result<TwitterProfileResponse, Error>) -> Void) {
        guard let clientId = clientId, let redirectUri = redirectUri else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Twitter client not configured. Call initialize()."])))
            return
        }

        let scopes = payload["scopes"] as? [String] ?? defaultScopes
        let state = payload["state"] as? String ?? UUID().uuidString
        let codeVerifier = payload["codeVerifier"] as? String ?? generateCodeVerifier()
        let forceLoginFlag = payload["forceLogin"] as? Bool ?? forceLogin
        let redirect = payload["redirectUrl"] as? String ?? redirectUri

        currentState = state

        var components = URLComponents(string: "https://x.com/i/oauth2/authorize")
        var query: [URLQueryItem] = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirect),
            URLQueryItem(name: "scope", value: scopes.joined(separator: " ")),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "code_challenge", value: generateCodeChallenge(from: codeVerifier)),
            URLQueryItem(name: "code_challenge_method", value: "S256")
        ]
        if forceLoginFlag {
            query.append(URLQueryItem(name: "force_login", value: "true"))
        }
        if let audience = audience {
            query.append(URLQueryItem(name: "audience", value: audience))
        }
        components?.queryItems = query

        guard let authUrl = components?.url, let callbackScheme = URL(string: redirect)?.scheme else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid redirect URL configuration."])) )
            return
        }

        let session = ASWebAuthenticationSession(url: authUrl, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
            guard let self = self else { return }
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let callbackURL = callbackURL, let queryItems = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems else {
                completion(.failure(NSError(domain: "TwitterProvider", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid callback URL."])) )
                return
            }

            let returnedState = queryItems.first(where: { $0.name == "state" })?.value
            if returnedState != self.currentState {
                completion(.failure(NSError(domain: "TwitterProvider", code: -4, userInfo: [NSLocalizedDescriptionKey: "State mismatch detected during Twitter login."])) )
                return
            }

            if let errorCode = queryItems.first(where: { $0.name == "error" })?.value {
                let errorDescription = queryItems.first(where: { $0.name == "error_description" })?.value ?? errorCode
                completion(.failure(NSError(domain: "TwitterProvider", code: -5, userInfo: [NSLocalizedDescriptionKey: errorDescription])))
                return
            }

            guard let code = queryItems.first(where: { $0.name == "code" })?.value else {
                completion(.failure(NSError(domain: "TwitterProvider", code: -6, userInfo: [NSLocalizedDescriptionKey: "Authorization code missing."])) )
                return
            }

            self.exchangeCode(code: code, redirectUri: redirect, codeVerifier: codeVerifier) { exchangeResult in
                completion(exchangeResult)
            }
        }

        if #available(iOS 13.0, *) {
            session.presentationContextProvider = self
        }

        session.prefersEphemeralWebBrowserSession = true
        currentSession = session
        session.start()
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        UserDefaults.standard.removeObject(forKey: tokenStorageKey)
        completion(.success(()))
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
        if let tokens = loadTokens() {
            completion(.success(tokens.expiresAt > Date()))
        } else {
            completion(.success(false))
        }
    }

    func getAuthorizationCode(completion: @escaping (Result<TwitterAccessToken, Error>) -> Void) {
        guard let tokens = loadTokens() else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -7, userInfo: [NSLocalizedDescriptionKey: "User not logged in"])))
            return
        }
        completion(.success(TwitterAccessToken(token: tokens.accessToken, expiresIn: Int(tokens.expiresAt.timeIntervalSince(Date())), refreshToken: tokens.refreshToken, tokenType: tokens.tokenType)))
    }

    func refresh(completion: @escaping (Result<TwitterProfileResponse, Error>) -> Void) {
        guard let tokens = loadTokens(), let refreshToken = tokens.refreshToken else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -8, userInfo: [NSLocalizedDescriptionKey: "No refresh token available. Include offline.access scope."])) )
            return
        }

        refreshTokens(refreshToken: refreshToken) { result in
            completion(result)
        }
    }

    private func exchangeCode(code: String, redirectUri: String, codeVerifier: String, completion: @escaping (Result<TwitterProfileResponse, Error>) -> Void) {
        guard let clientId = clientId else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -9, userInfo: [NSLocalizedDescriptionKey: "Missing client id"])))
            return
        }

        let body = [
            "grant_type": "authorization_code",
            "client_id": clientId,
            "code": code,
            "redirect_uri": redirectUri,
            "code_verifier": codeVerifier
        ]

        performTokenRequest(body: body) { [weak self] result in
            switch result {
            case .success(let tokenResponse):
                self?.handleTokenSuccess(tokenResponse: tokenResponse, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func refreshTokens(refreshToken: String, completion: @escaping (Result<TwitterProfileResponse, Error>) -> Void) {
        guard let clientId = clientId else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -9, userInfo: [NSLocalizedDescriptionKey: "Missing client id"])))
            return
        }

        let body = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
            "client_id": clientId
        ]

        performTokenRequest(body: body) { [weak self] result in
            switch result {
            case .success(let tokenResponse):
                self?.handleTokenSuccess(tokenResponse: tokenResponse, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func performTokenRequest(body: [String: String], completion: @escaping (Result<TwitterTokenResponse, Error>) -> Void) {
        guard let url = URL(string: "https://api.x.com/2/oauth2/token") else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -10, userInfo: [NSLocalizedDescriptionKey: "Invalid token endpoint."])) )
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
                completion(.failure(NSError(domain: "TwitterProvider", code: -11, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
                return
            }
            guard let data = data, httpResponse.statusCode == 200 else {
                let message = String(data: data ?? Data(), encoding: .utf8) ?? "Unknown error"
                completion(.failure(NSError(domain: "TwitterProvider", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: message])))
                return
            }

            do {
                let decoded = try JSONDecoder().decode(TwitterTokenResponse.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(error))
            }
        }
        .resume()
    }

    private func handleTokenSuccess(tokenResponse: TwitterTokenResponse, completion: @escaping (Result<TwitterProfileResponse, Error>) -> Void) {
        fetchProfile(accessToken: tokenResponse.access_token) { [weak self] profileResult in
            switch profileResult {
            case .success(let profile):
                let expiresAt = Date().addingTimeInterval(TimeInterval(tokenResponse.expires_in))
                let scopeArray = tokenResponse.scope.split(separator: " ").map { String($0) }

                let stored = TwitterStoredTokens(
                    accessToken: tokenResponse.access_token,
                    refreshToken: tokenResponse.refresh_token,
                    expiresAt: expiresAt,
                    scope: scopeArray,
                    tokenType: tokenResponse.token_type,
                    userId: profile.id
                )
                self?.persistTokens(tokens: stored)

                let response = TwitterProfileResponse(
                    accessToken: TwitterAccessToken(token: tokenResponse.access_token, expiresIn: tokenResponse.expires_in, refreshToken: tokenResponse.refresh_token, tokenType: tokenResponse.token_type),
                    profile: profile,
                    scope: scopeArray,
                    expiresIn: tokenResponse.expires_in,
                    tokenType: tokenResponse.token_type
                )
                completion(.success(response))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    private func fetchProfile(accessToken: String, completion: @escaping (Result<TwitterUserEnvelope.TwitterUserData, Error>) -> Void) {
        var components = URLComponents(string: "https://api.x.com/2/users/me")
        components?.queryItems = [URLQueryItem(name: "user.fields", value: "profile_image_url,verified,name,username")]

        guard let url = components?.url else {
            completion(.failure(NSError(domain: "TwitterProvider", code: -12, userInfo: [NSLocalizedDescriptionKey: "Invalid user endpoint."])) )
            return
        }

        var request = URLRequest(url: url)
        request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                completion(.failure(NSError(domain: "TwitterProvider", code: -13, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
                return
            }
            guard let data = data, httpResponse.statusCode == 200 else {
                let message = String(data: data ?? Data(), encoding: .utf8) ?? "Unknown error"
                completion(.failure(NSError(domain: "TwitterProvider", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: message])))
                return
            }
            do {
                let decoded = try JSONDecoder().decode(TwitterUserEnvelope.self, from: data)
                completion(.success(decoded.data))
            } catch {
                completion(.failure(error))
            }
        }
        .resume()
    }

    private func persistTokens(tokens: TwitterStoredTokens) {
        do {
            let data = try JSONEncoder().encode(tokens)
            UserDefaults.standard.set(data, forKey: tokenStorageKey)
        } catch {
            print("TwitterProvider persistTokens error: \(error.localizedDescription)")
        }
    }

    private func loadTokens() -> TwitterStoredTokens? {
        guard let data = UserDefaults.standard.data(forKey: tokenStorageKey) else {
            return nil
        }
        do {
            return try JSONDecoder().decode(TwitterStoredTokens.self, from: data)
        } catch {
            print("TwitterProvider loadTokens error: \(error.localizedDescription)")
            return nil
        }
    }

    private func generateCodeVerifier() -> String {
        var data = Data(count: 64)
        _ = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 64, $0.baseAddress!) }
        return data.base64EncodedString().replacingOccurrences(of: "=", with: "").replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
    }

    private func generateCodeChallenge(from verifier: String) -> String {
        let data = verifier.data(using: .utf8) ?? Data()
        let digest = SHA256.hash(data: data)
        return Data(digest).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}

extension TwitterProvider: ASWebAuthenticationPresentationContextProviding {
    @available(iOS 13.0, *)
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
