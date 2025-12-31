# Consumer ProGuard rules for @capgo/capacitor-social-login
# These rules are automatically applied to apps that depend on this library

# Keep all plugin classes and their members
-keep class ee.forgr.capacitor.social.login.** { *; }
-keepclassmembers class ee.forgr.capacitor.social.login.** { *; }

# Keep inner classes (critical for OAuth2Provider config and token storage)
-keep class ee.forgr.capacitor.social.login.**$* { *; }

# Keep Activities for Intent resolution
-keep class ee.forgr.capacitor.social.login.*Activity { *; }

# Capacitor integration
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# OkHttp (used for OAuth2/Twitter token endpoints)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# JWT Decode library (used for Apple Sign-In)
-keep class com.auth0.android.jwt.** { *; }

# Google Sign-In (if included)
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-keep class androidx.credentials.** { *; }

# Facebook SDK (if included)
-keep class com.facebook.** { *; }

# CustomTabs for Apple Sign-In
-keep class androidx.browser.customtabs.** { *; }
