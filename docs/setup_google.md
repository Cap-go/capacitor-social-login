# Capgo Social Login "Google login" guide

### Introduction

In this guide, you will learn how to setup Google Login with Capgo Social Login. You will need the following in order to setup Google Login:

- A Google account

Please note, that unlike the Apple guide, this guide will NOT help you setup backend. Please use the `getAuthorizationCode` function to get the `JWT` and send it to your server.

### General setup

This step is required regardless of which the platform you decide to use. In this part, you will setup the login screen displayed by Google. 

1. Please go to [console.cloud.google.com](https://console.cloud.google.com/)

2. If you don't have a project already, please **create a new project**.
   
   - Click on the project selector
     ![](./assets/google_cons_project_selector.png)
   
   - Click `New project`
     ![](./assets/google_cons_new_project_btn.png)
   
   - Name your project and click `Create`
     ![](./assets/google_cons_name_projec.png)
   
   - Ensure that you are on the right project
     ![](./assets/google_cons_right_proj.png)

3. Configure the  `OAuth consent screen`
   
   - Click on the search bar
     ![](./assets/google_cons_search.png)
   
   - Search for `OAuth consent screen` and click on it
     ![](./assets/google_cons_search_2.png)
   
   - Configure the consent screen. I will assume that you are developing an app open to the public, so I will use the  `external`  user type. Please select the user type that suits you the best AND click `create`
     ![](./assets/google_cons_oauth_const_scr.png)
   
   - Now, I you have a lot of informations to fill
     
     - Let's start with the `App Information`
       ![](./assets/google_cons_app_inf.png)
       Please type in your `App Name`. **WARNING: THIS WILL BE DISPLAYED TO THE USERS**
       
       Next, please enter the User support email. You can learn more about the support email [here]([Setting up your OAuth consent screen - Google Cloud Platform Console Help](https://support.google.com/cloud/answer/10311615#user-support-email&zippy=%2Cuser-support-email))
     
     - Then, you **CAN** add the app logo. This is not obligatory and I will skip this step
       ![](./assets/google_cons_app_logo.png)
     
     - Then, you **SHOULD** configure the `App domain`. I will not do that because this is just a simple demonstration that will **NOT** get published, but I strongly recommend filling this section.
       ![](./assets/google_cons_app_doma.png)
     
     - Later, you **HAVE TO** provide the developer's email.
       ![](./assets/google_cons_dev_cont_inf.png)
   
   - Please click `save and continue`
     ![](./assets/google_cons_cons_sav_cont.png)

4. Next, please configure the scopes
- **Warning**: In the current stage, this plugin **DOES NOT** support custom scopes for Google. Please add **ONLY** the scopes shown in this tutorial

- Click on `add or remove scopes` 
  ![](./assets/google_cons_add_rm_sco.png)

- Select the following scopes and click `update`
  ![](./assets/google_cons_update_scope.png)

- Click `save and continue`
  ![](./assets/google_cons_scope_save.png)
5. Now, you need to add a test user.
   
   - Click on `add users`
     ![](./assets/google_cons_add_test_usr.png)
   
   - Enter your Google email, click enter, and click `add`
     ![](./assets/google_cons_add_test_usr_2.png)
   
   - Click `save and continue`
     ![](./assets/google_cons_test_usr_save.png)

6. Click `back to dashboard`
   ![](./assets/google_cons_back_to_dahs.png)

7. I strongly recommend submitting you app for verification. This is outside the scope of this tutorial. You can learn more [here](https://support.google.com/cloud/answer/13463073)

### Using Google login on IOS

In this part, you will learn how to setup Google login in IOS

1. Please create an IOS client ID in the google console
   
   - Click on the search bar
     ![](./assets/google_cons_search.png)
   
   - Search for `credentials` and click on the `APIs and Services` one (number 2 on the screenshot)
     ![](./assets/google_cons_cred_search.png)
   
   - Click on the `create credentials`
     ![](./assets/google_cons_create_cred.png)
   
   - Select `OAuth client ID`
     ![](./assets/google_cons_cred_oauth.png)
   
   - Select the `Application type` to `IOS`
     ![](./assets/goolge_cons_cred_type_app_tye.png)
   
   - Now, you need to find the bundle ID
     
     - Please open Xcode
     
     - Double click on `App`
       ![](./assets/xcode_app_click.png)
     
     - Ensure that you are on `Targets -> App`
       ![](./assets/xcode_targets_app.png)
     
     - Find your `Bundle Identifier` 
       ![](./assets/xcode_bundle_id.png)
     
     - Go back to the Google Console and paste your `Bundle Identifier` into `Bundle ID`
       ![](./assets/google_cons_ios_bd_id.png)
   
   - Now, you can add your `App Store ID` or `Team ID` into the client ID. This isn't necessary, but if you have published your app to App Store I recommend filling those fields
   
   - Additionally, you can setup [Firebase App Check](https://developers.google.com/identity/sign-in/ios/appcheck). This is outside the scope of this tutorial
   
   - After filling all the details, please click `create`
     ![](./assets/google_cons_ios_cred_creat.png)
   
   - You now want to download the plist. Please save it in a safe place. You will need it shortly
     ![](./assets/google_cons_ios_down_plist.png)

2- Now, you need to modify your app's plist.

- Please open Xcode and find the `Info` file
  ![](./assets/xcode_info_file.png)

- Now, you want to right click this file and open it as source code
  ![](./assets/xcode_open_as_src_code.png)

- Now, you want to open the downloaded plist file in a separate text editor.

- In this separate file editor, you want to copy the highlighted fragment
  ![](./assets/kate_plist.png)

- Now, come back to Xcode. At the bottom of your `Plist` file, you will see a `</dict>` tag.
  ![](./assets/xcode_dict_tag.png)

- You want to insert the copied fragment just before it, just like this
  ![](./assets/xcode_plist_inserted.png)

- Now, you want to add the following code at the bottom of the plist
  
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
  
  You want it to look like this:
  ![](./assets/xcode_plist_url_scheme.png)

- Now, you want to copy the value of `REVERSED_CLIENT_ID` from above. Copy the text in between the `string` tag under the `REVERSED_CLIENT_ID`
  ![](./assets/xcode_plist_what_to_copy.png)

- Next, please replace the `YOUR_DOT_REVERSED_IOS_CLIENT_ID` with the text that you copied
  ![](./assets/xcode_plist_where_to_paste.png)

- Next, please remove the `REVERSED_CLIENT_ID` and the `string` tag below it. The final plist should look like this:
  ![](./assets/xcode_final_list.png)

- Save the file with `Command + S`

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
     onMounted(async () => {
       await SocialLogin.initialize({
         google: {
           iOSClientId: '673324426943-redacted.apps.googleusercontent.com',
         }
       })
     })
     ```
   
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
   ![](./assets/google_final_ios_v2.gif)
   
   PS: Please pardon the polish language in the google prompt. I don't know how to change it.



### Using Google login on Android

In this part, you will learn how to setup Google login in Android

1. Please create an Android client ID. You can find the details where to create a client ID in the first point of the IOS section
   
   - Select the `Android` application type
     ![](./assets/google_cons_app_type_android.png)
   
   - Open Android Studio
   
   - At the very bottom of the navigator, find the `Gradle Scripts`
     ![](./assets/studio_gradle_scripts.png)
   
   - Find `build.gradle` for the module `app`
     ![](./assets/studio_build_gradle.png)
   
   - Copy the `android.defaultConfig.applicationId`. This will be your `package name` in the Google console
     ![](./assets/studio_build_gradle_app_id.png)
   
   - Now, open the terminal. Make sure that you are in the `android` folder of your app and run `./gradlew signInReport`
     ![](./assets/term_sign_report.png)
   
   - Before continuing, I **MUST** warn you. The Android SHA1 certificate is beyond painful and I wouldn't wish it on anyone to have to set this up. I will assume the simplest scenario of an app that isn't published to Google Play Store and that is only ever used on a local simulator. If, however, you have deployed your app to Google Play Store, you **MUST** use the SHA1 from google PLAY console for production releases.
    Finally, it's important to mention that if you mess up, the error will NOT be obvious. It may be very difficult to debug. If you struggle with the setup, please look at the [Github issues](https://github.com/Cap-go/capacitor-social-login/issues).
   
   - The SHA1 certificate fingerprint is crucial for Android app security and authentication. Google uses it to verify your app's identity when making API calls. This is why:

     1. It ensures only your app can use your Google API credentials.
     2. It prevents unauthorized use of your Google services.
     3. It's required for certain Google APIs, including Google Sign-In.

   - Now, scroll to the top of this command. You should see the following. Copy the `SHA1`.![](./assets/term_sign_report_res.png)
   
   - Now, go back to the Google Console. Enter your `applicationId` as the `Package Name` and your SHA1 in the certificate field and click `create`
     ![](./assets/google_cons_creat_android_client.png)

2. Create a web client (this is required for Android)

   - Go to the "Create credentials" page in Google Console
   
   - Set application type to "Web"
     ![](./assets/google_cons_app_type_web.png)
   
   - Click "Create"
     ![](./assets/google_cons_web_app_create.png)
   
   - Copy the client ID, you'll use this as the `androidClientId` in your JS/TS code
     ![](./assets/google_cons_copy_web_client_id.png)

3. Now, you SHOULD be ready to use the login. Here is how you use it from typescript.
   
   - First, you need import `SocialLogin` AND `Capacitor`
     
     ```typescript
     import { SocialLogin } from '@capgo/capacitor-social-login';
     import { Capacitor } from '@capacitor/core';
     ```
   
   - Then, you want to call initialize. I recommend calling this ONLY once.
     
     ```ts
     // onMounted is Vue specific
     // androidClientId is the client ID you got in the web client creation step not the android client ID.
     onMounted(async () => {
       await SocialLogin.initialize({
         google: {
           androidClientId: '673324426943-avl4v9ubdas7a0u7igf7in03pdj1dkmg.apps.googleusercontent.com',
         }
       })
     })
     ```
     
     Later, you want to call `SocialLogin.login`. I recommend creating a button and running the following code on click.
     
     ```ts
     const res = await SocialLogin.login({
       provider: 'google',
       options: {}
     })
     // handle the response. popoutStore is specific to my app
     popoutStore.popout("Google login", JSON.stringify(response))
     ```

4- Before continuing, please ensure that you either use a physical device that supports Google Play Services or that you configure the emulator correctly. I will be using the emulator. Not every emulator will work with Google Login, so I will show you how to set one up
   
   - First, go into `Device manager` and click the plus button
     ![](./assets/studio_device_man.png)
   
   - Create a virtual device
     ![](./assets/studio_create_virt_dev.png)
   
   - Select any device with a `Play Store` icon
     ![](./assets/studio_new_dev_select_hardware.png)
     
     As you can see, the `pixel 8` supports the `Play Store` services
   
   - Click `next`
     ![](./assets/studio_new_dev_next_1.png)
   
   - Next, **MAKE SURE** that the OS image is of type `Google Play`. **IT MUST** be of type `Google Play`
     ![](./assets/studio_new_dev_google_play_dev_type.png)
   
   - Click next
     ![](./assets/studio_new_dev_next_1.png)
   
   - Confirm your device. I will name my emulator `Tutorial phone`
     ![](./assets/studio_new_dev_next_3.png)
   
   - Next, go into `Device Manager` and boot up your simulator
     ![](./assets/studio_dev_manager.png)
   
   - After the simulator boots up, please go into it's settings
     ![](./assets/emul_and_settings_1.png)
   
   - Now, go into `Google Play`
     ![](./assets/emul_and_settings_2.png)
   
   - Click `Update` and wait about 60 seconds
     ![](./assets/emul_and_settings_update_play_store.png)
