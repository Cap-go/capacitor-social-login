import Foundation

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

enum GoogleProviderLoginType {
    case OFFLINE
    case ONLINE
}

#if canImport(GoogleSignIn)
class GoogleProvider {
    var configuration: GIDConfiguration!
    var forceAuthCode: Bool = false
    var additionalScopes: [String]!
    var defaultGrantedScopes = ["email", "profile", "openid"]
    var mode = GoogleProviderLoginType.ONLINE

    func initialize(clientId: String, mode: GoogleProviderLoginType, serverClientId: String? = nil, hostedDomain: String? = nil) {
        configuration = GIDConfiguration(clientID: clientId, serverClientID: serverClientId, hostedDomain: hostedDomain, openIDRealm: nil)
        self.mode = mode

        GIDSignIn.sharedInstance.configuration = configuration

        additionalScopes = []

        forceAuthCode = false
    }

    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            if let forcePrompt = payload["forcePrompt"] as? Bool {
                self.forceAuthCode = forcePrompt
            } else {
                self.forceAuthCode = false
            }

            func login() {
                guard let presentingVc = UIApplication.shared.windows.first?.rootViewController else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }

                let shouldGrantOfflineAccess = payload["grantOfflineAccess"] as? Bool ?? false
                var scopes = payload["scopes"] as? [String] ?? self.defaultGrantedScopes
                if shouldGrantOfflineAccess {
                    scopes = Array(Set(scopes + ["offline_access"]))
                }

                // Extract nonce from payload if provided
                let nonce = payload["nonce"] as? String

                GIDSignIn.sharedInstance.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: payload["scopes"] as? [String] ?? self.defaultGrantedScopes,
                    nonce: nonce
                ) { result, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    guard let result = result else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No result returned"])))
                        return
                    }
                    if self.mode == .OFFLINE {
                        guard let serverAuthCode = result.serverAuthCode else {
                            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Cannot find serverAuthCode, make sure to set iOSServerClientId in the configuration"])))
                            return
                        }
                        completion(.success(self.createOfflineResponse(serverAuthCode: result.serverAuthCode ?? "")))
                    } else {
                        completion(.success(self.mode == .ONLINE ? self.createOnlineLoginResponse(user: result.user) : self.createOfflineResponse(serverAuthCode: result.serverAuthCode ?? "")))
                    }
                }
            }

            if GIDSignIn.sharedInstance.hasPreviousSignIn() && !self.forceAuthCode && self.mode != .OFFLINE {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        // completion(.failure(error))
                        login()
                        return
                    }
                    completion(.success(self.createOnlineLoginResponse(user: user!)))
                }
            } else {
                login()
            }
        }
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        if self.mode == .OFFLINE {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "logout is not implemented when using offline mode"])))
            return
        }
        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signOut()
            completion(.success(()))
        }
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
        if self.mode == .OFFLINE {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "isLoggedIn is not implemented when using offline mode"])))
            return
        }
        DispatchQueue.main.async {
            if GIDSignIn.sharedInstance.currentUser != nil {
                completion(.success(true))
                return
            }
            if GIDSignIn.sharedInstance.hasPreviousSignIn() {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    completion(.success(user != nil))
                }
            } else {
                completion(.success(false))
            }
        }
    }

    func getAuthorizationCode(completion: @escaping (Result<GoogleLoginResponse.Authentication, Error>) -> Void) {
        if self.mode == .OFFLINE {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "getAuthorizationCode is not implemented when using offline mode"])))
            return
        }
        DispatchQueue.main.async {
            if let user = GIDSignIn.sharedInstance.currentUser {
                user.refreshTokensIfNeeded { user, error in
                    guard error == nil else {
                        completion(.failure(error!))
                        return
                    }
                    guard let user = user else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "User guard failed??"])))
                        return
                    }

                    completion(.success(GoogleLoginResponse.Authentication(accessToken: user.accessToken.tokenString, idToken: user.idToken?.tokenString, refreshToken: nil)))
                    return
                }
            }
            if GIDSignIn.sharedInstance.hasPreviousSignIn() {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    guard let user = user else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "2nd User guard failed??"])))
                        return
                    }

                    user.refreshTokensIfNeeded { user, error in
                        guard error == nil else {
                            completion(.failure(error!))
                            return
                        }
                        guard let user = user else {
                            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "3rd user guard failed??"])))
                            return
                        }

                        completion(.success(GoogleLoginResponse.Authentication(accessToken: user.accessToken.tokenString, idToken: user.idToken?.tokenString, refreshToken: nil)))
                        return
                    }
                }
            } else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "User is not logged in"])))
            }
        }
    }

    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            guard let currentUser = GIDSignIn.sharedInstance.currentUser else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "User not logged in"])))
                return
            }
            currentUser.refreshTokensIfNeeded { _, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                completion(.success(()))
            }
        }
    }

    private func getServerClientIdValue() -> String? {
        // Implement your logic to retrieve the server client ID
        return nil
    }

    private func createOnlineLoginResponse(user: GIDGoogleUser) -> GoogleLoginResponse {
        return GoogleLoginResponse(
            authentication: GoogleLoginResponse.Authentication(
                accessToken: user.accessToken.tokenString,
                idToken: user.idToken?.tokenString,
                refreshToken: user.refreshToken.tokenString
            ),
            email: user.profile?.email,
            familyName: user.profile?.familyName,
            givenName: user.profile?.givenName,
            id: user.userID,
            name: user.profile?.name,
            imageUrl: user.profile?.imageURL(withDimension: 100)?.absoluteString
        )
    }
    private func createOfflineResponse(serverAuthCode: String) -> GoogleLoginResponse {
        return GoogleLoginResponse(
            authentication: GoogleLoginResponse.Authentication(
                accessToken: "", idToken: nil, refreshToken: nil
            ), email: nil, familyName: nil, givenName: nil, id: nil, name: nil, imageUrl: nil, serverAuthCode: serverAuthCode)
    }
}
#else
// Stub class when GoogleSignIn is not available
class GoogleProvider {
    func initialize(clientId: String, mode: GoogleProviderLoginType, serverClientId: String? = nil, hostedDomain: String? = nil) {
        fatalError("Google Sign-In is not available. Include GoogleSignIn dependency in your Podfile.")
    }

    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Sign-In is not available"])))
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Sign-In is not available"])))
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Sign-In is not available"])))
    }

    func getAuthorizationCode(completion: @escaping (Result<GoogleLoginResponse.Authentication, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Sign-In is not available"])))
    }

    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Sign-In is not available"])))
    }
}
#endif

struct GoogleLoginResponse {
    let authentication: Authentication
    let email: String?
    let familyName: String?
    let givenName: String?
    let id: String?
    let name: String?
    let imageUrl: String?
    var serverAuthCode: String?

    struct Authentication {
        let accessToken: String
        let idToken: String?
        let refreshToken: String?
    }
}
