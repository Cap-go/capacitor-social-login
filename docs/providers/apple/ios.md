<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

# Apple login on IOS

Let's break down what you are going to need in order to setup Apple login on IOS.

Firstly, you need to configure the capabilities of your app. In order to do this, please open Xcode, click on `App`

<Picture src="../../assets/app-xcode.png" alt="App XCode" />

Now, you want to make sure that you sellect the right target.

<Picture src="../../assets/xcode-app-target.png" alt="XCode App Target" />

Then, please make sure that you add the `Sign in with Apple` capability.

<Picture src="../../assets/app-xcode-add-cap.png" alt="App XCode Add Capability" />

<Picture src="../../assets/sign-with-apple-cap.png" alt="Sign with Apple Capability" />

If you don't see the `Sign in with Apple` capability, configure the [Account & Organizational Data Sharing](https://developer.apple.com/account/resources/services/cwa/configure)

Next, you want to initialize the Apple Login.

> [!NOTE]
> I am using Vue as my framework, the exact implementation will vary depening on the framework of your choice

```ts
//  onMounted is vue specific
onMounted(() => {
  SocialLogin.initialize({
    apple: {}
  })
});
```

Later, you want to create a button that will begin the login process.

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

Then, you want to run your app on a **<u>PHYSICAL</u>** device and test it. If you followed the steps closely you will see the following screen after clicking your button.

<Picture src="../../assets/apple-sign-in-ios-final.png" alt="Apple Sign In prompt on iOS device" />

That's it! You are all set.