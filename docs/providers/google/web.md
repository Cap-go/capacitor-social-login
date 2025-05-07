<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

### Using Google login on the web

Using the google login on the web is rather simple.
In order to use it, you have to do the following:

1. Create a web client in the Google Console.
   
  - Please follow step 2 of the [Using Google login on Android](./android.  md#_2-create-a-web-client-this-is-required-for-android) if you have not configured it already
2. Configure the web client in the Google Console

  - Please open the [credentials page](https://console.cloud.google.com/apis/credentials) and click on your web client
    <Picture src="../../assets/google_cons_open_web_client_id.png" alt="Credentials list showing web client to click" />

  - Now, please add the `Authorized JavaScript origins`. This should include all the addresses that you might use for your app. In might case, I will **ONLY** use localhost, but since I use a custom port I have to add both `http://localhost` and `http://localhost:5173`
    
    - Please click on `add URI`
      <Picture src="../../assets/google_cons_authorized_js_add_btn.png" alt="Authorized JavaScript origins section with ADD URI button" />
    
    - Please type your URL
      <Picture src="../../assets/google_cons_authorized_js_typed_url.png" alt="ADD URI dialog with localhost URL entered" />
    
    - Please repeat until you added all the URLs
    
    - When you finish, your screen should look something like this
      <Picture src="../../assets/google_cons_authorized_js_final.png" alt="Authorized JavaScript origins with multiple localhost URLs added" />

  - Now, please add some `Authorized redirect URIs`. This will depend on what page do you depend to use the CapacitorSocialLogin plugin on. In my case, I am going to be using it on `http://localhost:5173/auth` 
    
    - Please click on `ADD URI`
      <Picture src="../../assets/google_cons_web_add_redirect_url_1.png" alt="Authorized redirect URIs section with ADD URI button" />
    
    - Enter your URL and click `ADD URL` again
      <Picture src="../../assets/google_cons_web_add_redirect_url_2.png" alt="ADD URI dialog with redirect URL entered" />

  - Click `save`
    <Picture src="../../assets/google_cons_web_app_save.png" alt="Save button at bottom of web client configuration" />
3. Now, you should be ready to call `login` from JavaScript like so:
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

<Picture src="../../assets/vscode_auth_google.png" alt="VS Code showing Google authentication code that verifies tokens" />

The idea is rather simple. You send a simple `GET` request to `https://www.googleapis.com/oauth2/v3/tokeninfo` and this returns you whether the token is valid or not and if it it is, it gives you the email of the user. It also gives you some other info about the user token
<Picture src="../../assets/google_auth_playground_token_info.png" alt="Google OAuth Playground showing token information response with user details" />

For there, you could issue the user with your own JWT or issue some sort of session cookie. The possibilities are endless, for the final auth implementation.

If you do want to call Google API's, I would strongly recommend at [Google's OAuth 2.0 Playground](https://developers.google.com/oauthplayground). From there you can easily see what APIs you can call.

### Using offline access with your own backend

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
