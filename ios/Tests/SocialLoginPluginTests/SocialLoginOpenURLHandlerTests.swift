import XCTest
import UIKit
@testable import SocialLoginPlugin

class SocialLoginOpenURLHandlerTests: XCTestCase {
    func testParseOpenURLNotificationReturnsURLAndOptions() {
        let url = URL(string: "com.googleusercontent.apps.test:/oauth2callback")!
        let options: [UIApplication.OpenURLOptionsKey: Any] = [.sourceApplication: "com.apple Safari"]
        let notification = Notification(
            name: .capacitorOpenURL,
            object: [
                "url": url,
                "options": options
            ]
        )

        let parsed = SocialLoginOpenURLHandler.parseOpenURLNotification(notification)

        XCTAssertEqual(parsed?.url, url)
        XCTAssertEqual(parsed?.options[.sourceApplication] as? String, "com.apple Safari")
    }

    func testParseOpenURLNotificationReturnsNilWhenPayloadMissingURL() {
        let notification = Notification(name: .capacitorOpenURL, object: ["options": [:]] as [String: Any])

        XCTAssertNil(SocialLoginOpenURLHandler.parseOpenURLNotification(notification))
    }

    func testParseUniversalLinkNotificationReturnsURL() {
        let url = URL(string: "https://www.facebook.com/connect/login_success.html")!
        let notification = Notification(name: .capacitorOpenUniversalLink, object: ["url": url])

        XCTAssertEqual(SocialLoginOpenURLHandler.parseUniversalLinkNotification(notification), url)
    }

    func testParseUniversalLinkNotificationReturnsNilWhenPayloadMissingURL() {
        let notification = Notification(name: .capacitorOpenUniversalLink, object: [:] as [String: Any])

        XCTAssertNil(SocialLoginOpenURLHandler.parseUniversalLinkNotification(notification))
    }
    func testIsLikelyFacebookOpenURLAcceptsFacebookSchemesAndHosts() {
        XCTAssertTrue(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "fb123456789://authorize")!))
        XCTAssertTrue(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "https://www.facebook.com/connect/login_success.html")!))
        XCTAssertTrue(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "https://fb.me/abc")!))
    }

    func testIsLikelyFacebookOpenURLRejectsUnrelatedURLs() {
        XCTAssertFalse(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "com.googleusercontent.apps.test:/oauth2callback")!))
        XCTAssertFalse(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "https://example.com/oauth")!))
        XCTAssertFalse(SocialLoginOpenURLHandler.isLikelyFacebookOpenURL(URL(string: "myapp://callback")!))
    }

    func testShouldDeliverURLToFacebookSDKAcceptsFacebookSchemesAndHosts() {
        XCTAssertTrue(SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(URL(string: "fb123456789://authorize")!))
        XCTAssertTrue(
            SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(
                URL(string: "https://www.facebook.com/connect/login_success.html")!
            )
        )
    }

    func testShouldDeliverURLToFacebookSDKRejectsUnrelatedOAuthURLs() {
        XCTAssertFalse(
            SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(
                URL(string: "com.googleusercontent.apps.test:/oauth2callback?code=secret")!
            )
        )
        XCTAssertFalse(SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(URL(string: "https://example.com/oauth?code=secret")!))
    }

    func testShouldDeliverURLToFacebookSDKRejectsAppLinkMarkerOnUntrustedURL() {
        // Regression: al_applink_data must not unlock delivery for unrelated schemes/hosts.
        XCTAssertFalse(
            SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(
                URL(string: "myapp://callback?code=secret&al_applink_data=%7B%7D")!
            )
        )
        XCTAssertFalse(
            SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(
                URL(string: "https://example.com/deeplink?al_applink_data=eyJ0ZXN0IjoidHJ1ZSJ9")!
            )
        )
        XCTAssertFalse(
            SocialLoginOpenURLHandler.shouldDeliverURLToFacebookSDK(
                URL(string: "myapp://callback#al_applink_data=%7B%7D")!
            )
        )
    }
}
