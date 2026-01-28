/**
 * Example: Facebook Business Login Implementation
 * 
 * This file demonstrates how to implement Facebook Business Login
 * to access Instagram, Pages, and other business features.
 */

import { SocialLogin } from '@capgo/capacitor-social-login';

/**
 * Initialize the plugin with your Facebook Business App credentials
 */
export async function initializeFacebookBusiness(appId: string, clientToken?: string) {
  await SocialLogin.initialize({
    facebook: {
      appId: appId,
      clientToken: clientToken, // Required for Android
    },
  });
}

/**
 * Example 1: Login with Instagram Basic Display
 * Useful for apps that need to display Instagram content
 */
export async function loginWithInstagram() {
  try {
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: {
        permissions: [
          'email',
          'public_profile',
          'instagram_basic', // Access Instagram profile and media
        ],
      },
    });

    console.log('Login successful!');
    console.log('User ID:', result.result.profile.userID);
    console.log('Email:', result.result.profile.email);

    // Get Instagram business account info
    const profile = await SocialLogin.providerSpecificCall({
      call: 'facebook#getProfile',
      options: {
        fields: [
          'id',
          'name',
          'instagram_business_account{id,username,profile_picture_url,followers_count,media_count}',
        ],
      },
    });

    const instagramAccount = profile.profile.instagram_business_account;
    if (instagramAccount) {
      console.log('Instagram Username:', instagramAccount.username);
      console.log('Followers:', instagramAccount.followers_count);
      console.log('Media Count:', instagramAccount.media_count);
    }

    return {
      success: true,
      accessToken: result.result.accessToken?.token,
      instagramAccount,
    };
  } catch (error) {
    console.error('Instagram login failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 2: Login with Pages Management
 * Useful for apps that manage Facebook Pages
 */
export async function loginWithPages() {
  try {
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: {
        permissions: [
          'email',
          'pages_show_list', // List user's Pages
          'pages_read_engagement', // Read Page metrics
          'pages_manage_posts', // Manage Page posts
        ],
      },
    });

    // Get user's managed Pages with Instagram accounts
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

    const pages = profile.profile.accounts?.data || [];
    console.log(`Found ${pages.length} managed pages`);

    // Return pages with their Instagram accounts
    return {
      success: true,
      accessToken: result.result.accessToken?.token,
      pages: pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        instagram: page.instagram_business_account,
      })),
    };
  } catch (error) {
    console.error('Pages login failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 3: Login with Full Business Access
 * Comprehensive business permissions for advanced integrations
 */
export async function loginWithFullBusinessAccess() {
  try {
    const result = await SocialLogin.login({
      provider: 'facebook',
      options: {
        permissions: [
          'email',
          'public_profile',
          // Instagram permissions
          'instagram_basic',
          'instagram_manage_insights',
          'instagram_manage_comments',
          // Pages permissions
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          // Business permissions
          'business_management',
        ],
      },
    });

    console.log('Full business access granted!');

    return {
      success: true,
      accessToken: result.result.accessToken?.token,
      userId: result.result.profile.userID,
      email: result.result.profile.email,
    };
  } catch (error) {
    console.error('Business login failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 4: Fetch Instagram Media
 * Get media from connected Instagram account
 */
export async function getInstagramMedia(accessToken: string, instagramAccountId: string) {
  try {
    // Use Facebook Graph API to get Instagram media
    // Note: Update API version (v17.0) to the latest available version
    // See https://developers.facebook.com/docs/graph-api/guides/versioning
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${instagramAccountId}/media?` +
        `fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count` +
        `&access_token=${accessToken}`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      success: true,
      media: data.data,
      paging: data.paging,
    };
  } catch (error) {
    console.error('Failed to fetch Instagram media:', error);
    return { success: false, error };
  }
}

/**
 * Example 5: Fetch Page Insights
 * Get engagement metrics for a Facebook Page
 */
export async function getPageInsights(pageAccessToken: string, pageId: string) {
  try {
    // Get Page insights for the last 30 days
    // Note: Update API version (v17.0) to the latest available version
    // See https://developers.facebook.com/docs/graph-api/guides/versioning
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${pageId}/insights?` +
        `metric=page_impressions,page_engaged_users,page_post_engagements` +
        `&period=day` +
        `&access_token=${pageAccessToken}`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      success: true,
      insights: data.data,
    };
  } catch (error) {
    console.error('Failed to fetch page insights:', error);
    return { success: false, error };
  }
}

/**
 * Example 6: Check Login Status
 */
export async function checkBusinessLoginStatus() {
  try {
    const status = await SocialLogin.isLoggedIn({
      provider: 'facebook',
    });

    return status.isLoggedIn;
  } catch (error) {
    console.error('Failed to check login status:', error);
    return false;
  }
}

/**
 * Example 7: Logout
 */
export async function logoutFromBusiness() {
  try {
    await SocialLogin.logout({
      provider: 'facebook',
    });
    console.log('Logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 8: Handle Permission Errors Gracefully
 */
export async function loginWithGracefulHandling() {
  try {
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

    // Check which permissions were granted
    const grantedPermissions = result.result.accessToken?.permissions || [];
    const declinedPermissions = result.result.accessToken?.declinedPermissions || [];

    console.log('Granted permissions:', grantedPermissions);
    console.log('Declined permissions:', declinedPermissions);

    // Provide fallback functionality for declined permissions
    if (declinedPermissions.includes('instagram_basic')) {
      console.warn('Instagram access not granted. Some features will be limited.');
    }

    return {
      success: true,
      grantedPermissions,
      declinedPermissions,
    };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 9: Complete Business Integration Flow
 * Demonstrates a full integration with error handling
 */
export async function completeBusinessIntegration() {
  try {
    // Step 1: Initialize
    await initializeFacebookBusiness('your-app-id', 'your-client-token');

    // Step 2: Check if already logged in
    const isLoggedIn = await checkBusinessLoginStatus();
    if (isLoggedIn) {
      console.log('Already logged in');
      return { success: true, alreadyLoggedIn: true };
    }

    // Step 3: Login with business permissions
    const loginResult = await loginWithFullBusinessAccess();
    if (!loginResult.success) {
      throw new Error('Login failed');
    }

    // Step 4: Get user profile with business data
    const profile = await SocialLogin.providerSpecificCall({
      call: 'facebook#getProfile',
      options: {
        fields: [
          'id',
          'name',
          'email',
          'accounts{id,name,access_token,instagram_business_account{id,username,followers_count}}',
        ],
      },
    });

    // Step 5: Process business data
    const pages = profile.profile.accounts?.data || [];
    const instagramAccounts = pages
      .filter((page: any) => page.instagram_business_account)
      .map((page: any) => ({
        pageName: page.name,
        instagram: page.instagram_business_account,
      }));

    console.log('Integration complete!');
    console.log(`Found ${pages.length} pages`);
    console.log(`Found ${instagramAccounts.length} Instagram accounts`);

    return {
      success: true,
      user: {
        id: profile.profile.id,
        name: profile.profile.name,
        email: profile.profile.email,
      },
      pages,
      instagramAccounts,
    };
  } catch (error) {
    console.error('Integration failed:', error);
    return { success: false, error };
  }
}

/**
 * Example 10: Refresh Access Token
 */
export async function refreshBusinessToken() {
  try {
    await SocialLogin.refresh({
      provider: 'facebook',
      options: {
        permissions: [], // Keep existing permissions
      },
    });

    console.log('Token refreshed successfully');
    return { success: true };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false, error };
  }
}

// Type definitions for better TypeScript support
export interface BusinessLoginResult {
  success: boolean;
  accessToken?: string;
  userId?: string;
  email?: string;
  error?: any;
}

export interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  instagram?: InstagramAccount;
}
