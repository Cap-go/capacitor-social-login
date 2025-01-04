# Capgo Social Login "Google login" guide

### Introduction

In this guide, you will learn how to setup Google Login with Capgo Social Login. You will need the following in order to setup Google Login:

- A Google account

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
   
   - Now, you have a lot of informations to fill
     
     - Let's start with the `App Information`
       ![](./assets/google_cons_app_inf.png)
       Please type in your `App Name`. **WARNING: THIS WILL BE DISPLAYED TO THE USERS**
       
       Next, please enter the User support email. You can learn more about the support email [here](https://support.google.com/cloud/answer/10311615#user-support-email&zippy=%2Cuser-support-email)
     
     - Then, you **CAN** add the app logo. This is not obligatory and I will skip this step
       ![](./assets/google_cons_app_logo.png)
     
     - Then, you **SHOULD** configure the `App domain`. I will not do that because this is just a simple demonstration that will **NOT** get published, but I strongly recommend filling this section.
       ![](./assets/google_cons_app_doma.png)
     
     - Later, you **HAVE TO** provide the developer's email.
       ![](./assets/google_cons_dev_cont_inf.png)
   
   - Please click `save and continue`
     ![](./assets/google_cons_cons_sav_cont.png)

4. Next, please configure the scopes
   
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
   
   - You now want to click `ok`![](./assets/google_cons_ios_click_ok.png)
   
   - Open the newly created IOS client
     ![](./assets/google_cons_open_new_ios.png)
   
   - Copy the following data
     ![](./assets/google_cons_ios_what_to_copy.png)
     
     The `nr. 1` in this image will later become the `iOSClientId` in the `initialize` call
     The `nr. 2` in this image will later become `YOUR_DOT_REVERSED_IOS_CLIENT_ID`

2. Now, you need to modify your app's plist.
   
   - Please open Xcode and find the `Info` file
     ![](./assets/xcode_info_file.png)
   
   - Now, you want to right click this file and open it as source code
     ![](./assets/xcode_open_as_src_code.png)
   
   - At the bottom of your `Plist` file, you will see a `</dict>` tag.
     ![](./assets/xcode_dict_tag.png)
   
   - You want to insert the following fragment just before it, just like this
     ![](./assets/xcode_plist_inserted.png)
     
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
     ![](./assets/xcode_plist_final.png)
     
     **WARNING:** Ensure that this value **STARTS** with `com.googleusercontent.apps`
   
   - Save the file with `Command + S`

3. Modify the `AppDelegate`
   Although not strictly required, it's recommended by Google.
   
   - Open the AppDelegate
     ![](./assets/xcode_app_deleg.png)
   
   - Insert `import GoogleSignIn` before the first line
     ![](./assets/xcode_app_deleg_google_sign_in.png)
   
   - Find the `func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:])` function. It should look like this
     ![](./assets/xcode_app_deleg_app_fn.png)
   
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
     
     ![](./assets/xcode_app_deleg_app_fn_mod.png)
   
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
   
   - Before continuing, I **MUST** warn you. The Android SHA1 certificate is beyond painful and I wouldn't wish it on anyone to have to set this up. I will assume the simplest scenario of an app that isn't published to Google Play Store and that is only ever used on a local simulator. If, however, you have deployed your app to Google Play Store, you **MUST** use the SHA1 from Google Play console for production releases.
     Finally, it's important to mention that if you mess up, the error will NOT be obvious. It may be very difficult to debug. If you struggle with the setup, please look at the [Github issues](https://github.com/Cap-go/capacitor-social-login/issues).
   
   - Now, scroll to the top of this command. You should see the following. Copy the `SHA1`.![](./assets/term_sign_report_res.png)
   
   - Now, go back to the Google Console. Enter your `applicationId` as the `Package Name` and your SHA1 in the certificate field and click `create`
     ![](./assets/google_cons_creat_android_client.png)

2. Create a web client (this is required for Android)
   
   - Go to the "Create credentials" page in Google Console
   
   - Set application type to "Web"
     ![](./assets/google_cons_app_type_web.png)
   
   - Click "Create"
     ![](./assets/google_cons_web_app_create.png)
   
   - Copy the client ID, you'll use this as the `webClientId` in your JS/TS code
     ![](./assets/google_cons_copy_web_client_id.png)

3. Now, you need to modify your `MainActivity`
   
   - Please open your app in Android Studio. You can run `cap open android`
   
   - Please find `MainActivity.java`
     
     - Open the `app` folder
       ![](./assets/studio_app_folder.png)
     
     - Find `java`
       ![](./assets/studio_app_java.png)
     
     - Find your `MainActivity.java` and click on it**![](./assets/studio_app_java_activity_main.png)
- Now, you have to modify `MainActivity.java`. Please add the following code
  
  ```java
  import ee.forgr.capacitor.social.login.GoogleProvider;
  import ee.forgr.capacitor.social.login.SocialLoginPlugin
  import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
  import android.content.Intent;
  
  // ModifiedMainActivityForSocialLoginPlugin is VERY VERY important !!!!!!    
  public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {}
  
        @Override
        public void onActivityResult(int requestCode, int resultCode, Intent data) {
          super.onActivityResult(requestCode, resultCode, data);
  
          if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
              Log.i("Google Activity Result", "SocialLogin login handle is null");
              return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
              Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
              return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
          }
        }
  
        // This function will never be called, leave it empty
        @Override
        public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
  }
  ```

- Please save the file
4. Now, you SHOULD be ready to use the login. Here is how you use it from typescript.
   
   - First, you need import `SocialLogin`
     
     ```typescript
     import { ScialLogin } from '@capgo/capacitor-social-login';
     ```
   
   - Then, you want to call initialize. I recommend calling this ONLY once.
     
     ```ts
     // onMounted is Vue specific
     // webClientId is the client ID you got in the web client creation step not the android client ID.
     onMounted(() => {
     SocialLogin.initialize({
       google: {
         webClientId: '673324426943-avl4v9ubdas7a0u7igf7in03pdj1dkmg.apps.googleusercontent.com',
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

5. Before continuing, please ensure that you either use a physical device that supports Google Play Services or that you configure the emulator correctly. I will be using the emulator. Not every emulator will work with Google Login, so I will show you how to set one up
   
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

6- If you did everything correctly, you should see the following

   ![](./assets/google_android_final_login_show.gif)

### Using Google login on the web

Using the google login on the web is rather simple.
In order to use it, you have to do the following:

1. Create a web client in the Google Console.
   
  - Please follow step 2 of the `Using Google login on Android` if you have not configured it already
2. Configure the web client in the Google Console

  - Please open the [credentials page](https://console.cloud.google.com/apis/credentials) and click on your web client
    ![](./assets/google_cons_open_web_client_id.png)

  - Now, please add the `Authorized JavaScript origins`. This should include all the addresses that you might use for your app. In might case, I will **ONLY** use localhost, but since I use a custom port I have to add both `http://localhost` and `http://localhost:5173`
    
    - Please click on `add URI`
      ![](./assets/google_cons_authorized_js_add_btn.png)
    
    - Please type your URL
      ![](./assets/google_cons_authorized_js_typed_url.png)
    
    - Please repeat until you added all the URLs
    
    - When you finish, your screen should look something like this
      ![](./assets/google_cons_authorized_js_final.png)

  - Now, please add some `Authorized redirect URIs`. This will depend on what page do you depend to use the CapacitorSocialLogin plugin on. In my case, I am going to be using it on `http://localhost:5173/auth` 
    
    - Please click on `ADD URI`
      ![](./assets/google_cons_web_add_redirect_url_1.png)
    
    - Enter your URL and click `ADD URL` again
      ![](./assets/google_cons_web_add_redirect_url_2.png)

  - Click `save`
    ![](./assets/google_cons_web_app_save.png)
3. Now, you should be ready to call `login` from JavaScript like so:
- First, you need import `SocialLogin`
  
  ```typescript
  import { ScialLogin } from '@capgo/capacitor-social-login';
  ```

- Then, you want to call initialize. I recommend calling this ONLY once.
  
  ```ts
  // onMounted is Vue specific
  // webClientId is the client ID you got in the web client creation step not the android client ID.
  onMounted(() => {
   SocialLogin.initialize({
     google: {
       webClientId: '673324426943-avl4v9ubdas7a0u7igf7in03pdj1dkmg.apps.googleusercontent.com',
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

### Differences between online access and offline access

|                         | Online access | Offline access |
|:-----------------------:|:-------------:|:--------------:|
| Requires a backend      | ❌             | ✅              |
| Long-lived access token | ❌             | ✅              |
| Easy setup              | ✅             | ❌              |

📝 Long lived access tokens allow the backend to call Google API's even when the user is not present

If you still do not know which one you should choose, please consider the following scenarios:

1. You want the user to login, immediately after you are going to issue him a custom JWT. Your app will NOT call Google APIs
   
   In this case, choose online access.

2. Your app will call some Google APIs from the client, but never from the backend
   
   In this case, choose online access

3. Your app will call some google APIs from the backend, but only when the user is actively using the app
   
   In this case, choose online access

4. Your app will periodically check the user's calendar, even when he is not actively using the app
   
   In this case, choose offline access

### An example backend for online access

In this part of the tutorial, I will show how to validate the user on your backend. 

This example will be very simple and it will be based on the following technologies:

- [Typescript](https://www.typescriptlang.org/)

- [Hono](https://hono.dev/)

- [Javascript's fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)

You can find the code for this example [here](https://github.com/WcaleNieWolny/capgo-social-login-backend-demo/blob/141c01d93a85240e31a0d488a89df13c842708b1/index.ts#L135-L153)

As you can see:

![](./assets/vscode_auth_google.png)

The idea is rather simple. You send a simple `GET` request to `https://www.googleapis.com/oauth2/v3/tokeninfo` and this returns you whether the token is valid or not and if it it is, it gives you the email of the user. It also gives you some other info about the user token
![](./assets/google_auth_playground_token_info.png)

For there, you could issue the user with your own JWT or issue some sort of session cookie. The possibilities are endless, for the final auth implementation.

If you do want to call Google API's, I would strongly recommend at [Google's OAuth 2.0 Playground](https://developers.google.com/oauthplayground). From there you can easily see what APIs you can call.

### Using online access with your own backend

In order to use online access you will need the following:

- An HTTP server

In this example, I will be using the following technologies to provide the offline access in my app:

- [Hono](https://hono.dev/)

- [Hono Zod validator](https://hono.dev/docs/guides/validation#with-zod)

- [Zod](https://zod.dev/)

- [Hono JWT](https://hono.dev/docs/helpers/jwt#jwt-authentication-helper)

- [LowDb](https://www.npmjs.com/package/lowdb) (a simple database)

The code for this example can be found [here](https://github.com/WcaleNieWolny/capgo-social-login-backend-demo/blob/aac7a8c909f650a8c2cd7f88c97f5f3c594ce9ba/index.ts#L139-L287)

As for the client code, it looks like this:

```ts
import { Capacitor } from '@capacitor/core';
import { GoogleLoginOfflineResponse, SocialLogin } from '@capgo/capacitor-social-login';
import { usePopoutStore } from '@/popoutStore'; // <-- specific to my app

const baseURL = "[redacted]";

async function fullLogin() {
  await SocialLogin.initialize({
    google: {
      webClientId: '[redacted]',  
      iOSClientId: '[redacted]',
      iOSServerClientId: 'The same value as webClientId',
      mode: 'offline' // <-- important
    } 
  })
  const response = await SocialLogin.login({
    provider: 'google',
    options: {
      forceRefreshToken: true // <-- important
    }
  })

  if (response.provider === 'google') {
    const result = response.result as GoogleLoginOfflineResponse
    const res = await fetch(`${baseURL}/auth/google_offline`, {
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        serverAuthCode: result.serverAuthCode,
        platform: Capacitor.getPlatform()
      }),
      method: "POST"
    })

    if (res.status !== 200) {
      popoutStore.popout("Full google login failed", "check console");
      return
    }

    const { jwt } = await res.json();
    const userinfo = await fetch(`${baseURL}/auth/get_google_user`, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    })
    if (userinfo.status !== 200) {
      popoutStore.popout("Full google (userinfo) login failed", "check console");
      return
    }
    popoutStore.popout("userinfo res", await userinfo.text());
  }
}
```
