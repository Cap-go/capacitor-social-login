import Foundation

#if canImport(FBSDKLoginKit)
import FBSDKLoginKit
#else
import FacebookLogin
#endif

struct FacebookLoginResponse {
    let accessToken: [String: Any]
    let profile: [String: Any]
    let idToken: String?
}

class FacebookProvider {
    private let loginManager = LoginManager()
    private let dateFormatter = ISO8601DateFormatter()

    init() {
        if #available(iOS 11.2, *) {
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        } else {
            dateFormatter.formatOptions = [.withInternetDateTime]
        }
    }

    private func dateToJS(_ date: Date) -> String {
        return dateFormatter.string(from: date)
    }

    func initialize() {
        // No initialization required for FacebookProvider
    }

    func login(payload: [String: Any], completion: @escaping (Result<FacebookLoginResponse, Error>) -> Void) {
        guard let permissions = payload["permissions"] as? [String] else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Missing permissions"])))
            return
        }

        let limitedLogin = payload["limitedLogin"] as? Bool ?? false
        let nonce = payload["nonce"] as? String ?? "123"

        let tracking: LoginTracking = limitedLogin ? .limited : .enabled

        guard let configuration = LoginConfiguration(
            permissions: permissions,
            tracking: tracking,
            nonce: nonce
        ) else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid login configuration"])))
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Check if a user is already logged in
            if AccessToken.current != nil {
                // User is already logged in, return current session info
                let response = self.createLoginResponse()
                completion(.success(response))
                return
            }
            
            self.loginManager.logIn(configuration: configuration) { result in
                switch result {
                case .success(_, _, _):
                    let response = self.createLoginResponse()
                    completion(.success(response))
                case .failed(let error):
                    completion(.failure(error))
                case .cancelled:
                    completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Login cancelled"])))
                }
            }
        }
    }

    private func createLoginResponse() -> FacebookLoginResponse {
        let profile = Profile.current
        let authToken = AuthenticationToken.current

        let accessToken: [String: Any] = [
            "applicationID": AccessToken.current?.appID ?? "",
            "declinedPermissions": AccessToken.current?.declinedPermissions.map { $0.name } ?? [],
            "expirationDate": AccessToken.current?.expirationDate ?? Date(),
            "isExpired": AccessToken.current?.isExpired ?? false,
            "refreshDate": AccessToken.current?.refreshDate ?? Date(),
            "permissions": AccessToken.current?.permissions.map { $0.name } ?? [],
            "token": AccessToken.current?.tokenString ?? "",
            "userID": AccessToken.current?.userID ?? ""
        ]

        let profileData: [String: Any] = [
            "userID": profile?.userID ?? "",
            "email": profile?.email ?? "",
            "friendIDs": profile?.friendIDs ?? [],
            "birthday": profile?.birthday ?? "",
            "ageRange": profile?.ageRange.flatMap(ageRangeToDictionary) ?? [:],
            "gender": profile?.gender ?? "",
            "location": profile?.location.flatMap(locationToDictionary) ?? [:],
            "hometown": profile?.hometown.flatMap(locationToDictionary) ?? [:],
            "profileURL": profile?.linkURL?.absoluteString ?? "",
            "name": profile?.name ?? "",
            "imageURL": profile?.imageURL?.absoluteString ?? ""
        ]

        return FacebookLoginResponse(
            accessToken: accessToken,
            profile: profileData,
            idToken: authToken?.tokenString
        )
    }

    private func locationToDictionary(_ location: Location) -> [String: String] {
        return [
            "id": location.id,
            "name": location.name
        ]
    }

    private func ageRangeToDictionary(_ ageRange: UserAgeRange) -> [String: Int] {
        var result: [String: Int] = [:]
        if let min = ageRange.min {
            result["min"] = min.intValue
        }
        if let max = ageRange.max {
            result["max"] = max.intValue
        }
        return result
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async { [weak self] in
            self?.loginManager.logOut()
            completion(.success(()))
        }
    }

    func refresh(viewController: UIViewController?, completion: @escaping (Result<Void, Error>) -> Void) {
        DispatchQueue.main.async {
            if let token = AccessToken.current, !token.isExpired {
                completion(.success(()))
            } else {
                self.loginManager.reauthorizeDataAccess(from: viewController!) { loginResult, error in
                    if let _ = loginResult?.token {
                        completion(.success(()))
                    } else {
                        completion(.failure(error ?? NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Reauthorization failed"])))
                    }
                }
            }
        }
    }
}
