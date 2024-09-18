// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapgoCapacitorSocialLogin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "CapgoCapacitorSocialLogin",
            targets: ["SocialLoginPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"),
        // FBSDKCoreKit and FBSDKLoginKit
        .package(url: "https://github.com/facebook/facebook-ios-sdk.git", from: "9.3.0"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "7.0.0") // Add Google Sign-In dependency
    ],
    targets: [
        .target(
            name: "SocialLoginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "FacebookLogin", package: "facebook-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Sources/SocialLoginPlugin"),
        .testTarget(
            name: "SocialLoginPluginTests",
            dependencies: ["SocialLoginPlugin"],
            path: "ios/Tests/SocialLoginPluginTests")
    ]
)
