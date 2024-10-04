import Foundation

#if canImport(FBSDKLoginKit)
import FBSDKLoginKit
#else
import FacebookLogin
#endif

struct FacebookLoginResponse {
    let accessToken: [String: Any]
    let profile: [String: Any]
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

        DispatchQueue.main.async {
            self.loginManager.logIn(permissions: permissions, from: nil) { result, error in
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
                    accessToken: [
                        "applicationID": accessToken?.appID ?? "",
                        "declinedPermissions": accessToken?.declinedPermissions.map { $0.name } ?? [],
                        "expirationDate": accessToken?.expirationDate ?? Date(),
                        "isExpired": accessToken?.isExpired ?? false,
                        "refreshDate": accessToken?.refreshDate ?? Date(),
                        "permissions": accessToken?.permissions.map { $0.name } ?? [],
                        "tokenString": accessToken?.tokenString ?? "",
                        "userID": accessToken?.userID ?? ""
                    ],
                    profile: [:]
                )

                completion(.success(response))
            }
        }
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        loginManager.logOut()
        completion(.success(()))
    }

    func getCurrentUser(completion: @escaping (Result<[String: Any]?, Error>) -> Void) {
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
