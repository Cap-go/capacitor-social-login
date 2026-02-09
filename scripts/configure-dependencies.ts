#!/usr/bin/env node

/**
 * Capacitor Hook Script: Configure Dynamic Provider Dependencies
 *
 * This script runs after `npx cap sync` and configures which providers
 * to include based on capacitor.config.ts settings.
 *
 * Environment variables provided by Capacitor:
 * - CAPACITOR_ROOT_DIR: Root directory of the consuming app
 * - CAPACITOR_CONFIG: JSON stringified config object
 * - CAPACITOR_PLATFORM_NAME: Platform name (android, ios, web)
 * - process.cwd(): Plugin root directory
 */

import * as fs from 'fs';
import * as path from 'path';

// Get environment variables
const PLUGIN_ROOT = process.cwd();
// Not used for now
// const APP_ROOT = process.env.CAPACITOR_ROOT_DIR;
const CONFIG_JSON = process.env.CAPACITOR_CONFIG;
const PLATFORM = process.env.CAPACITOR_PLATFORM_NAME;

// File paths
// Not used for now
// const androidGradlePath = path.join(PLUGIN_ROOT, 'android', 'build.gradle');
const gradlePropertiesPath = path.join(PLUGIN_ROOT, 'android', 'gradle.properties');
const podspecPath = path.join(PLUGIN_ROOT, 'CapgoCapacitorSocialLogin.podspec');

// Default provider configuration (backward compatible)
const defaultProviders: Record<string, string | boolean> = {
  google: 'implementation',
  facebook: 'implementation',
  apple: 'implementation',
  twitter: 'implementation',
};

/**
 * 0 - Error
 * 1 - Warning
 * 2 - Info
 * 3 - Success
 */
let logLevel = 3;

type ProviderConfig = Record<string, string | boolean>;

// ============================================================================
// Common: Logging Utilities
// ============================================================================

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Capacitor-style colored logging with emojis
 */
function log(message: string, emoji = '', color = ''): void {
  const emojiPart = emoji ? `${emoji} ` : '';
  const colorCode = color || colors.reset;
  const resetCode = color ? colors.reset : '';
  console.log(`${colorCode}${emojiPart}${message}${resetCode}`);
}

function logError(message: string): void {
  if (logLevel >= 0) {
    log(message, '✖', colors.red);
  }
}

function logWarning(message: string): void {
  if (logLevel >= 1) {
    log(message, '⚠', colors.yellow);
  }
}

function logInfo(message: string): void {
  if (logLevel >= 2) {
    log(message, 'ℹ', colors.blue);
  }
}

function logSuccess(message: string): void {
  if (logLevel >= 3) {
    log(message, '✔', colors.green);
  }
}

/**
 * Log provider configuration status
 */
function logProviderConfig(providerConfig: ProviderConfig): void {
  if (logLevel < 3) {
    return;
  }
  log('\nProvider configuration:', '', colors.bright);
  const providers = ['google', 'facebook', 'apple', 'twitter'];
  for (const provider of providers) {
    const config = providerConfig[provider];
    const isEnabled = config === 'implementation';
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    if (isEnabled) {
      // Enabled - green checkmark
      console.log(
        `  ${colors.green}✔${colors.reset} ${colors.bright}${providerName}${colors.reset}: ${colors.green}enabled${colors.reset}`,
      );
    } else {
      // Disabled - red cross
      console.log(
        `  ${colors.red}✖${colors.reset} ${colors.bright}${providerName}${colors.reset}: ${colors.red}disabled${colors.reset}`,
      );
    }
  }
  console.log('');
}

// ============================================================================
// Common: Configuration Parsing
// ============================================================================

/**
 * Parse provider configuration from Capacitor config
 * Supports: true = implementation, false = compileOnly
 */
function getProviderConfig(): ProviderConfig {
  try {
    if (!CONFIG_JSON) {
      logWarning('No CAPACITOR_CONFIG found, using defaults');
      return defaultProviders;
    }

    const config = JSON.parse(CONFIG_JSON);
    logLevel = config.plugins?.SocialLogin?.logLevel ?? 3;
    const providerConfig = config.plugins?.SocialLogin?.providers || defaultProviders;

    // Normalize config: convert true to 'implementation', false to 'compileOnly'
    const normalized: ProviderConfig = {};
    for (const [provider, value] of Object.entries(providerConfig)) {
      if (value === true) {
        normalized[provider] = 'implementation';
      } else if (value === false) {
        normalized[provider] = 'compileOnly';
      } else {
        // Legacy support: if someone passes a string, use it as-is
        normalized[provider] = value as string;
      }
    }

    // Merge with defaults for missing providers
    return { ...defaultProviders, ...normalized };
  } catch (error) {
    logError(`Error parsing config: ${(error as Error).message}`);
    return defaultProviders;
  }
}

// ============================================================================
// Android: Gradle Configuration
// ============================================================================

/**
 * Write gradle.properties file for Android
 * Injects SocialLogin properties while preserving existing content
 */
function configureAndroid(providerConfig: ProviderConfig): void {
  logInfo('Configuring Android dependencies...');

  try {
    // Read existing gradle.properties if it exists
    let existingContent = '';
    if (fs.existsSync(gradlePropertiesPath)) {
      existingContent = fs.readFileSync(gradlePropertiesPath, 'utf8');
    }

    // Remove existing SocialLogin properties (if any)
    const lines = existingContent.split('\n');
    const filteredLines: string[] = [];
    let inSocialLoginSection = false;
    let lastWasEmpty = false;

    for (const line of lines) {
      // Check if this is a SocialLogin property or comment
      if (
        line.trim().startsWith('# SocialLogin') ||
        line.trim().startsWith('socialLogin.') ||
        line.trim() === '# Generated by SocialLogin hook script'
      ) {
        inSocialLoginSection = true;
        continue; // Skip this line
      }

      // If we were in SocialLogin section and hit a non-empty line, we're done
      if (inSocialLoginSection && line.trim() !== '') {
        inSocialLoginSection = false;
      }

      // Add non-SocialLogin lines, but avoid multiple consecutive empty lines
      if (!inSocialLoginSection) {
        if (line.trim() === '') {
          if (!lastWasEmpty) {
            filteredLines.push(line);
            lastWasEmpty = true;
          }
        } else {
          filteredLines.push(line);
          lastWasEmpty = false;
        }
      }
    }

    // Build new SocialLogin properties section
    const socialLoginProperties: string[] = [];
    socialLoginProperties.push('');
    socialLoginProperties.push('# SocialLogin Provider Dependencies (auto-generated)');
    socialLoginProperties.push('# Generated by SocialLogin hook script');

    for (const [provider, value] of Object.entries(providerConfig)) {
      const dependencyType = value === 'compileOnly' ? 'compileOnly' : 'implementation';
      const include = dependencyType === 'compileOnly' ? 'false' : 'true';

      socialLoginProperties.push(`socialLogin.${provider}.include=${include}`);
      socialLoginProperties.push(`socialLogin.${provider}.dependencyType=${dependencyType}`);
    }

    // Combine: existing content + new SocialLogin properties
    const newContent = filteredLines.join('\n') + '\n' + socialLoginProperties.join('\n') + '\n';

    fs.writeFileSync(gradlePropertiesPath, newContent, 'utf8');
    logSuccess('Updated gradle.properties');
  } catch (error) {
    logError(`Error updating gradle.properties: ${(error as Error).message}`);
  }
}

// ============================================================================
// iOS: Podspec Configuration
// ============================================================================

/**
 * Modify Podspec for iOS conditional dependencies
 */
function configureIOS(providerConfig: ProviderConfig): void {
  logInfo('Configuring iOS dependencies...');

  try {
    let podspecContent = fs.readFileSync(podspecPath, 'utf8');

    // Replace dependency declarations with conditional ones
    // Handle both active and commented-out dependencies (including existing disabled comments)
    const replacements: { old: RegExp; new: string }[] = [
      {
        // Google SignIn - handle both active and commented (including existing disabled comments)
        old: /(#\s*)?s\.dependency\s+'GoogleSignIn',\s*'~>\s*9\.0\.0'(\s*#.*)?/,
        new:
          providerConfig.google === 'implementation'
            ? `s.dependency 'GoogleSignIn', '~> 9.0.0'`
            : `# s.dependency 'GoogleSignIn', '~> 9.0.0'  # Disabled via config (compileOnly)`,
      },
      {
        // Facebook Core - handle both active and commented (including existing disabled comments)
        old: /(#\s*)?s\.dependency\s+'FBSDKCoreKit',\s*'18\.0\.0'(\s*#.*)?/,
        new:
          providerConfig.facebook === 'implementation'
            ? `s.dependency 'FBSDKCoreKit', '18.0.0'`
            : `# s.dependency 'FBSDKCoreKit', '18.0.0'  # Disabled via config (compileOnly)`,
      },
      {
        // Facebook Login - handle both active and commented (including existing disabled comments)
        old: /(#\s*)?s\.dependency\s+'FBSDKLoginKit',\s*'18\.0\.0'(\s*#.*)?/,
        new:
          providerConfig.facebook === 'implementation'
            ? `s.dependency 'FBSDKLoginKit', '18.0.0'`
            : `# s.dependency 'FBSDKLoginKit', '18.0.0'  # Disabled via config (compileOnly)`,
      },
      {
        // Alamofire (for Apple) - handle both active and commented (including existing disabled comments)
        old: /(#\s*)?s\.dependency\s+'Alamofire',\s*'~>\s*5\.10\.2'(\s*#.*)?/,
        new:
          providerConfig.apple === 'implementation'
            ? `s.dependency 'Alamofire', '~> 5.10.2'`
            : `# s.dependency 'Alamofire', '~> 5.10.2'  # Disabled via config (compileOnly)`,
      },
    ];

    let modified = false;
    for (const replacement of replacements) {
      if (replacement.old.test(podspecContent)) {
        const before = podspecContent;
        podspecContent = podspecContent.replace(replacement.old, replacement.new);
        if (before !== podspecContent) {
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(podspecPath, podspecContent, 'utf8');
      logSuccess('Modified podspec');
    } else {
      logInfo('Podspec already up to date');
    }
  } catch (error) {
    logError(`Error modifying podspec: ${(error as Error).message}`);
  }
}

// ============================================================================
// Web: No Configuration Needed
// ============================================================================

/**
 * Web platform doesn't need native dependency configuration
 */
function configureWeb(): void {
  logInfo('Skipping conditional dependency compilation for web platform');
  logInfo('Web platform uses JavaScript dependencies managed by npm/bundler');
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Main execution
 */
function main(): void {
  // Route to platform-specific configuration
  switch (PLATFORM) {
    case 'android':
      // eslint-disable-next-line no-case-declarations
      const androidConfig = getProviderConfig();
      logInfo('Configuring dynamic provider dependencies for SocialLogin');
      logProviderConfig(androidConfig);
      configureAndroid(androidConfig);
      logSuccess('Configuration complete\n');
      break;

    case 'ios':
      // eslint-disable-next-line no-case-declarations
      const iosConfig = getProviderConfig();
      logInfo('Configuring dynamic provider dependencies for SocialLogin');
      logProviderConfig(iosConfig);
      configureIOS(iosConfig);
      logSuccess('Configuration complete\n');
      break;

    case 'web':
      configureWeb();
      break;

    default:
      // If platform is not specified, configure all platforms (backward compatibility)

      // eslint-disable-next-line no-case-declarations
      const defaultConfig = getProviderConfig();
      logInfo('Configuring dynamic provider dependencies for SocialLogin');
      logProviderConfig(defaultConfig);
      logWarning(`Unknown platform: ${PLATFORM || 'undefined'}, configuring all platforms`);
      configureAndroid(defaultConfig);
      configureIOS(defaultConfig);
      logSuccess('Configuration complete\n');
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { getProviderConfig, configureAndroid, configureIOS, configureWeb };
