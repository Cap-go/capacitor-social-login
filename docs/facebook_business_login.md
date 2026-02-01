# Facebook Business Login

This guide explains how to implement Facebook Business Login to access business-related features and APIs.

## Overview

Facebook Business Login enables your app to access business features like Instagram Basic Display, Pages management, and business insights. The Capacitor Social Login plugin fully supports all Facebook business permissions through the standard login flow.

## Key Differences: Consumer vs Business Login

| Feature | Consumer Login | Business Login |
|---------|---------------|----------------|
| Basic Permissions | ✅ `email`, `public_profile` | ✅ All consumer permissions |
| Instagram Access | ❌ No | ✅ `instagram_basic`, `instagram_manage_insights` |
| Pages Management | ❌ Limited | ✅ `pages_show_list`, `pages_manage_posts`, etc. |
| Business Assets | ❌ No | ✅ `business_management` |
| App Type | Any Facebook App | Must be configured as Business App |
| Review Required | Generally no | Yes, for most business permissions |

## Setup

### 1. Configure Your Facebook App as a Business App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. In App Settings, select "Business" as the app type
4. Add the required products:
   - **Facebook Login** (required)
   - **Instagram Basic Display** (for Instagram access)
   - **Pages API** (for Pages management)

### 2. Configure Business Integrations

1. Navigate to **App Dashboard > Add Product**
2. Add the products you need:
   - Instagram Basic Display
   - Pages API
   - Business Asset Management

3. Configure OAuth redirect URIs and app domains

### 3. Request Business Permissions

Business permissions typically require Facebook's App Review before production use. During development:
- Use **Development Mode** to test with test users
- Add test users in App Dashboard > Roles > Test Users
- Test users can access business permissions without review

## Implementation

### Basic Setup

```typescript
import { SocialLogin } from '@capgo/capacitor-social-login';

// Initialize with your business app credentials
await SocialLogin.initialize({
  facebook: {
    appId: 'your-business-app-id',
    clientToken: 'your-client-token', // Android only
  },
});
```

### Example 1: Instagram Basic Display

Request Instagram account access:

```typescript
const result = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: [
      'email',
      'public_profile',
      'instagram_basic',  // Instagram Basic Display permission
    ],
  },
});

console.log('Access Token:', result.result.accessToken?.token);
console.log('User ID:', result.result.profile.userID);

// Get user's Instagram business account
const profile = await SocialLogin.providerSpecificCall({
  call: 'facebook#getProfile',
  options: {
    fields: [
      'id',
      'name', 
      'email',
      'instagram_business_account{id,username,profile_picture_url}',
    ],
  },
});

console.log('Instagram Account:', profile.profile.instagram_business_account);
```

### Example 2: Pages Management

Access and manage Facebook Pages:

```typescript
const result = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: [
      'email',
      'pages_show_list',           // List user's Pages
      'pages_read_engagement',     // Read Page insights
      'pages_manage_posts',        // Manage Page posts
    ],
  },
});

// Get user's managed pages
const profile = await SocialLogin.providerSpecificCall({
  call: 'facebook#getProfile',
  options: {
    fields: [
      'id',
      'name',
      'accounts{id,name,access_token,instagram_business_account{id,username}}',
    ],
  },
});

// Access pages data
const pages = profile.profile.accounts?.data;
console.log('Managed Pages:', pages);
```

### Example 3: Business Asset Management

Manage business assets:

```typescript
const result = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: [
      'email',
      'business_management',  // Manage business assets
      'catalog_management',   // Manage product catalogs
      'ads_management',       // Manage ads
    ],
  },
});

// Access business-related data through Graph API
```

## Available Business Permissions

### Instagram Permissions
- `instagram_basic` - Access to profile, media
- `instagram_manage_insights` - Access to Instagram Insights
- `instagram_manage_comments` - Manage comments
- `instagram_manage_messages` - Manage direct messages
- `instagram_content_publish` - Publish content

### Pages Permissions
- `pages_show_list` - List of Pages managed by user
- `pages_read_engagement` - Read Page engagement metrics
- `pages_manage_posts` - Create, edit, delete Page posts
- `pages_manage_metadata` - Update Page info
- `pages_read_user_content` - Read user-generated content
- `pages_messaging` - Send/receive messages

### Business Permissions
- `business_management` - Manage business assets
- `catalog_management` - Manage product catalogs  
- `ads_management` - Manage advertising accounts
- `leads_retrieval` - Access lead generation data

See the [complete permissions reference](https://developers.facebook.com/docs/permissions/reference) for all available permissions.

## Facebook Graph API Integration

After login, use the access token to call Facebook Graph API:

```typescript
// Get the access token
const result = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: ['instagram_basic', 'pages_show_list'],
  },
});

const accessToken = result.result.accessToken?.token;

// Make Graph API requests
// Note: Update API version (v17.0) to the latest available version
// See https://developers.facebook.com/docs/graph-api/guides/versioning
// Example: Get Instagram media
const response = await fetch(
  `https://graph.facebook.com/v17.0/{instagram-account-id}/media?fields=id,caption,media_url&access_token=${accessToken}`
);
const data = await response.json();
```

## Platform-Specific Notes

### Android

- Ensure your app's package name is configured in Facebook Developer Console
- Add Facebook SDK dependencies in `android/app/build.gradle`
- Configure `AndroidManifest.xml` with Facebook app ID

### iOS

- Configure `Info.plist` with Facebook app settings
- Add URL scheme: `fb[APP_ID]`
- Implement AppDelegate changes (see main README)
- Handle URL callbacks for Facebook authentication

### Web

- Configure OAuth redirect URIs in Facebook Developer Console
- Ensure your domain is added to **App Domains**
- Business permissions work the same way as on mobile

## Testing Business Permissions

### Development Mode
1. Enable **Development Mode** in Facebook App Dashboard
2. Add test users under **Roles > Test Users**
3. Test users can access all permissions without App Review
4. Use development mode for testing before submitting for review

### Test Users
```typescript
// Test users can log in with business permissions immediately
const result = await SocialLogin.login({
  provider: 'facebook',
  options: {
    permissions: ['instagram_basic', 'pages_show_list'],
  },
});
// Works in development mode without review
```

## App Review Process

Most business permissions require Facebook App Review:

1. **Complete App Development** - Fully implement your use case
2. **Prepare Verification Materials**:
   - Screen recording demonstrating permission usage
   - Detailed explanation of why you need each permission
   - Privacy policy URL
   - Terms of service URL

3. **Submit for Review**:
   - Go to App Dashboard > App Review > Permissions and Features
   - Select the permissions to request
   - Upload verification materials
   - Submit for review

4. **Review Timeline**: Typically 3-5 business days

5. **After Approval**: Switch app to Live Mode

## Common Issues and Solutions

### Issue: Permission Denied
**Solution**: 
- Check if permission is approved in App Review
- Verify app is in correct mode (Development/Live)
- Ensure user has necessary accounts (e.g., Instagram Business Account)

### Issue: Instagram Account Not Found
**Solution**:
- User must have an Instagram Business or Creator account
- Instagram account must be linked to a Facebook Page
- Use `instagram_business_account` field, not `instagram_account`

### Issue: Can't Access Pages
**Solution**:
- User must be admin/editor of the Page
- Page must be published (not draft)
- Request `pages_show_list` permission

## Best Practices

1. **Request Minimum Permissions**: Only request permissions you actually use
2. **Handle Denials Gracefully**: Users can decline specific permissions
3. **Token Management**: Store access tokens securely using [@capgo/capacitor-persistent-account](https://github.com/Cap-go/capacitor-persistent-account)
4. **Refresh Tokens**: Facebook access tokens expire; implement refresh logic
5. **Error Handling**: Handle API errors and rate limits appropriately
6. **User Experience**: Clearly explain why you need each permission

## Security Considerations

- **Never expose access tokens** in client-side code or logs
- **Use HTTPS** for all API requests
- **Validate tokens on your backend** before trusting user data
- **Implement token expiration checks** and refresh logic
- **Follow Facebook Platform Policies** to avoid app suspension

## Resources

- [Facebook Business Integration Guide](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/business-integrations)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook Pages API](https://developers.facebook.com/docs/pages)
- [Facebook Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)

## Example: Complete Business Login Flow

```typescript
import { SocialLogin } from '@capgo/capacitor-social-login';

async function loginWithBusinessAccount() {
  try {
    // Initialize
    await SocialLogin.initialize({
      facebook: {
        appId: 'your-business-app-id',
        clientToken: 'your-client-token',
      },
    });

    // Login with business permissions
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: {
        permissions: [
          'email',
          'public_profile',
          'instagram_basic',
          'pages_show_list',
        ],
      },
    });

    console.log('Login successful!');
    console.log('User ID:', result.result.profile.userID);
    console.log('Email:', result.result.profile.email);
    
    // Get detailed profile with business data
    const profile = await SocialLogin.providerSpecificCall({
      call: 'facebook#getProfile',
      options: {
        fields: [
          'id',
          'name',
          'email',
          'accounts{id,name,instagram_business_account{id,username}}',
        ],
      },
    });

    // Access business data
    const pages = profile.profile.accounts?.data || [];
    console.log(`Found ${pages.length} managed pages`);
    
    for (const page of pages) {
      console.log(`Page: ${page.name}`);
      if (page.instagram_business_account) {
        console.log(`  Instagram: @${page.instagram_business_account.username}`);
      }
    }

    // Store tokens securely for later use
    const accessToken = result.result.accessToken?.token;
    // Use @capgo/capacitor-persistent-account or secure storage

    return { success: true, profile };
    
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error };
  }
}
```

## Support

For issues specific to Facebook Business Login:
1. Check [Facebook Developers Community](https://developers.facebook.com/community/)
2. Review [Facebook Platform Status](https://developers.facebook.com/status/)
3. Open an issue on the [plugin repository](https://github.com/Cap-go/capacitor-social-login/issues)
