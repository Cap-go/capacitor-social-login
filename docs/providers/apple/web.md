<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

# Apple login on IOS

Configuring the web login is not trivial. It's more difficult than setting up `Sign in with Apple` on iOS but more difficult than setting up `Sign in with Apple` on Android.

## Generating the service

> [!NOTE]
> This step is redundent if you have already configured `Sign in with Apple` on Android.

1. Go to the [Apple Developer Portal](https://developer.apple.com/account/resources/services/cwa/configure)
    Let's login into the [Apple Developer Portal](https://developer.apple.com). Now, click on `Identifiers`.

    <Picture src="../../assets/apple_dev_portal_iden.png" alt="Apple Developer Portal Identifiers section" />

    You should see a screen that looks like this:

    <Picture src="../../assets/apple_dev_portal_iden_2.png" alt="Apple Developer Portal Identifiers screen" />

    A) Ensure that this field says `App IDs`

    B) Make sure that you can find your App ID. If you don't have configured Apple Login for IOS, you will have to create one. For me, I already have one created. The app ID I will use is `me.wcaleniewolny.test.ionic.vue`

    > [!NOTE]
    > If you don't have an App ID, you will have to create one.
    > Please refer to the [Android guide](./android.md) for more information.
2. Make sure that the `Sign in with Apple` capability is enabled for your app
   
   - Click on your app
     <Picture src="../../assets/apple_dev_click_on_app.png" alt="Selecting your app from the list" />
   
   - Ensure that the `Sign in with Apple` capability is enabled
     <Picture src="../../assets/apple_dev_sign_in_with_apple_enabled.png" alt="Sign in with Apple capability enabled checkbox" />
     If it isn't enabled, enable it.

3. Go back to all `All Identifiers` 
<Picture src="../../assets/apple_dev_go_back_iden.png" alt="All Identifiers navigation button" />

4. Click on `App Ids` and go to `Services IDs`
   <Picture src="../../assets/apple_dev_go_to_services_id.png" alt="Navigation to Services IDs section" />

5. Creare a new identifier
   
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

## Configuring the `Return URLs`

   > [!WARNING]
   > This step is obligatory regardless of whether or not you have configured the `Sign in with Apple` on Android.

   - Click on the `Configure` button
     <Picture src="../../assets/apple_dev_conf_serv_sign_with_apple.png" alt="Configure button for Sign in with Apple" />

   - Click on the `Plus` button
     <Picture src="../../assets/apple_dev_add_website_url.webp" alt="Add website URL button" />
   - Add your website URL into both `Domains and Subdomains` and `Return URLs`
     <Picture src="../../assets/apple_dev_web_auth_config_add_redirect.webp" alt="Adding website URL" />
   > [!NOTE]
   > You can add multiple URLs if you want to
   > The redirect URL is the url of the page where you will have your `Sign in with Apple` button.
   > For example, this might be `https://magic-login-srvv2-48.localcan.dev/auth`
   
   > [!WARNING]
   > You **MAY NOT** add the `http://localhost` URL. It will **NOT** work.

   > [!WARNING]
   > When you add a redirect URL, you **MUST** add the `/` at the end of it otherwise it will **NOT** work.

   - Click on the `Next` button
     <Picture src="../../assets/apple_dev_web_auth_conf_next_redirect.webp" alt="Save button" />
   - Click on the `Done` button
     <Picture src="../../assets/apple_dev_web_auth_conf_done.webp" alt="Done button" />

## Using the `Sign in with Apple` in your app

> [!NOTE]
> I am using Vue as my framework, the exact implementation will vary depening on the framework of your choice

Add the following code to your component.

```ts
//  onMounted is vue specific
onMounted(() => {
  SocialLogin.initialize({
    apple: {}
  })
});
```

Later, you want to create a button that will begin the login process. This button should call the following function.

```ts
async function loginApple() {
  const res = await SocialLogin.login({
    provider: 'apple',
    options: {}
  })
  // token = the JWT returned by Apple
  const token = res.result.idToken
  // Send the token to your backend.... 
}
```

You are done 🚀