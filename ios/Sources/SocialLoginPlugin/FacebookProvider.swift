import Foundation
import UIKit

#if canImport(FBSDKLoginKit)
import FBSDKLoginKit
#endif

#if canImport(AppTrackingTransparency)
import AppTrackingTransparency
#endif

struct FacebookLoginResponse {
    let accessToken: [String: Any]
    let profile: [String: Any]
    let idToken: String?
}

#if canImport(FBSDKLoginKit)
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

    func getProfile(fields: [String], completion: @escaping (Result<[String: Any]?, Error>) -> Void) {
        guard let accessToken = AccessToken.current else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "You're not logged in. Please login first to obtain an access token and try again."])))
            return
        }

        if accessToken.isExpired {
            completion(.failure(NSError(domain: "FacebookProvider", code: 1, userInfo: [NSLocalizedDescriptionKey: "AccessToken is expired"])))
            return
        }

        let parameters = ["fields": fields.joined(separator: ",")]
        let graphRequest = GraphRequest.init(graphPath: "me", parameters: parameters)

        graphRequest.start { (_ connection, _ result, _ error) in
            if let error = error {
                completion(.failure(error))
                return
            }

            return completion(.success(result as? [String: Any]))
        }
    }

    func isLoggedIn() -> Bool {
        return AccessToken.current != nil
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
                case .success:
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

    func requestTracking(completion: @escaping (Result<String, Error>) -> Void) {
        #if canImport(AppTrackingTransparency)
        if #available(iOS 14, *) {
            DispatchQueue.main.async {
                ATTrackingManager.requestTrackingAuthorization { status in
                    let statusString: String
                    switch status {
                    case .authorized:
                        statusString = "authorized"
                    case .denied:
                        statusString = "denied"
                    case .notDetermined:
                        statusString = "notDetermined"
                    case .restricted:
                        statusString = "restricted"
                    @unknown default:
                        statusString = "notDetermined"
                    }
                    completion(.success(statusString))
                }
            }
        } else {
            completion(.success("notDetermined"))
        }
        #else
        completion(.success("notDetermined"))
        #endif
    }

    func refresh(viewController: UIViewController?, completion: @escaping (Result<SocialLoginUser, Error>) -> Void) {
        guard let viewController = viewController else {
            completion(.failure(NSError(domain: "FacebookProvider", code: 1, userInfo: [NSLocalizedDescriptionKey: "viewController was not provided"])))
            return
        }
        DispatchQueue.main.async {
            if let token = AccessToken.current, !token.isExpired, !token.isDataAccessExpired {
                // let expiresIn = Int(token.expirationDate.timeIntervalSinceNow)
                completion(.success(SocialLoginUser(accessToken: token.tokenString, idToken: nil, refreshToken: nil, expiresIn: nil)))
            } else {
                self.loginManager.reauthorizeDataAccess(from: viewController) { loginResult, error in
                    if let token = loginResult?.token {
                        completion(.success(SocialLoginUser(accessToken: token.tokenString, idToken: nil, refreshToken: nil, expiresIn: nil)))
                    } else {
                        completion(.failure(error ?? NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "Reauthorization failed"])))
                    }
                }
            }
        }
    }

    func getAuthorizationCode(completion: @escaping (Result<(accessToken: String?, jwt: String?), Error>) -> Void) {
        // First check if access token exists and is not expired
        if let accessToken = AccessToken.current, !accessToken.isExpired {
            // User is connected with access token, return it
            completion(.success((accessToken: accessToken.tokenString, jwt: nil)))
        } else if let authToken = AuthenticationToken.current, !authToken.tokenString.isEmpty {
            // Access token not found but idToken (JWT) is available, return JWT
            completion(.success((accessToken: nil, jwt: authToken.tokenString)))
        } else {
            // Neither access token nor idToken available
            completion(.failure(NSError(domain: "FacebookProvider", code: 0, userInfo: [NSLocalizedDescriptionKey: "No Facebook authorization code available"])))
        }
    }
}
#else
// Stub class when FBSDKLoginKit is not available
class FacebookProvider {
    func initialize() {
        fatalError("Facebook Login is not available. Include FBSDKLoginKit dependency in your Podfile.")
    }

    func getProfile(fields: [String], completion: @escaping (Result<[String: Any]?, Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }

    func isLoggedIn() -> Bool {
        return false
    }

    func login(payload: [String: Any], completion: @escaping (Result<FacebookLoginResponse, Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }

    func logout(completion: @escaping (Result<Void, Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }

    func refresh(viewController: UIViewController?, completion: @escaping (Result<SocialLoginUser, Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }

    func getAuthorizationCode(completion: @escaping (Result<(accessToken: String?, jwt: String?), Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }

    func requestTracking(completion: @escaping (Result<String, Error>) -> Void) {
        completion(.failure(NSError(domain: "FacebookProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "Facebook Login is not available"])))
    }
}
#endif
