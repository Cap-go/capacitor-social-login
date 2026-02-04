# Migration from Ionic Auth Connect

This guide helps you move from Ionic Auth Connect to @capgo/capacitor-social-login while keeping familiar provider names.

## Why this works

This plugin includes a generic OAuth2 engine. The Auth Connect preset wrapper maps Ionic provider IDs
(Auth0, Azure AD, Cognito, Okta, OneLogin) to OAuth2 configurations so you can use `provider: 'auth0'` and similar calls.

## Install

```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

## Replace imports

From Ionic Auth Connect:

```typescript
import { AuthConnect } from '@ionic-enterprise/auth-connect';
```

To this plugin:

```typescript
import { SocialLoginAuthConnect } from '@capgo/capacitor-social-login';
```

## Initialize providers

Ionic Auth Connect typically expects a provider configuration per provider. Use the `authConnect` presets instead:

```typescript
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
    cognito: {
      domain: 'https://your-domain.auth.region.amazoncognito.com',
      clientId: 'your-cognito-client-id',
      redirectUrl: 'myapp://oauth/cognito',
    },
    okta: {
      issuer: 'https://dev-12345.okta.com/oauth2/default',
      clientId: 'your-okta-client-id',
      redirectUrl: 'myapp://oauth/okta',
    },
    onelogin: {
      issuer: 'https://your-tenant.onelogin.com/oidc/2',
      clientId: 'your-onelogin-client-id',
      redirectUrl: 'myapp://oauth/onelogin',
    },
  },
});
```

If your provider uses non-standard endpoints, override them in the preset or use the `oauth2` field directly.

## Login / logout / status

```typescript
const result = await SocialLoginAuthConnect.login({ provider: 'auth0' });

await SocialLoginAuthConnect.logout({ provider: 'auth0' });

const status = await SocialLoginAuthConnect.isLoggedIn({ provider: 'auth0' });

const code = await SocialLoginAuthConnect.getAuthorizationCode({ provider: 'auth0' });
```

## Differences to be aware of

- The Auth Connect compatibility layer uses OAuth2 flows; it is not a native re-implementation of Ionic Auth Connect.
- Token storage differs: OAuth2 tokens are stored in UserDefaults (iOS), SharedPreferences (Android), and localStorage (web).
- Refresh tokens require `offline_access` scopes when supported by your provider.
- If you rely on advanced Ionic Auth Connect features, verify those flows with your provider and configure endpoints as needed.

## Next

See the full compatibility guide:

- docs/auth_connect_compatibility.md
