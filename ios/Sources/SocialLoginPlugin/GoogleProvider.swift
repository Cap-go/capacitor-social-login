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

enum GoogleProviderLoginType {
    case OFFLINE
    case ONLINE
}

class GoogleProvider {
    var configuration: GIDConfiguration!
    var additionalScopes: [String]!
    var defaultGrantedScopes = ["email", "profile", "openid"]
    var USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
    var TOKEN_REQUEST_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo"
    var mode = GoogleProviderLoginType.ONLINE

    func initialize(clientId: String, mode: GoogleProviderLoginType, serverClientId: String? = nil) {
        configuration = GIDConfiguration(clientID: clientId, serverClientID: serverClientId)
        self.mode = mode;

        GIDSignIn.sharedInstance.configuration = configuration

        additionalScopes = []
    }

    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        var scopes = payload["scopes"] as? [String] ?? self.defaultGrantedScopes
        if (!scopes.contains(where: { $0 == "https://www.googleapis.com/auth/userinfo.email" })) {
            scopes.append("https://www.googleapis.com/auth/userinfo.email")
        }
        if (!scopes.contains(where: { $0 == "https://www.googleapis.com/auth/userinfo.profile" })) {
            scopes.append("https://www.googleapis.com/auth/userinfo.profile")
        }
        if (!scopes.contains(where: { $0 == "openid" })) {
            scopes.append("openid")
        }
        
        DispatchQueue.main.async {

            func login() {
                guard let presentingVc = UIApplication.shared.windows.first?.rootViewController else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }
                GIDSignIn.sharedInstance.signIn(
                    withPresenting: presentingVc,
                    hint: nil,
                    additionalScopes: scopes
                ) { result, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    guard let result = result else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No result returned"])))
                        return
                    }
                    if (self.mode == .ONLINE) {
                        self.createLoginResponse(user: result.user, completion: completion)
                    } else {
                        self.createOfflineLoginResponse(code: result.serverAuthCode ?? "", completion: completion)
                    }
                    
                }
            }
            
            if GIDSignIn.sharedInstance.hasPreviousSignIn() && self.mode != .OFFLINE {
                GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
                    if let error = error {
                        // completion(.failure(error))
                        login()
                        return
                    }
                    guard let grantedScopes = user?.grantedScopes else {
                        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "grantedScopes is null (?)"])))
                        return
                    }
                    var sharedScopes = 0;
                    for scope in scopes {
                        if (grantedScopes.contains(scope)) {
                            sharedScopes += 1
                        }
                    }
                    // scopes do not match. Perhaps the user has requested an additional scope
                    if (sharedScopes != scopes.count) {
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
        if (self.mode == .OFFLINE) {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "logout is not implemented when using offline mode"])))
            return
        }
        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signOut()
            completion(.success(()))
        }
    }

    func isLoggedIn(completion: @escaping (Result<Bool, Error>) -> Void) {
        if (self.mode == .OFFLINE) {
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

    func getAuthorizationCode(completion: @escaping (Result<String, Error>) -> Void) {
        if (self.mode == .OFFLINE) {
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
                    
                    completion(.success(user.accessToken.tokenString))
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
                        
                        completion(.success(user.accessToken.tokenString))
                        return
                    }
                }
            } else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "User is not logged in"])))
            }
        }
    }
    
//    func accessTokenIsValid(accessToken: String, completion: @escaping (Result<Bool, Error>) -> Void) {
//        AF.request(
//            "\(TOKEN_REQUEST_URL)?access_token=\(accessToken)",
//            method: .get
//        )
//        .validate(statusCode: 200..<300) // Ensure the response status code is in the 200-299 range
//        .responseDecodable(of: GoogleTokenInfoResponse.self) { response in
//            switch response.result {
//                
//            case .success(let result):
//                guard let expires_in = Int64(result.expires_in) else {
//                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "expires_in is not a number"])))
//                    return
//                }
//                completion(.success(expires_in > 5))
//            case .failure(let err):
//                if let statusCode = response.response?.statusCode {
//                    if statusCode != 200 {
//                        print("[GoogleProvider] Invalid response from %s. Response not successful. Status code: \(statusCode). Assuming that the token is not valid")
//                        completion(.success(true))
//                        return
//                    }
//                }
//                completion(.failure(err))
//            }
//        };
//    }

    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Not implemented"])))
    }

    private func getServerClientIdValue() -> String? {
        // Implement your logic to retrieve the server client ID
        return nil
    }
    
    private func createOfflineLoginResponse(code: String, completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        var res = GoogleLoginResponse(accessToken: nil, profile: nil)
        res.serverAuthCode = code
        completion(.success(res))
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
    let accessToken: Authentication?
    let profile: Profile?
    var serverAuthCode: String? = nil

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
