import Foundation
import AuthenticationServices
import UIKit

struct TelegramProfile {
    let id: String
    let firstName: String
    let lastName: String?
    let username: String?
    let photoUrl: String?
}

struct TelegramLoginResponse {
    let profile: TelegramProfile
    let authDate: Int
    let hash: String
    let requestAccess: String
}

private struct TelegramStoredSession: Codable {
    let profile: TelegramProfileStored
    let authDate: Int
    let hash: String
    let requestAccess: String
    let expiresAt: Date
}

private struct TelegramProfileStored: Codable {
    let id: String
    let firstName: String
    let lastName: String?
    let username: String?
    let photoUrl: String?
}

class TelegramProvider: NSObject {
    private var botId: String?
    private var requestAccess: String = "write"
    private var origin: String?
    private var redirectUri: String?
    private var languageCode: String?
    private var currentSession: ASWebAuthenticationSession?
    private var pendingState: String?
    private let storageKey = "CapgoTelegramSession"
    private let sessionTtl: TimeInterval = 24 * 60 * 60 // 24h

    func initialize(botId: String, requestAccess: String?, origin: String?, redirectUri: String?, languageCode: String?) {
        self.botId = botId
        self.requestAccess = requestAccess ?? "write"
        self.origin = origin
        self.redirectUri = redirectUri
        self.languageCode = languageCode
    }

    func login(payload: [String: Any], completion: @escaping (Result<TelegramLoginResponse, Error>) -> Void) {
        guard let botId = botId else {
            completion(.failure(NSError(domain: "TelegramProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Telegram botId is not configured. Call initialize()."])))
            return
        }

        guard let redirect = (payload["redirectUrl"] as? String) ?? redirectUri else {
            completion(.failure(NSError(domain: "TelegramProvider", code: -2, userInfo: [NSLocalizedDescriptionKey: "telegram.redirectUrl is required."])))
            return
        }

        let requestAccess = (payload["requestAccess"] as? String) ?? self.requestAccess
        let state = (payload["state"] as? String) ?? UUID().uuidString
        pendingState = state

        let origin = self.origin ?? Self.deriveOrigin(from: redirect)
        let returnTo = Self.appendState(to: redirect, state: state)

        guard let authUrl = Self.buildAuthUrl(botId: botId, origin: origin, requestAccess: requestAccess, returnTo: returnTo, languageCode: languageCode) else {
            completion(.failure(NSError(domain: "TelegramProvider", code: -3, userInfo: [NSLocalizedDescriptionKey: "Unable to build Telegram auth URL."])))
            return
        }

        guard let callbackScheme = URL(string: redirect)?.scheme else {
            completion(.failure(NSError(domain: "TelegramProvider", code: -4, userInfo: [NSLocalizedDescriptionKey: "Invalid redirect URL"])))
            return
        }

        let session = ASWebAuthenticationSession(url: authUrl, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
            guard let self = self else { return }
            self.currentSession = nil

            if let error = error {
                completion(.failure(error))
                return
            }

            guard let callbackURL = callbackURL, let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
                completion(.failure(NSError(domain: "TelegramProvider", code: -5, userInfo: [NSLocalizedDescriptionKey: "Invalid callback URL."])))
                return
            }

            let query = components.queryItems ?? []
            let payload = Dictionary(uniqueKeysWithValues: query.map { ($0.name, $0.value ?? "") })

            let returnedState = payload["state"]
            if returnedState != self.pendingState {
                completion(.failure(NSError(domain: "TelegramProvider", code: -6, userInfo: [NSLocalizedDescriptionKey: "State mismatch detected during Telegram login."])))
                return
            }

            if let errorCode = payload["error"], !errorCode.isEmpty {
                let description = payload["error_description"] ?? errorCode
                completion(.failure(NSError(domain: "TelegramProvider", code: -7, userInfo: [NSLocalizedDescriptionKey: description])))
                return
            }

            guard let id = payload["id"], let authDateRaw = payload["auth_date"], let hash = payload["hash"] else {
                completion(.failure(NSError(domain: "TelegramProvider", code: -8, userInfo: [NSLocalizedDescriptionKey: "Telegram login payload is incomplete."])))
                return
            }

            let authDate = Int(authDateRaw) ?? Int(Date().timeIntervalSince1970)
            let profile = TelegramProfile(
                id: id,
                firstName: payload["first_name"] ?? "",
                lastName: payload["last_name"],
                username: payload["username"],
                photoUrl: payload["photo_url"]
            )

            let response = TelegramLoginResponse(
                profile: profile,
                authDate: authDate,
                hash: hash,
                requestAccess: requestAccess == "read" ? "read" : "write"
            )

            self.persistSession(response: response)
            completion(.success(response))
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = true
        currentSession = session
        session.start()
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        UserDefaults.standard.removeObject(forKey: storageKey)
        completion(.success(()))
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
        guard let stored = loadSession() else {
            completion(.success(false))
            return
        }
        completion(.success(stored.expiresAt > Date()))
    }

    func refresh(completion: @escaping (Result<TelegramLoginResponse, Error>) -> Void) {
        completion(.failure(NSError(domain: "TelegramProvider", code: -9, userInfo: [NSLocalizedDescriptionKey: "Telegram refresh is not supported. Call login() again."])))
    }

    func getAuthorizationCode(completion: @escaping (Result<TelegramLoginResponse, Error>) -> Void) {
        completion(.failure(NSError(domain: "TelegramProvider", code: -10, userInfo: [NSLocalizedDescriptionKey: "getAuthorizationCode is not available for Telegram."])))
    }

    private func persistSession(response: TelegramLoginResponse) {
        let stored = TelegramStoredSession(
            profile: TelegramProfileStored(
                id: response.profile.id,
                firstName: response.profile.firstName,
                lastName: response.profile.lastName,
                username: response.profile.username,
                photoUrl: response.profile.photoUrl
            ),
            authDate: response.authDate,
            hash: response.hash,
            requestAccess: response.requestAccess,
            expiresAt: Date(timeIntervalSince1970: TimeInterval(response.authDate)).addingTimeInterval(sessionTtl)
        )
        do {
            let data = try JSONEncoder().encode(stored)
            UserDefaults.standard.set(data, forKey: storageKey)
        } catch {
            print("TelegramProvider persistSession error: \(error.localizedDescription)")
        }
    }

    private func loadSession() -> TelegramStoredSession? {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return nil
        }
        do {
            let session = try JSONDecoder().decode(TelegramStoredSession.self, from: data)
            return session
        } catch {
            print("TelegramProvider loadSession error: \(error.localizedDescription)")
            return nil
        }
    }

    private static func deriveOrigin(from redirect: String) -> String {
        if let url = URL(string: redirect), let host = url.host, let scheme = url.scheme {
            return "\(scheme)://\(host)"
        }
        return redirect
    }

    private static func appendState(to redirect: String, state: String) -> String {
        guard var components = URLComponents(string: redirect) else {
            return redirect
        }
        var queryItems = components.queryItems ?? []
        if !queryItems.contains(where: { $0.name == "state" }) {
            queryItems.append(URLQueryItem(name: "state", value: state))
        }
        components.queryItems = queryItems
        return components.url?.absoluteString ?? redirect
    }

    private static func buildAuthUrl(botId: String, origin: String, requestAccess: String, returnTo: String, languageCode: String?) -> URL? {
        var components = URLComponents(string: "https://oauth.telegram.org/auth")
        var items: [URLQueryItem] = [
            URLQueryItem(name: "bot_id", value: botId),
            URLQueryItem(name: "origin", value: origin),
            URLQueryItem(name: "request_access", value: requestAccess),
            URLQueryItem(name: "return_to", value: returnTo),
            URLQueryItem(name: "embed", value: "1"),
            URLQueryItem(name: "mobile", value: "1")
        ]
        if let languageCode = languageCode, !languageCode.isEmpty {
            items.append(URLQueryItem(name: "lang", value: languageCode))
        }
        components?.queryItems = items
        return components?.url
    }
}

extension TelegramProvider: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
