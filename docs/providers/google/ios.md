<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

# Google Login setup for iOS

## Introduction

In this guide, you will learn how to setup Google Login with Capgo Social Login for iOS.
I assume that you have already read the [general setup guide](./general.md).

## Using Google login on IOS

In this part, you will learn how to setup Google login in IOS

1. Please create an IOS client ID in the google console
   
   - Click on the search bar
     <Picture src="../../assets/google_cons_search.png" alt="Google Console search bar" />
   
   - Search for `credentials` and click on the `APIs and Services` one (number 2 on the screenshot)
     <Picture src="../../assets/google_cons_cred_search.png" alt="Search results showing credentials option with APIs and Services highlighted" />
   
   - Click on the `create credentials`
     <Picture src="../../assets/google_cons_create_cred.png" alt="Create credentials button in Google Console" />
   
   - Select `OAuth client ID`
     <Picture src="../../assets/google_cons_cred_oauth.png" alt="OAuth client ID option in credentials creation menu" />
   
   - Select the `Application type` to `IOS`
     <Picture src="../../assets/goolge_cons_cred_type_app_tye.png" alt="Application type selection with iOS option highlighted" />
   
   - Now, you need to find the bundle ID
     
     - Please open Xcode
     
     - Double click on `App`
       <Picture src="../../assets/xcode_app_click.png" alt="App target in Xcode project navigator" />
     
     - Ensure that you are on `Targets -> App`
       <Picture src="../../assets/xcode_targets_app.png" alt="Targets section in Xcode with App selected" />
     
     - Find your `Bundle Identifier` 
       <Picture src="../../assets/xcode_bundle_id.png" alt="Bundle Identifier field in Xcode project settings" />
     
     - Go back to the Google Console and paste your `Bundle Identifier` into `Bundle ID`
       <Picture src="../../assets/google_cons_ios_bd_id.png" alt="Bundle ID field in Google Console iOS client creation form" />
   
   - Now, you can add your `App Store ID` or `Team ID` into the client ID. This isn't necessary, but if you have published your app to App Store I recommend filling those fields
   
   - Additionally, you can setup [Firebase App Check](https://developers.google.com/identity/sign-in/ios/appcheck). This is outside the scope of this tutorial
   
   - After filling all the details, please click `create`
     <Picture src="../../assets/google_cons_ios_cred_creat.png" alt="Create button at bottom of iOS client creation form" />
   
   - You now want to click `ok`
     <Picture src="../../assets/google_cons_ios_click_ok.png" alt="OK button on client ID created confirmation dialog" />
   
   - Open the newly created IOS client
     <Picture src="../../assets/google_cons_open_new_ios.png" alt="Newly created iOS client in credentials list" />
   
   - Copy the following data
     <Picture src="../../assets/google_cons_ios_what_to_copy.png" alt="Client ID details showing Client ID and reversed client ID to copy" />
     
     The `nr. 1` in this image will later become the `iOSClientId` in the `initialize` call
     The `nr. 2` in this image will later become `YOUR_DOT_REVERSED_IOS_CLIENT_ID`

2. Now, you need to modify your app's plist.
   
   - Please open Xcode and find the `Info` file
     <Picture src="../../assets/xcode_info_file.png" alt="Info.plist file in Xcode project navigator" />
   
   - Now, you want to right click this file and open it as source code
     <Picture src="../../assets/xcode_open_as_src_code.png" alt="Right-click menu showing Open As Source Code option" />
   
   - At the bottom of your `Plist` file, you will see a `</dict>` tag.
     <Picture src="../../assets/xcode_dict_tag.png" alt="Closing dict tag in Info.plist file" />
   
   - You want to insert the following fragment just before it, just like this
     <Picture src="../../assets/xcode_plist_inserted.png" alt="Info.plist with URL schemes code inserted before closing dict tag" />
     
     ```xml
     <key>CFBundleURLTypes</key>
     <array>
      <dict>
        <key>CFBundleURLSchemes</key>
        <array>
          <string>YOUR_DOT_REVERSED_IOS_CLIENT_ID</string>
        </array>
      </dict>
     </array>
     ```
   
   - Now, you want to change the `YOUR_DOT_REVERSED_IOS_CLIENT_ID` to the value copied in the previous step
     
     You want it to look like this:
     <Picture src="../../assets/xcode_plist_final.png" alt="Info.plist with actual reversed client ID inserted in URL schemes" />
     
     **WARNING:** Ensure that this value **STARTS** with `com.googleusercontent.apps`
   
   - Save the file with `Command + S`

3. Modify the `AppDelegate`
   Although not strictly required, it's recommended by Google.
   
   - Open the AppDelegate
     <Picture src="../../assets/xcode_app_deleg.png" alt="AppDelegate.swift file in Xcode project navigator" />
   
   - Insert `import GoogleSignIn` before the first line
     <Picture src="../../assets/xcode_app_deleg_google_sign_in.png" alt="AppDelegate.swift with GoogleSignIn import added" />
   
   - Find the `func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:])` function. It should look like this
     <Picture src="../../assets/xcode_app_deleg_app_fn.png" alt="Original application openURL function in AppDelegate" />
   
   - Modify the function to look like this
     
     ```swift
     func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
         // Called when the app was launched with a url. Feel free to add additional processing here,
         // but if you want the App API to support tracking app url opens, make sure to keep this call
     
         var handled: Bool
     
         handled = GIDSignIn.sharedInstance.handle(url)
         if handled {
           return true
         }
     
         return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
     }
     ```
     
     <Picture src="../../assets/xcode_app_deleg_app_fn_mod.png" alt="Modified application openURL function with GoogleSignIn handling" />
   
   - Save the file with `Command + S`

4. Now, you should be ready to setup Google login in JS.
   
   - First, you need import `SocialLogin` AND `Capacitor`
     
     ```typescript
     import { SocialLogin } from '@capgo/capacitor-social-login';
     import { Capacitor } from '@capacitor/core';
     ```
   
   - Then, you want to call initialize. I recommend calling this ONLY once.
     
     ```ts
     // onMounted is Vue specific
     onMounted(() => {
       SocialLogin.initialize({
         google: {
           iOSClientId: '673324426943-redacted.apps.googleusercontent.com',
         }
       })
     })
     ```
     
     **WARNING:** Ensure that `iOSClientId` **ENDS** with `googleusercontent.com`
   
   - Later, you want to call `SocialLogin.login`. I recommend creating a button and running the following code on click.
     
     ```ts
     const res = await SocialLogin.login({
       provider: 'google',
       options: {}
     })
     // handle the response. popoutStore is specific to my app
     popoutStore.popout("Google login", JSON.stringify(response))
     ```

5. Next, you want to build your app and run `cap sync`. If you done everything correctly, you should see the following
   <Picture src="../../assets/google_final_ios_v2.gif" alt="Demo of Google login flow on iOS showing sign-in process and successful authentication" />
   
> [!NOTE]
> PS: Please pardon the polish language in the google prompt. I don't know how to change it.


