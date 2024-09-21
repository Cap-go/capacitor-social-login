import Foundation
import AuthenticationServices
import Alamofire

struct AppleProviderResponse {
//    let user: String
    let identityToken: String
}

// Define the Decodable structs for the response
struct TokenResponse: Decodable {
    let access_token: String?
    let expires_in: Int?
    let refresh_token: String?
    let id_token: String?
}

// Define the custom error enum
enum AppleProviderError: Error {
    case userDataSerializationError
    case responseError(Error)
    case invalidResponseCode(statusCode: Int)
    case jsonParsingError
    case specificJsonWritingError(Error)
    case noLocationHeader
    case pathComponentsNotFound
    case successPathComponentNotProvided
    case backendDidNotReturnSuccess(successValue: String)
    case missingAccessToken
    case missingExpiresIn
    case missingRefreshToken
    case missingIdToken
    case missingUserId
    case unknownError
    case invalidIdToken
}

// Implement LocalizedError for AppleProviderError
extension AppleProviderError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .userDataSerializationError:
            return NSLocalizedString("Error converting user data to JSON string.", comment: "")
        case .responseError(let error):
            return NSLocalizedString("Response error: \(error.localizedDescription)", comment: "")
        case .invalidResponseCode(let statusCode):
            return NSLocalizedString("Invalid response code: \(statusCode).", comment: "")
        case .noLocationHeader:
            return NSLocalizedString("No Location header found in the redirect response.", comment: "")
        case .pathComponentsNotFound:
            return NSLocalizedString("Path components not found.", comment: "")
        case .successPathComponentNotProvided:
            return NSLocalizedString("Success path component not provided.", comment: "")
        case .backendDidNotReturnSuccess(let successValue):
            return NSLocalizedString("Backend did not return success=true, it returned success=\(successValue).", comment: "")
        case .jsonParsingError:
            return NSLocalizedString("Error parsing JSON response.", comment: "")
        case .specificJsonWritingError(let error):
            return NSLocalizedString("Error writing JSON. Error: \(error)", comment: "")
        case .unknownError:
            return NSLocalizedString("An unknown error occurred.", comment: "")
        case .missingAccessToken:
            return NSLocalizedString("Access token not found in response.", comment: "")
        case .missingExpiresIn:
            return NSLocalizedString("ExpiresIn not found in response.", comment: "")
        case .missingRefreshToken:
            return NSLocalizedString("Refresh token not found in response.", comment: "")
        case .missingIdToken:
            return NSLocalizedString("ID token not found in response.", comment: "")
        case .missingUserId:
            return NSLocalizedString("User ID not found in ID token.", comment: "")
        case .invalidIdToken:
            return NSLocalizedString("Invalid ID token format.", comment: "")
        }
    }
}

class AppleProvider: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private var clientId: String?
    private var completion: ((Result<AppleProviderResponse, Error>) -> Void)?
    
    // Instance variables
    var idToken: String?
    var refreshToken: String?
    var accessToken: String?
    
    private let TOKEN_URL = "https://appleid.apple.com/auth/token"
    private let SHARED_PREFERENCE_NAME = "AppleProviderSharedPrefs_0eda2642"
    
    func initialize(clientId: String) {
        self.clientId = clientId
        
        do {
            try retrieveState()
        } catch {
            print("retrieveState error: \(error)")
        }
    }
    
    func persistState(idToken: String, refreshToken: String, accessToken: String) throws {
        // Create a dictionary to represent the JSON object
        let object: [String: String] = [
            "idToken": idToken,
            "refreshToken": refreshToken,
            "accessToken": accessToken
        ]

        // Assign to instance variables
        self.idToken = idToken
        self.refreshToken = refreshToken
        self.accessToken = accessToken

        // Convert the object to JSON data
        let jsonData = try JSONSerialization.data(withJSONObject: object, options: [])

        // Convert JSON data to a string for logging
        if let jsonString = String(data: jsonData, encoding: .utf8) {
            // Log the object
            print("Apple persistState: \(jsonString)")

            // Save the JSON string to UserDefaults or use your helper method
            UserDefaults.standard.set(jsonString, forKey: SHARED_PREFERENCE_NAME)
        } else {
            print("Error converting JSON data to String")
        }
    }
    
    func retrieveState() throws {
        // Retrieve the JSON string from persistent storage
        guard let jsonString = UserDefaults.standard.string(forKey: SHARED_PREFERENCE_NAME) else {
            print("No saved state found")
            return
        }

        // Convert JSON string to Data
        guard let jsonData = jsonString.data(using: .utf8) else {
            print("Error converting JSON string to Data")
            return
        }

        // Parse the JSON data
        guard let object = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: String] else {
            print("Error parsing JSON data")
            return
        }

        // Extract tokens
        guard let idToken = object["idToken"],
              let refreshToken = object["refreshToken"],
              let accessToken = object["accessToken"] else {
            print("Error: Missing tokens in retrieved data")
            return
        }

        // Assign to instance variables
        self.idToken = idToken
        self.refreshToken = refreshToken
        self.accessToken = accessToken

        // Log the retrieved object
        print("Apple retrieveState: \(object)")
    }
    
    func login(payload: [String: Any], completion: @escaping (Result<AppleProviderResponse, Error>) -> Void) {
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
        if (self.idToken == nil || ((self.idToken?.isEmpty) == true) || self.refreshToken == nil || ((self.refreshToken?.isEmpty) == true) || self.accessToken == nil || self.accessToken == nil || ((self.accessToken?.isEmpty) == true)) {
            
            completion(.failure(NSError(domain: "AppleProvider", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not logged in; Cannot logout"])))
            return;
        }
        
        self.idToken = nil
        self.refreshToken = nil
        self.accessToken = nil
        
        UserDefaults.standard.removeObject(forKey: SHARED_PREFERENCE_NAME)
        completion(.success(()))
        return
    }
    
    func getCurrentUser(completion: @escaping (Result<AppleProviderResponse?, Error>) -> Void) {
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
            
            
//            let response = AppleProviderResponse(
//                user: userIdentifier,
//                email: email,
//                givenName: fullName?.givenName,
//                familyName: fullName?.familyName,
//                identityToken: String(data: appleIDCredential.identityToken ?? Data(), encoding: .utf8) ?? "",
//                authorizationCode: String(data: appleIDCredential.authorizationCode ?? Data(), encoding: .utf8) ?? ""
//            )
            
            let errorCompletion: ((Result<AppleProviderResponse, AppleProviderError>) -> Void) = { result in
                do {
                    let finalResult = try result.get()
                    self.completion?(.success(finalResult))
                } catch {
                    self.completion?(.failure(error))
                }
            }
            
            let authorizationCode = String(data: appleIDCredential.authorizationCode ?? Data(), encoding: .utf8) ?? ""
            let identityToken = String(data: appleIDCredential.identityToken ?? Data(), encoding: .utf8) ?? ""
            let firstName = fullName?.givenName ?? "Jhon"
            let lastName = fullName?.familyName ?? "Doe"
            
            if let _ = fullName?.givenName {
                sendRequest(code: authorizationCode, identityToken: identityToken, email: email ?? "", firstName: firstName, lastName: lastName, completion: errorCompletion, skipUser: false)
            } else {
                sendRequest(code: authorizationCode, identityToken: identityToken, email: email ?? "", firstName: firstName, lastName: lastName, completion: errorCompletion, skipUser: true)
            }
            
            // completion?(.success(response))
        }
    }
    
    // identityToken is the JWT generated by apple
    func sendRequest(
        code: String,
        identityToken: String,
        email: String,
        firstName: String,
        lastName: String,
        completion: @escaping ((Result<AppleProviderResponse, AppleProviderError>) -> Void),
        skipUser: Bool
    ) {
        let url = "https://appleloginvps.wcaleniewolny.me/login/callback"
        
        
        // Prepare the parameters
        var parameters: [String: String] = [
            "code": code,
        ]
        
        if (!skipUser) {
            let user: [String: Any] = [
                "email": email,
                "name": [
                    "firstName": firstName,
                    "lastName": lastName
                ]
            ]

            // Convert the user dictionary to a JSON string
            guard let userData = try? JSONSerialization.data(withJSONObject: user, options: []),
                  let userJSONString = String(data: userData, encoding: .utf8) else {
                print("Error converting user data to JSON string")
                return
            }
            
            parameters["user"] = userJSONString
        }

        // Send the POST request
        AF.request(
            url,
            method: .post,
            parameters: parameters,
            encoding: URLEncoding.default,
            headers: [ "ios-plugin-version": "0.0.0" ]
        )
            .redirect(using: Redirector(behavior: .doNotFollow))
            .response { response in
                // Access the HTTPURLResponse
                if let httpResponse = response.response {
                    print("Status Code: \(httpResponse.statusCode)")
                    
                    // Check if the response is a redirect
                    if (300...399).contains(httpResponse.statusCode) {
                        if let location = httpResponse.headers.value(for: "Location") {
                            print("Redirect Location: \(location)")
                            
                            // Parse the redirect URL
                            if let redirectURL = URL(string: location),
                               let urlComponents = URLComponents(url: redirectURL, resolvingAgainstBaseURL: false),
                               let pathComponents = urlComponents.queryItems {
                                
                                print("Query items: \(String(describing: urlComponents.queryItems))")
                                
                                // there are 4 main ways this can go:
                                // 1. it provides the "code" and we fetch apple servers in order to get the JWT (yuck)
                                // 2. It doesn't provide the code but it provides access_token, refresh_token, id_token
                                // 3. It doesn't provide a thing, reuse the JWT returned by internal apple login
                                // 4. it returns a fail
                                
                                guard let success = (pathComponents.filter { $0.name == "success" }.first?.value) else {
                                    completion(.failure(.successPathComponentNotProvided))
                                    return
                                }
                                
                                if (success != "true") {
                                    completion(.failure(.backendDidNotReturnSuccess(successValue: success)))
                                    return
                                }
                                
                                if let code = (pathComponents.filter { $0.name == "code" }.first?.value),
                                   let clientSecret = (pathComponents.filter { $0.name == "client_secret" }.first?.value) {
                                    
                                    self.exchangeCodeForTokens(clientSecret: clientSecret, code: code, completion: completion)
                                    return
                                }
                                
                                if let accessToken = (pathComponents.filter { $0.name == "access_token" }.first?.value),
                                   let refreshToken = (pathComponents.filter { $0.name == "refresh_token" }.first?.value),
                                   let idToken = (pathComponents.filter { $0.name == "id_token" }.first?.value) {
                                    
                                    do {
                                        try self.persistState(idToken: idToken, refreshToken: refreshToken, accessToken: accessToken)
                                        let appleResponse = AppleProviderResponse(identityToken: idToken)
                                        completion(.success(appleResponse))
                                        return
                                    } catch {
                                        completion(.failure(.specificJsonWritingError(error)))
                                        return
                                    }
                                }
                                
                                if (pathComponents.filter { $0.name == "ios_no_code" }).first != nil {
                                    // identityToken provided by apple
                                    let appleResponse = AppleProviderResponse(identityToken: identityToken)
                                    completion(.success(appleResponse))
                                    return
                                }
                                
                                
                            } else {
                                completion(.failure(.pathComponentsNotFound))
                                print("Path components not found")
                                return
                            }
                        } else {
                            completion(.failure(.noLocationHeader))
                            print("No Location header found in the redirect response")
                            return
                        }
                    } else {
                        // Handle non-redirect responses
                        if let data = response.data,
                           let responseString = String(data: data, encoding: .utf8) {
                            print("Response: \(responseString)")
                        } else {
                            print("No response data received")
                        }
                        
                        completion(.failure(.invalidResponseCode(statusCode: httpResponse.statusCode)))
                    }
                } else if let error = response.error {
                    completion(.failure(.responseError(error)))
                    print("Error: \(error)")
                }
            }
    }
    
    func exchangeCodeForTokens(clientSecret: String, code: String, completion: @escaping ((Result<AppleProviderResponse, AppleProviderError>) -> Void)) {
        // Prepare the parameters
        let parameters: [String: String] = [
            "client_id": Bundle.main.bundleIdentifier ?? "", //TODO: implement better handling when client_id = null
            "client_secret": clientSecret, // Implement this function to generate the client secret
            "code": code,
            "grant_type": "authorization_code"
        ]
        
        AF.request(
            TOKEN_URL,
            method: .post,
            parameters: parameters,
            encoder: URLEncodedFormParameterEncoder.default
        )
        .validate(statusCode: 200..<300) // Ensure the response status code is in the 200-299 range
        .responseDecodable(of: TokenResponse.self) { response in
            switch response.result {
            case .success(let tokenResponse):
                // Extract tokens from the response
                guard let accessToken = tokenResponse.access_token else {
                    completion(.failure(.missingAccessToken))
                    return
                }
                guard let expiresIn = tokenResponse.expires_in else {
                    completion(.failure(.missingExpiresIn))
                    return
                }
                guard let refreshToken = tokenResponse.refresh_token else {
                    completion(.failure(.missingRefreshToken))
                    return
                }
                guard let idToken = tokenResponse.id_token else {
                    completion(.failure(.missingIdToken))
                    return
                }

                // Decode the ID token to extract the user ID
                let idTokenParts = idToken.split(separator: ".")
                if idTokenParts.count >= 2 {
                    let encodedUserID = String(idTokenParts[1])

                    // Pad the base64 string if necessary
                    let remainder = encodedUserID.count % 4
                    var base64String = encodedUserID
                    if remainder > 0 {
                        base64String += String(repeating: "=", count: 4 - remainder)
                    }

                    // Decode the base64 string
                    if let decodedData = Data(base64Encoded: base64String, options: []),
                       let userData = try? JSONSerialization.jsonObject(with: decodedData, options: []) as? [String: Any],
                       let userId = userData["sub"] as? String {
                        // Create the response object
                        let appleResponse = AppleProviderResponse(identityToken: idToken)

                        // Log the tokens (replace with your logging mechanism)
                        print("Apple Access Token is: \(accessToken)")
                        print("Expires in: \(expiresIn)")
                        print("Refresh token: \(refreshToken)")
                        print("ID Token: \(idToken)")
                        print("Apple User ID: \(userId)")
                        
                        do {
                            try self.persistState(idToken: idToken, refreshToken: refreshToken, accessToken: accessToken)
                        } catch {
                            completion(.failure(.specificJsonWritingError(error)))
                        }

                        // Call the completion handler with the response
                        completion(.success(appleResponse))
                    } else {
                        completion(.failure(.missingUserId))
                    }
                } else {
                    completion(.failure(.invalidIdToken))
                }
            case .failure(let error):
                if let statusCode = response.response?.statusCode {
                    print("error", response.debugDescription)
                    completion(.failure(.invalidResponseCode(statusCode: statusCode)))
                } else {
                    completion(.failure(.responseError(error)))
                }
            }
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

