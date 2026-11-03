import XCTest
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
}
