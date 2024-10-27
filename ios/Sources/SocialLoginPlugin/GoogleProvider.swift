import Foundation
import GoogleSignIn
import Alamofire

// Define the Decodable structs for the response
struct GoogleUserinfoResponse: Decodable {
    let sub: String
    let name: String
    let given_name: String
    let family_name: String
    let picture: String
    let email: String
    let email_verified: Bool?
}

class GoogleProvider {
    var configuration: GIDConfiguration!
    var forceAuthCode: Bool = false
    var additionalScopes: [String]!
    var defaultGrantedScopes = ["email", "profile", "openid"]
    var USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

    func initialize(clientId: String, serverClientId: String? = nil) {
        configuration = GIDConfiguration(clientID: clientId, serverClientID: serverClientId)

        GIDSignIn.sharedInstance.configuration = configuration

        additionalScopes = []

        forceAuthCode = false
    }

    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            func login() {
                guard let presentingVc = UIApplication.shared.windows.first?.rootViewController else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }

                GIDSignIn.sharedInstance.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: payload["scopes"] as? [String] ?? self.defaultGrantedScopes
                ) { result, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    guard let result = result else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No result returned"])))
                        return
                    }
                    self.createLoginResponse(user: result.user, completion: completion)
                }
            }
            
            if GIDSignIn.sharedInstance.hasPreviousSignIn() && !self.forceAuthCode {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        // completion(.failure(error))
                        login()
                        return
                    }
                    self.createLoginResponse(user: user!, completion: completion)
                }
            } else {
                login()
            }
        }
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signOut()
            completion(.success(()))
        }
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
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

    func getAuthorizationCode(completion: @escaping (Result<String, Error>) -> Void) {
        DispatchQueue.main.async {
            if let currentUser = GIDSignIn.sharedInstance.currentUser, let idToken = currentUser.idToken?.tokenString {
                completion(.success(idToken))
                return
            }
            if GIDSignIn.sharedInstance.hasPreviousSignIn() {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    if let user = user, let idToken = user.idToken?.tokenString {
                        completion(.success(idToken))
                        return
                    }
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "AuthorizationCode not found for google login"])))
                }
            } else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "AuthorizationCode not found for google login"])))
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

    private func createLoginResponse(user: GIDGoogleUser, completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        // For platform consistency sake, I will fetch the userinfo API, but it's really not needed
        AF.request(
            USERINFO_URL,
            method: .get,
            headers: ["Authorization": "Bearer \(user.accessToken.tokenString)"]
        )
        .validate(statusCode: 200..<300) // Ensure the response status code is in the 200-299 range
        .responseDecodable(of: GoogleUserinfoResponse.self) { response in
            switch response.result {
                
            case .success(let result):
                var expires = abs((user.accessToken.expirationDate ?? Date()).timeIntervalSince(Date()))
                completion(.success(GoogleLoginResponse(accessToken: GoogleLoginResponse.Authentication(token: user.accessToken.tokenString, expires: Int64(expires)), profile: GoogleLoginResponse.Profile(email: result.email, familyName: result.family_name, givenName: result.given_name, id: result.sub, name: result.name, imageUrl: result.picture))))
            case .failure(let err):
                completion(.failure(err))
            }
        };
                
//        return GoogleLoginResponse(
//            authentication: GoogleLoginResponse.Authentication(
//                accessToken: user.accessToken.tokenString,
//                idToken: user.idToken?.tokenString,
//                refreshToken: user.refreshToken.tokenString
//            ),
//            email: user.profile?.email,
//            familyName: user.profile?.familyName,
//            givenName: user.profile?.givenName,
//            id: user.userID,
//            name: user.profile?.name,
//            imageUrl: user.profile?.imageURL(withDimension: 100)?.absoluteString
//        )
    }
}

struct GoogleLoginResponse {
    let accessToken: Authentication
    let profile: Profile?

    struct Authentication {
        let token: String
        let expires: Int64
    }
    
    struct Profile {
        let email: String
        let familyName: String
        let givenName: String
        let id: String
        let name: String
        let imageUrl: String
    }
}
