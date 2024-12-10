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
        .package(url: "https://github.com/facebook/facebook-ios-sdk.git", .upToNextMajor(from: "17.4.0")),
        // Add Google Sign-In dependency
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", .upToNextMajor(from: "8.0.0")),
        // Alamofire
        .package(url: "https://github.com/Alamofire/Alamofire.git", .upToNextMajor(from: "5.9.1"))
    ],
    targets: [
        .target(
            name: "SocialLoginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "FacebookCore", package: "facebook-ios-sdk"),
                .product(name: "FacebookLogin", package: "facebook-ios-sdk"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS"),
                .product(name: "Alamofire", package: "Alamofire")
            ],
            path: "ios/Sources/SocialLoginPlugin"),
        .testTarget(
            name: "SocialLoginPluginTests",
            dependencies: ["SocialLoginPlugin"],
            path: "ios/Tests/SocialLoginPluginTests")
    ]
)
