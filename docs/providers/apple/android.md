<script setup lang="ts">
import Picture from '../../components/Picture.vue';
import AndroidAppleLoginGraph from '../../components/AndroidAppleLoginGraph.vue';
</script>

# Apple login on Android

Apple login on android is hacky. Apple has no official support for `Sign in with Apple` on Android, so the solution is slightly hacky.

Android currently uses a chrome tabs to display an OAuth2 website. This approach has the challanges:

- Difficult configuration

- A backend is required

## Understanding the flow on android.

Let me use a diagram to explain the flow on android:

<AndroidAppleLoginGraph />

## Configuring the login

Now that you are aware of the challlanges and the flow, let's begin the configuration.

Let's login into the [Apple Developer Portal](https://developer.apple.com). Now, click on `Identifiers`.

<Picture src="../../assets/apple_dev_portal_iden.png" alt="Apple Developer Portal Identifiers section" />

You should see a screen that looks like this:

<Picture src="../../assets/apple_dev_portal_iden_2.png" alt="Apple Developer Portal Identifiers screen" />

1) Ensure that this field says `App IDs`

2) Make sure that you can find your App ID. If you don't have configured Apple Login for IOS, you will have to create one. For me, I already have one created. The app ID I will use is `me.wcaleniewolny.test.ionic.vue`
   
   - If you don't already have an App ID, click on the plus button
   <Picture src="../../assets/apple_dev_iden_plus.png" alt="Add new identifier plus button" />
   
   - Select `App IDs` and click continue 
   <Picture src="../../assets/apple_dev_new_app_id.png" alt="Selecting App IDs type" />
   
   - Click on type `App` and click `Continue` 
   <Picture src="../../assets/apple_dev_new_app_type.png" alt="Selecting App type" />
   
   - Enter the description and the app ID 
   <Picture src="../../assets/apple_dev_new_app_desc_id.png" alt="Entering app description and bundle ID" />
   
   - Enable `Sign with Apple` capability 
   <Picture src="../../assets/apple_dev_enable_sign_with_apple.png" alt="Enabling Sign in with Apple capability" />
   
   - Click `Continue` 
   <Picture src="../../assets/apple_dev_register_continue.png" alt="Continue button for app registration" />
   
   - Confirm the details and click `Register` 
   <Picture src="../../assets/apple_dev_confirm_register.png" alt="Confirming app registration details" />

3) Make sure that the `Sign in with Apple` capability is enabled for your app
   
   - Click on your app
     <Picture src="../../assets/apple_dev_click_on_app.png" alt="Selecting your app from the list" />
   
   - Ensure that the `Sign in with Apple` capability is enabled
     <Picture src="../../assets/apple_dev_sign_in_with_apple_enabled.png" alt="Sign in with Apple capability enabled checkbox" />
     If it isn't enabled, enable it.

4) Go back to all `All Identifiers` 
<Picture src="../../assets/apple_dev_go_back_iden.png" alt="All Identifiers navigation button" />

5. Click on `App Ids` and go to `Services IDs`
   <Picture src="../../assets/apple_dev_go_to_services_id.png" alt="Navigation to Services IDs section" />

6. Creare a new identifier
   
   - Click on the plus button
     <Picture src="../../assets/apple_dev_iden_add.png" alt="Add new service ID button" />
   
   - Select `Servcice IDs` and click `Continue`
     <Picture src="../../assets/apple_dev_service_and_cont.png" alt="Selecting Service IDs option" />
   
   - Enter a description and a identifiers and click `Continuie`. **WARNING**: This `identifiers` will become the `clientId` that you will pass in the `initialize` function AND `ANDROID_SERVICE_ID` for the backend. **Please save it!!!**
     
     Service ID doesn't have to match the App ID, but I recomend setting the service ID to `YOUR_APP_ID.serivce` . As a reminder, I am using `me.wcaleniewolny.test.ionic.vue` for my app ID but I am using `ee.forgr.io.ionic.service2` as the service ID.
     <Picture src="../../assets/apple_dev_reg_service_2.png" alt="Entering service ID details" />
   
   - Please verify the details and click `Register`
     <Picture src="../../assets/apple_dev_service_ref_fin.png" alt="Confirming service ID registration" />
   
   - Click on the the newly created service
     <Picture src="../../assets/apple_dev_open_serv.png" alt="Selecting newly created service ID" />
   
   - Enable the `Sign in with Apple` option
     <Picture src="../../assets/apple_dev_serv_enable_sign_with_apple.png" alt="Enabling Sign in with Apple for service ID" />
   
   - Configure the `Sign In with Apple`
     <Picture src="../../assets/apple_dev_conf_serv_sign_with_apple.png" alt="Configure button for Sign in with Apple" />
   
   - Ensure that the `Primary App ID` is set to the App ID configured in the previous step
     <Picture src="../../assets/apple_dev_service_prim_id.png" alt="Setting Primary App ID dropdown" />
   
   - Add the domain that you are going to host you backend on. Furthermore, this backend HAS to be running on HTTPS. As for the `Return URLs`, you might want to come back to this after reading the next section of this tutorial and after configuring the backend. For the purposes of this tutorial, I will use `https://xyz.wcaleniewolny.me/login/callback` for the return URL and `xyz.wcaleniewolny.me` the doman. Press next.
     <Picture src="../../assets/apple_dev_serv_create_next.png" alt="Setting domain and return URL fields" />

- Confirm the data and click `Done`
  <Picture src="../../assets/apple_dev_serv_conf_done.png" alt="Confirming domain and return URL configuration" />

- Click on `Continue`
  <Picture src="../../assets/apple_dev_cont_serv_creat.png" alt="Continue button for service configuration" />

- Click on `Save`
  <Picture src="../../assets/apple_dev_cont_serv_creat_save.png" alt="Save button for service configuration" />

7. Now, you have to generate a key. This key will be used on the backend.
- Click on `Keys`
  <Picture src="../../assets/apple_dev_key_selc.png" alt="Keys section in Apple Developer Portal" />

- Click on the plus icon
  <Picture src="../../assets/apple_dev_key_plus.png" alt="Add new key button" />

- Name your key, this name isn't important
  <Picture src="../../assets/apple_key_name.png" alt="Entering key name field" />

- Select `Sign in with Apple` and click `Configure`
  <Picture src="../../assets/apple_dev_key_sing_apple_conf.png" alt="Enabling and configuring Sign in with Apple for the key" />

- Select the primary App ID, this must be the same App ID as in the previous steps. Press `Save`
  <Picture src="../../assets/apple_dev_key_prim_app_id.png" alt="Selecting primary App ID for the key" />

- Click on `Continue`
  <Picture src="../../assets/apple_dev_key_const.png" alt="Continue button for key configuration" />

- Click on `Register`
  <Picture src="../../assets/apple_dev_key_reg.png" alt="Register button for key creation" />

- Copy tke key ID. **IMPORTANT:** Save this ID, in the backend it will become called `KEY_ID`. Download the key
  <Picture src="../../assets/apple_dev_key_downl.png" alt="Key ID and download button screen" />

- This will download the key. Please save it in a safe place, you will need it in the backend
  <Picture src="../../assets/apple_dev_downloaded_key.png" alt="Downloaded key file" />

8. Get the `Team ID`
   
   - Go to [this website](https://developer.apple.com/account) and scroll down
   
   - Find the `Team ID`
     <Picture src="../../assets/apple_dev_team_id.png" alt="Team ID location in developer account" />

## Configuring the app redirect

As you saw in the diagram, the backend performs a step called `Redirect back to the app`. This requires manual changes to your app.

1. First, you need to modify the `AndroidManifest.xml`.
   
   - Open the file, I will use `AndroidStuido`
     <Picture src="../../assets/studio_android_manifest_file.png" alt="AndroidManifest.xml file in Android Studio" />
   
   - Find the `MainActivity` and add the following Intent filter
     <Picture src="../../assets/studio_manifest_code_to_add.png" alt="Intent filter code to add in MainActivity" />
     
     ```xml
     <intent-filter>
         <action android:name="android.intent.action.VIEW" />
         <category android:name="android.intent.category.DEFAULT" />
         <category android:name="android.intent.category.BROWSABLE" />
         <data android:scheme="capgo-demo-app" android:host="path" />
     </intent-filter>
     ```
     
     You have just added a new deep link into your app. The deep link will look something like this: `capgo-demo-app://path`. You can change the `android:scheme` and the `android:host` to modify how this deep link looks.
     **Important:** In the backend configuration, this deep link will become `BASE_REDIRECT_URL`

2- Now, you need to modify the `MainActivity` file

- Please open the `MainActivity`
  <Picture src="../../assets/studio_main_activ_file.png" alt="MainActivity.java file in Android Studio" />

- After you open this file, you will want to add the following code:
  <Picture src="../../assets/studio_main_actv_new_code.png" alt="Code to add to MainActivity for handling deep links" />
  
  ```java
  @Override
  protected void onNewIntent(Intent intent) {
      String action = intent.getAction();
      Uri data = intent.getData();
  
      if (Intent.ACTION_VIEW.equals(action) && data != null) {
          PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
          if (pluginHandle == null) {
              Log.i("Apple Login Intent", "SocialLogin login handle is null");
              return;
          }
          Plugin plugin = pluginHandle.getInstance();
          if (!(plugin instanceof SocialLoginPlugin)) {
              Log.i("Apple Login Intent", "SocialLogin plugin instance is not SocialLoginPlugin");
              return;
          }
          ((SocialLoginPlugin) plugin).handleAppleLoginIntent(intent);
          return;
      }
      super.onNewIntent(intent);
  }
  ```
  
  This example assumes that you don't have any deep links configured. If you do, please adjust the code

## Backend configuration

A backend is required for Android, but configuring a backend will also impact IOS. An example backend is provided [here](https://github.com/WcaleNieWolny/capgo-social-login-backend-demo/blob/main/index.ts)

This example provides the following:

- A simple JSON database

- A way to request the JWT from Apple's servers

- A simple JWT verification

I use `PM2` in order to host this example. An example `ecosystem.config.js` can be found [here](https://github.com/WcaleNieWolny/capgo-social-login-backend-demo/blob/main/ecosystem.config.js.example)

Given everything that I said in this tutorial, here is how the `env` section would look:

ANDROID_SERVICE_ID = Service ID
IOS_SERVICE_ID = App ID

```js
env: {
  PRIVATE_KEY_FILE: "AuthKey_U93M8LBQK3.p8",
  KEY_ID: "U93M8LBQK3",
  TEAM_ID: "UVTJ336J2D",
  ANDROID_SERVICE_ID: "ee.forgr.io.ionic.starter.service2",
  IOS_SERVICE_ID: "me.wcaleniewolny.test.ionic.vue",
  PORT: 3000,
  REDIRECT_URI: "https://xyz.wcaleniewolny.me/login/callback",
  BASE_REDIRECT_URL: "capgo-demo-app://path"
}
```

#### Using the plugin

The usage of the `login` function doesn't change, it's the same as IOS. Please take a look at that section for more info. **HOWEVER**, the `initialize` method changes a bit.

```typescript
await SocialLogin.initialize({
  apple: {
    clientId: 'ee.forgr.io.ionic.starter.service2',
    redirectUrl: 'https://appleloginvps.wcaleniewolny.me/login/callback'
  }
})
```

> [!DANGER]
> Note, that adding `redirectUrl` **WILL** affect IOS !!!!!
