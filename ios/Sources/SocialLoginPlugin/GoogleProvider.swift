import Foundation
import GoogleSignIn

class GoogleProvider {
    var googleSignIn: GIDSignIn!
    var googleSignInConfiguration: GIDConfiguration!
    var forceAuthCode: Bool = false
    var additionalScopes: [String]!

    func initialize(clientId: String) {
        googleSignIn = GIDSignIn.sharedInstance
        
        let serverClientId = getServerClientIdValue()
        googleSignInConfiguration = GIDConfiguration(clientID: clientId, serverClientID: serverClientId)
        
        let defaultGrantedScopes = ["email", "profile", "openid"]
        additionalScopes = []
        
        forceAuthCode = false
    }

    func login(payload: [String: Any], completion: @escaping (Result<GoogleLoginResponse, Error>) -> Void) {
        DispatchQueue.main.async {
            if self.googleSignIn.hasPreviousSignIn() && !self.forceAuthCode {
                self.googleSignIn.restorePreviousSignIn { user, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    completion(.success(self.createLoginResponse(user: user!)))
                }
            } else {
                guard let presentingVc = UIApplication.shared.windows.first?.rootViewController else {
                    completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller found"])))
                    return
                }
                
                self.googleSignIn.signIn(with: self.googleSignInConfiguration, presenting: presentingVc, hint: nil, additionalScopes: self.additionalScopes) { user, error in
                    if let error = error {
                        completion(.failure(error))
                        return
                    }
                    completion(.success(self.createLoginResponse(user: user!)))
                }
            }
        }
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            if self.googleSignIn != nil {
                self.googleSignIn.signOut()
            }
            completion(.success(()))
        }
    }

    func getCurrentUser(completion: @escaping (Result<GoogleLoginResponse?, Error>) -> Void) {
        if let user = googleSignIn.currentUser {
            completion(.success(createLoginResponse(user: user)))
        } else {
            completion(.success(nil))
        }
    }

    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            if self.googleSignIn.currentUser == nil {
                completion(.failure(NSError(domain: "GoogleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "User not logged in"])))
                return
            }
            self.googleSignIn.currentUser!.authentication.do { authentication, error in
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

    private func createLoginResponse(user: GIDGoogleUser) -> GoogleLoginResponse {
        return GoogleLoginResponse(
            authentication: GoogleLoginResponse.Authentication(
                accessToken: user.authentication.accessToken,
                idToken: user.authentication.idToken,
                refreshToken: user.authentication.refreshToken
            ),
            serverAuthCode: user.serverAuthCode,
            email: user.profile?.email,
            familyName: user.profile?.familyName,
            givenName: user.profile?.givenName,
            id: user.userID,
            name: user.profile?.name,
            imageUrl: user.profile?.imageURL(withDimension: 100)?.absoluteString
        )
    }
}

struct GoogleLoginResponse {
    let authentication: Authentication
    let serverAuthCode: String?
    let email: String?
    let familyName: String?
    let givenName: String?
    let id: String?
    let name: String?
    let imageUrl: String?

    struct Authentication {
        let accessToken: String
        let idToken: String?
        let refreshToken: String?
    }
}
