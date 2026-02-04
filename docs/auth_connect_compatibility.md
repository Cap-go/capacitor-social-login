# Ionic Auth Connect compatibility

This plugin is designed to be compatible with Ionic Auth Connect provider names by mapping them to the built-in OAuth2 engine.
You can use Auth0, Azure AD, Cognito, Okta, and OneLogin with the same provider IDs via the Auth Connect preset wrapper.

## Quick start

```typescript
import { SocialLoginAuthConnect } from '@capgo/capacitor-social-login';

await SocialLoginAuthConnect.initialize({
  authConnect: {
    auth0: {
      domain: 'https://your-tenant.auth0.com',
      clientId: 'your-auth0-client-id',
      redirectUrl: 'myapp://oauth/auth0',
      audience: 'https://your-api.example.com',
    },
    azure: {
      tenantId: 'common',
      clientId: 'your-azure-client-id',
      redirectUrl: 'myapp://oauth/azure',
    },
    okta: {
      issuer: 'https://dev-12345.okta.com/oauth2/default',
      clientId: 'your-okta-client-id',
      redirectUrl: 'myapp://oauth/okta',
    },
  },
});

const result = await SocialLoginAuthConnect.login({
  provider: 'auth0',
});

await SocialLoginAuthConnect.logout({ provider: 'auth0' });
```

## Supported Auth Connect provider IDs

- `auth0`
- `azure`
- `cognito`
- `okta`
- `onelogin`

These provider IDs are mapped to the existing OAuth2 provider internally.

## Overriding endpoints and defaults

Each preset builds a default OAuth2 configuration based on `domain` or `issuer`. If your tenant uses custom endpoints,
override them directly in the preset:

```typescript
await SocialLoginAuthConnect.initialize({
  authConnect: {
    onelogin: {
      issuer: 'https://your-tenant.onelogin.com/oidc/2',
      clientId: 'your-onelogin-client-id',
      redirectUrl: 'myapp://oauth/onelogin',
      authorizationBaseUrl: 'https://your-tenant.onelogin.com/oidc/2/auth',
      accessTokenEndpoint: 'https://your-tenant.onelogin.com/oidc/2/token',
      resourceUrl: 'https://your-tenant.onelogin.com/oidc/2/me',
      logoutUrl: 'https://your-tenant.onelogin.com/oidc/2/logout',
    },
  },
});
```

## Notes

- The compatibility layer maps provider names and configuration to OAuth2; it is not a re-implementation of Ionic's native SDKs.
- Refresh tokens require `offline_access` scopes when supported by the provider.
- You can always bypass presets and configure providers directly via the `oauth2` field.
