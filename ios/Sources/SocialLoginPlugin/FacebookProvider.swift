import Foundation
import FacebookLogin

class FacebookProvider {
    private var loginManager: LoginManager?
    
    func initialize(appId: String) {
        Settings.appID = appId
        loginManager = LoginManager()
    }
    
    func login(payload: [String: Any], completion: @escaping (Result<FacebookLoginResponse, Error>) -> Void) {
        guard let permissions = payload["permissions"] as? [String] else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Missing permissions"])))
            return
        }
        
        loginManager?.logIn(permissions: permissions, from: nil) { result, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let result = result, !result.isCancelled else {
                completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Login cancelled"])))
                return
            }
            
            let accessToken = result.token
            let response = FacebookLoginResponse(
                accessToken: AccessToken(
                    applicationId: accessToken.appID,
                    declinedPermissions: accessToken.declinedPermissions.map { $0 as String },
                    expires: accessToken.expirationDate.description,
                    isExpired: accessToken.isExpired,
                    lastRefresh: accessToken.refreshDate.description,
                    permissions: accessToken.permissions.map { $0 as String },
                    token: accessToken.tokenString,
                    userId: accessToken.userID
                ),
                profile: Profile(fields: [])
            )
            
            completion(.success(response))
        }
    }
    
    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        loginManager?.logOut()
        completion(.success(()))
    }
    
    func getCurrentUser(completion: @escaping (Result<FacebookLoginResponse?, Error>) -> Void) {
        if let accessToken = AccessToken.current {
            let response = FacebookLoginResponse(
                accessToken: AccessToken(
                    applicationId: accessToken.appID,
                    declinedPermissions: accessToken.declinedPermissions.map { $0 as String },
                    expires: accessToken.expirationDate.description,
                    isExpired: accessToken.isExpired,
                    lastRefresh: accessToken.refreshDate.description,
                    permissions: accessToken.permissions.map { $0 as String },
                    token: accessToken.tokenString,
                    userId: accessToken.userID
                ),
                profile: Profile(fields: [])
            )
            completion(.success(response))
        } else {
            completion(.success(nil))
        }
    }
    
    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        if let accessToken = AccessToken.current {
            accessToken.refreshIfNeeded { _, error in
                if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.success(()))
                }
            }
        } else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No current access token"])))
        }
    }
}

struct FacebookLoginResponse {
    let accessToken: AccessToken
    let profile: Profile
}

struct AccessToken {
    let applicationId: String?
    let declinedPermissions: [String]?
    let expires: String?
    let isExpired: Bool?
    let lastRefresh: String?
    let permissions: [String]?
    let token: String
    let userId: String?
}

struct Profile {
    let fields: [String]
}
