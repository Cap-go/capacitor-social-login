import Foundation
import AuthenticationServices

class AppleProvider: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var clientId: String?
    private var completion: ((Result<AppleLoginResponse, Error>) -> Void)?
    
    func initialize(clientId: String) {
        self.clientId = clientId
    }
    
    func login(payload: [String: Any], completion: @escaping (Result<AppleLoginResponse, Error>) -> Void) {
        guard let clientId = clientId else {
            completion(.failure(NSError(domain: "AppleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Client ID not set"])))
            return
        }
        
        self.completion = completion
        
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        
        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }
    
    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        // Apple doesn't provide a logout method
        completion(.success(()))
    }
    
    func getCurrentUser(completion: @escaping (Result<AppleLoginResponse?, Error>) -> Void) {
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        appleIDProvider.getCredentialState(forUserID: "currentUserIdentifier") { (credentialState, error) in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            switch credentialState {
            case .authorized:
                // User is authorized, you might want to fetch more details here
                completion(.success(nil))
            case .revoked, .notFound:
                completion(.success(nil))
            @unknown default:
                completion(.failure(NSError(domain: "AppleProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Unknown credential state"])))
            }
        }
    }
    
    func refresh(completion: @escaping (Result<Void, Error>) -> Void) {
        // Apple doesn't provide a refresh method
        completion(.success(()))
    }
    
    // MARK: - ASAuthorizationControllerDelegate
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            let userIdentifier = appleIDCredential.user
            let fullName = appleIDCredential.fullName
            let email = appleIDCredential.email
            
            let response = AppleLoginResponse(
                user: userIdentifier,
                email: email,
                givenName: fullName?.givenName,
                familyName: fullName?.familyName,
                identityToken: String(data: appleIDCredential.identityToken ?? Data(), encoding: .utf8) ?? "",
                authorizationCode: String(data: appleIDCredential.authorizationCode ?? Data(), encoding: .utf8) ?? ""
            )
            
            completion?(.success(response))
        }
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        completion?(.failure(error))
    }
    
    // MARK: - ASAuthorizationControllerPresentationContextProviding
    
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first!
    }
}
