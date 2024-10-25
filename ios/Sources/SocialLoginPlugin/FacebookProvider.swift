import Foundation

#if canImport(FBSDKLoginKit)
import FBSDKLoginKit
#else
import FacebookLogin
#endif

struct FacebookLoginResponse {
    let accessToken: AccessToken?
    let profile: FacebookProfile
    let authenticationToken: String?
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

struct FacebookProfile {
    let userID: String
    let email: String?
    let friendIDs: [String]
    let birthday: String?
    let ageRange: AgeRange?
    let gender: String?
    let location: Location?
    let hometown: Location?
    let profileURL: String?
    let name: String?
    let imageURL: String?
}

struct AgeRange {
    let min: Int?
    let max: Int?
}

struct Location {
    let id: String
    let name: String
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

        let accessToken = AccessToken.current.map { token in
            AccessToken(
                applicationId: token.appID,
                declinedPermissions: token.declinedPermissions.map { $0.name },
                expires: dateToJS(token.expirationDate),
                isExpired: token.isExpired,
                lastRefresh: dateToJS(token.refreshDate),
                permissions: token.permissions.map { $0.name },
                token: token.tokenString,
                userId: token.userID
            )
        }

        let profileData = FacebookProfile(
            userID: profile?.userID ?? "",
            email: profile?.email,
            friendIDs: profile?.friendIDs ?? [],
            birthday: profile?.birthday,
            ageRange: profile?.ageRange.map { AgeRange(min: $0.min?.intValue, max: $0.max?.intValue) },
            gender: profile?.gender,
            location: profile?.location.map { Location(id: $0.id, name: $0.name) },
            hometown: profile?.hometown.map { Location(id: $0.id, name: $0.name) },
            profileURL: profile?.linkURL?.absoluteString,
            name: profile?.name,
            imageURL: profile?.imageURL?.absoluteString
        )

        return FacebookLoginResponse(
            accessToken: accessToken,
            profile: profileData,
            authenticationToken: authToken?.tokenString
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

    func getCurrentUser(completion: @escaping (Result<[String: Any]?, Error>) -> Void) {
        DispatchQueue.main.async {
            if let accessToken = AccessToken.current {
                let response: [String: Any] = [
                    "accessToken": [
                        "applicationID": accessToken.appID,
                        "declinedPermissions": accessToken.declinedPermissions.map { $0.name },
                        "expirationDate": accessToken.expirationDate,
                        "isExpired": accessToken.isExpired,
                        "refreshDate": accessToken.refreshDate,
                        "permissions": accessToken.permissions.map { $0.name },
                        "tokenString": accessToken.tokenString,
                        "userID": accessToken.userID
                    ],
                    "profile": [:]
                ]
                completion(.success(response))
            } else {
                completion(.success(nil))
            }
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
