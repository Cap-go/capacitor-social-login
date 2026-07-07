# Keycloak OAuth/OIDC setup

Keycloak works through the built-in generic OAuth2 provider. You do not need a new native provider for Keycloak; configure your Keycloak client as an OpenID Connect client and use `provider: 'oauth2'` with a `providerId` such as `keycloak`.

## Keycloak client settings

In your Keycloak realm, create or open the client used by your Capacitor app:

1. Use the authorization code flow.
2. Keep PKCE enabled in the app config.
3. Register every redirect URI that your app uses, for example `myapp://oauth/keycloak` for mobile and an HTTPS callback URL for production web.
4. Use scopes such as `openid profile email`. Add `offline_access` only when your realm/client is configured to issue refresh tokens.

The exact issuer URL is deployment-specific. Current Keycloak deployments commonly publish realm metadata at `https://keycloak.example.com/realms/my-realm/.well-known/openid-configuration`, but some deployments include an extra base path. Use the issuer URL shown by your realm's OpenID Endpoint Configuration instead of guessing.

## Configure the plugin

Prefer `issuerUrl` so the plugin can discover the authorization, token, and logout endpoints from the realm metadata:

```typescript
import { SocialLogin } from '@capgo/capacitor-social-login';

const keycloakIssuer = 'https://keycloak.example.com/realms/my-realm';

await SocialLogin.initialize({
  oauth2: {
    keycloak: {
      appId: 'your-keycloak-client-id',
      issuerUrl: keycloakIssuer,
      redirectUrl: 'myapp://oauth/keycloak',
      scope: 'openid profile email',
      pkceEnabled: true,
      resourceUrl: `${keycloakIssuer}/protocol/openid-connect/userinfo`,
    },
  },
});

const result = await SocialLogin.login({
  provider: 'oauth2',
  options: {
    providerId: 'keycloak',
  },
});

console.log(result.result.idToken);
console.log(result.result.accessToken?.token);
console.log(result.result.resourceData);
```

For refresh tokens, request `offline_access` only if your Keycloak realm and client allow refresh tokens for this app:

```typescript
await SocialLogin.initialize({
  oauth2: {
    keycloak: {
      appId: 'your-keycloak-client-id',
      issuerUrl: keycloakIssuer,
      redirectUrl: 'myapp://oauth/keycloak',
      scope: 'openid profile email offline_access',
      pkceEnabled: true,
    },
  },
});
```

## Manual endpoint fallback

If OIDC discovery is blocked or your deployment does not expose metadata to the app, configure the endpoints directly. Keep the base URL exactly as your Keycloak deployment publishes it:

```typescript
const keycloakRealmUrl = 'https://keycloak.example.com/realms/my-realm';

await SocialLogin.initialize({
  oauth2: {
    keycloak: {
      appId: 'your-keycloak-client-id',
      authorizationBaseUrl: `${keycloakRealmUrl}/protocol/openid-connect/auth`,
      accessTokenEndpoint: `${keycloakRealmUrl}/protocol/openid-connect/token`,
      redirectUrl: 'myapp://oauth/keycloak',
      scope: 'openid profile email',
      pkceEnabled: true,
      resourceUrl: `${keycloakRealmUrl}/protocol/openid-connect/userinfo`,
      logoutUrl: `${keycloakRealmUrl}/protocol/openid-connect/logout`,
    },
  },
});
```

## Auth Connect compatibility

Keycloak is not one of the Auth Connect preset provider IDs. If you already use `SocialLoginAuthConnect`, you can still initialize the generic `oauth2` provider and log in with `provider: 'oauth2'` plus `providerId: 'keycloak'`.

See the Keycloak OpenID Connect endpoint reference for the discovery and endpoint paths: https://www.keycloak.org/securing-apps/oidc-layers
