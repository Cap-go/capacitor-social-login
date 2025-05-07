<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

# Google Login setup for Android

## Introduction

In this guide, you will learn how to setup Google Login with Capgo Social Login for Android.
I assume that you have already read the [general setup guide](./general.md).

## Using Google login on Android

In this part, you will learn how to setup Google login in Android.

> [!WARNING]
> The Android SHA1 certificate is beyond painful and I wouldn't wish it on anyone to have to set this up. The following steps assume the simplest scenario of an app that isn't published to Google Play Store and that is only used by the local simulator, or development hardware device. 
>
> If you have deployed your app to Google Play Store, you **MUST** add an additional Android client ID that contains the SHA1 from Google Play console for production releases. You can find the SHA1 hash that Google Play uses to sign your release bundle under `Test and release > Setup > App Signing`.
> 
> Finally, it's important to mention that if you mess up, the error will NOT be obvious. It may be very difficult to debug. If you struggle with the setup, please look at the [Github issues](https://github.com/Cap-go/capacitor-social-login/issues).
>
> Additionally, you may look at the troubleshooting section of the [Google Login setup for Android](./android.md#troubleshooting) for more information.

> [!NOTE]
> You may create multiple Android client IDs. This is required if you have multiple SHA1 certificates.

1. With that said, please create an Android client ID.
   
   - Click on the search bar
     <Picture src="../../assets/google_cons_search.png" alt="Google Console search bar" />
   
   - Search for `credentials` and click on the `APIs and Services` one (number 2 on the screenshot)
     <Picture src="../../assets/google_cons_cred_search.png" alt="Search results showing credentials option with APIs and Services highlighted" />
   
   - Click on the `create credentials`
     <Picture src="../../assets/google_cons_create_cred.png" alt="Create credentials button in Google Console" />
   
   - Select `OAuth client ID`
     <Picture src="../../assets/google_cons_cred_oauth.png" alt="OAuth client ID option in credentials creation menu" />

   - Select the `Android` application type
     <Picture src="../../assets/google_cons_app_type_android.png" alt="Application type selection with Android option highlighted" />
   
   - Open Android Studio
   
   - At the very bottom of the navigator, find the `Gradle Scripts`
     <Picture src="../../assets/studio_gradle_scripts.png" alt="Gradle Scripts section in Android Studio project navigator" />
   
   - Find `build.gradle` for the module `app`
     <Picture src="../../assets/studio_build_gradle.png" alt="build.gradle (Module: app) file in Gradle Scripts section" />
   
   - Copy the `android.defaultConfig.applicationId`. This will be your `package name` in the Google console
     <Picture src="../../assets/studio_build_gradle_app_id.png" alt="Build.gradle file showing applicationId configuration" />
   
   - Now, open the terminal. Make sure that you are in the `android` folder of your app and run `./gradlew signInReport`
     <Picture src="../../assets/term_sign_report.png" alt="Terminal showing gradlew signInReport command" />
   
   - Scroll to the top of this command. You should see the following. Copy the `SHA1`.
     <Picture src="../../assets/term_sign_report_res.png" alt="Terminal output showing SHA1 certificate fingerprint" />
   
   - Now, go back to the Google Console. Enter your `applicationId` as the `Package Name` and your SHA1 in the certificate field and click `create`
     <Picture src="../../assets/google_cons_creat_android_client.png" alt="Android client creation form with package name and SHA1 fields filled in" />
   
### 2. Create a web client (this is required for Android)
   
   - Go to the `Create credentials` page in Google Console
   
   - Set application type to `Web`
     <Picture src="../../assets/google_cons_app_type_web.png" alt="Application type selection with Web option highlighted" />
   
   - Click `Create`
     <Picture src="../../assets/google_cons_web_app_create.png" alt="Web client creation form with Create button at bottom" />
   
   - Copy the client ID, you'll use this as the `webClientId` in your JS/TS code
     <Picture src="../../assets/google_cons_copy_web_client_id.png" alt="Client ID details showing Web client ID to copy" />

3. Now, you need to modify your `MainActivity`
   
   - Please open your app in Android Studio. You can run `cap open android`
   
   - Please find `MainActivity.java`
     
     - Open the `app` folder
       <Picture src="../../assets/studio_app_folder.png" alt="App folder in Android Studio project navigator" />
     
     - Find `java`
       <Picture src="../../assets/studio_app_java.png" alt="Java folder in Android Studio project structure" />
     
     - Find your `MainActivity.java` and click on it
       <Picture src="../../assets/studio_app_java_activity_main.png" alt="MainActivity.java file in package structure" />
   
   - Now, you have to modify `MainActivity.java`. Please add the following code
     
     ```java
     import ee.forgr.capacitor.social.login.GoogleProvider;
     import ee.forgr.capacitor.social.login.SocialLoginPlugin;
     import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
     import com.getcapacitor.PluginHandle;
     import com.getcapacitor.Plugin;
     import android.content.Intent;
     import android.util.Log;
     import com.getcapacitor.BridgeActivity;
     
     // ModifiedMainActivityForSocialLoginPlugin is VERY VERY important !!!!!!    
     public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {
     
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
     import { SocialLogin } from '@capgo/capacitor-social-login';
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
     <Picture src="../../assets/studio_device_man.png" alt="Device Manager in Android Studio with plus button highlighted" />
   
   - Create a virtual device
     <Picture src="../../assets/studio_create_virt_dev.png" alt="Create Virtual Device button in Virtual Device Configuration" />
   
   - Select any device with a `Play Store` icon
     <Picture src="../../assets/studio_new_dev_select_hardware.png" alt="Hardware selection showing devices with Play Store support" />
     
     As you can see, the `pixel 8` supports the `Play Store` services
   
   - Click `next`
     <Picture src="../../assets/studio_new_dev_next_1.png" alt="Next button in device creation wizard" />
   
   - Next, **MAKE SURE** that the OS image is of type `Google Play`. **IT MUST** be of type `Google Play`
     <Picture src="../../assets/studio_new_dev_google_play_dev_type.png" alt="System image selection showing Google Play type images" />
   
   - Click next
     <Picture src="../../assets/studio_new_dev_next_1.png" alt="Next button in system image selection screen" />
   
   - Confirm your device. I will name my emulator `Tutorial phone`
     <Picture src="../../assets/studio_new_dev_next_3.png" alt="Device configuration verification screen with Finish button" />
   
   - Next, go into `Device Manager` and boot up your simulator
     <Picture src="../../assets/studio_dev_manager.png" alt="Device Manager with virtual device listed and play button" />
   
   - After the simulator boots up, please go into it's settings
     <Picture src="../../assets/emul_and_settings_1.png" alt="Android emulator showing settings app" />
   
   - Now, go into `Google Play`
     <Picture src="../../assets/emul_and_settings_2.png" alt="Settings screen with Google Play option" />
   
   - Click `Update` and wait about 60 seconds
     <Picture src="../../assets/emul_and_settings_update_play_store.png" alt="Google Play update screen with Update button" />

6. If you did everything correctly, you should see the following

   <Picture src="../../assets/google_android_final_login_show.gif" alt="Demo of Google login flow on Android showing sign-in process and successful authentication" />

## Troubleshooting

If you have any issues, please look at the [Github issues](https://github.com/Cap-go/capacitor-social-login/issues).
The issues with Google login are **ALWAYS** related to the SHA1 certificate.
If you cannot get the development SHA1 certificate, try to use a custom keystore. [Here](https://github.com/Cap-go/capacitor-social-login/issues/147#issuecomment-2849742574) is a comment explaining how to add keystore to your project.