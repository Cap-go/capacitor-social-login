# How to setup apple

Please follow [this guide](https://johncodeos.com/how-to-add-sign-in-with-apple-button-to-your-android-app-using-kotlin/) to generate the p8 key, create a service_id, create an app_id and add the `sign with apple` capability to your app id, configure private relay.

Later please host the backend. An example can be found [here](./example_backend.ts)

NOTE: the following env file is required:
```bash
# Private Key .p8 file name
PRIVATE_KEY_FILE=AuthKey.p8

# Key ID (Certificates, Identifiers & Profiles > Keys > Choose your app > Key ID)
KEY_ID=

# Team ID (Membership > Team ID)
TEAM_ID=

# Service ID (Certificates, Identifiers & Profiles > Identifiers > Change to Service IDs on the top right corner -> Choose your app -> Identifier)
SERVICE_ID=

# The port to run the app
PORT=3000

REDIRECT_URI=https://example.com/login/callback
```

You can run the backend with `bun --env-file=.env run example_backend.ts `

When calling `SocialLogin.initialize` `clientId.android.clientId` is equivalent to `SERVICE_ID` from the env file.

An example of the plugin usage can be found [here](https://github.com/Cap-go/demo-app/blob/f96b8bc92f5c99a27bcb7fcd3acc885ed4501b0a/src/views/plugins/Auth.vue)