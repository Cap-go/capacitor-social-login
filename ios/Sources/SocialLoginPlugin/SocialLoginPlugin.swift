import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(SocialLoginPlugin)
public class SocialLoginPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SocialLoginPlugin"
    public let jsName = "SocialLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise)
    ]
    private let implementation = SocialLogin()

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
}
