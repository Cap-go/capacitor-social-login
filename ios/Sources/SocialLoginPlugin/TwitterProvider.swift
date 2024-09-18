import Foundation
import TwitterKit

class TwitterProvider {
    private var consumerKey: String?
    private var consumerSecret: String?
    
    func initialize(consumerKey: String, consumerSecret: String) {
        self.consumerKey = consumerKey
        self.consumerSecret = consumerSecret
        TWTRTwitter.sharedInstance().start(withConsumerKey: consumerKey, consumerSecret: consumerSecret)
    }
    
    func login(completion: @escaping (Result<TwitterLoginResponse, Error>) -> Void) {
        TWTRTwitter.sharedInstance().logIn { session, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let session = session else {
                completion(.failure(NSError(domain: "TwitterProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No session found"])))
                return
            }
            
            let accessToken = AccessToken(
                applicationId: nil,
                declinedPermissions: nil,
                expires: session.expirationDate.description,
                isExpired: session.expirationDate < Date(),
                lastRefresh: nil,
                permissions: nil,
                token: session.authToken,
                userId: session.userID
            )
            
            let response = TwitterLoginResponse(
                accessToken: accessToken,
                profile: Profile(fields: [])
            )
            
            completion(.success(response))
        }
    }
    
    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        TWTRTwitter.sharedInstance().sessionStore.logOutUserID(TWTRTwitter.sharedInstance().sessionStore.session()?.userID)
        completion(.success(()))
    }
    
    func getCurrentUser(completion: @escaping (Result<TwitterLoginResponse?, Error>) -> Void) {
        if let session = TWTRTwitter.sharedInstance().sessionStore.session() {
            let accessToken = AccessToken(
                applicationId: nil,
                declinedPermissions: nil,
                expires: session.expirationDate.description,
                isExpired: session.expirationDate < Date(),
                lastRefresh: nil,
                permissions: nil,
                token: session.authToken,
                userId: session.userID
            )
            
            let response = TwitterLoginResponse(
                accessToken: accessToken,
                profile: Profile(fields: [])
            )
            
            completion(.success(response))
        } else {
            completion(.success(nil))
        }
    }
    
    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        TWTRTwitter.sharedInstance().sessionStore.refreshSession(forUserID: TWTRTwitter.sharedInstance().sessionStore.session()?.userID) { session, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let _ = session else {
                completion(.failure(NSError(domain: "TwitterProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to refresh token"])))
                return
            }
            
            completion(.success(()))
        }
    }
}
