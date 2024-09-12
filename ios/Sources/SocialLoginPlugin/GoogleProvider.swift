import Foundation
import GoogleSignIn

class GoogleProvider {
    private var clientId: String?
    
    func initialize(clientId: String) {
        self.clientId = clientId
        GIDSignIn.sharedInstance.clientID = clientId
    }
    
    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        guard let clientId = clientId else {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Client ID not set"])))
            return
        }
        
        let configuration = GIDConfiguration(clientID: clientId)
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootViewController = window.rootViewController else {
            completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No root view controller found"])))
            return
        }
        
        GIDSignIn.sharedInstance.signIn(with: configuration, presenting: rootViewController) { user, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let user = user else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No user found"])))
                return
            }
            
            let accessToken = AccessToken(
                applicationId: nil,
                declinedPermissions: nil,
                expires: user.accessToken.expirationDate.description,
                isExpired: user.accessToken.expirationDate < Date(),
                lastRefresh: nil,
                permissions: nil,
                token: user.accessToken.tokenString,
                userId: user.userID
            )
            
            let response = GoogleLoginResponse(
                accessToken: accessToken,
                profile: Profile(fields: [])
            )
            
            completion(.success(response))
        }
    }
    
    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        GIDSignIn.sharedInstance.signOut()
        completion(.success(()))
    }
    
    func getCurrentUser(completion: @escaping (Result<GoogleLoginResponse?, Error>) -> Void) {
        if let user = GIDSignIn.sharedInstance.currentUser {
            let accessToken = AccessToken(
                applicationId: nil,
                declinedPermissions: nil,
                expires: user.accessToken.expirationDate.description,
                isExpired: user.accessToken.expirationDate < Date(),
                lastRefresh: nil,
                permissions: nil,
                token: user.accessToken.tokenString,
                userId: user.userID
            )
            
            let response = GoogleLoginResponse(
                accessToken: accessToken,
                profile: Profile(fields: [])
            )
            
            completion(.success(response))
        } else {
            completion(.success(nil))
        }
    }
    
    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        GIDSignIn.sharedInstance.currentUser?.authentication.do { authentication, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let _ = authentication else {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to refresh token"])))
                return
            }
            
            completion(.success(()))
        }
    }
}
