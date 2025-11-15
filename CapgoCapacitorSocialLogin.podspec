require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapgoCapacitorSocialLogin'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.exclude_files = '**/node_modules/**/*', '**/examples/**/*'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  # Provider dependencies (conditionally included via hook script)
  # Hook script modifies these lines based on capacitor.config.ts
  s.dependency 'FBSDKCoreKit', '18.0.0'
  s.dependency 'FBSDKLoginKit', '18.0.0'
  s.dependency 'GoogleSignIn', '~> 9.0.0'
  s.dependency 'Alamofire', '~> 5.10.2'
  s.swift_version = '5.1'
end
