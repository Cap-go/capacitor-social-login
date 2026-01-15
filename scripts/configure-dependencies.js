#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderConfig = getProviderConfig;
exports.configureAndroid = configureAndroid;
exports.configureIOS = configureIOS;
exports.configureWeb = configureWeb;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
const defaultProviders = {
    google: 'implementation',
    facebook: 'implementation',
    apple: 'implementation',
    twitter: 'implementation',
};
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
function log(message, emoji = '', color = '') {
    const emojiPart = emoji ? `${emoji} ` : '';
    const colorCode = color || colors.reset;
    const resetCode = color ? colors.reset : '';
    console.log(`${colorCode}${emojiPart}${message}${resetCode}`);
}
function logSuccess(message) {
    log(message, '✔', colors.green);
}
function logError(message) {
    log(message, '✖', colors.red);
}
function logInfo(message) {
    log(message, 'ℹ', colors.blue);
}
function logWarning(message) {
    log(message, '⚠', colors.yellow);
}
/**
 * Log provider configuration status
 */
function logProviderConfig(providerConfig) {
    log('\nProvider configuration:', '', colors.bright);
    const providers = ['google', 'facebook', 'apple', 'twitter'];
    for (const provider of providers) {
        const config = providerConfig[provider];
        const isEnabled = config === 'implementation';
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        if (isEnabled) {
            // Enabled - green checkmark
            console.log(`  ${colors.green}✔${colors.reset} ${colors.bright}${providerName}${colors.reset}: ${colors.green}enabled${colors.reset}`);
        }
        else {
            // Disabled - red cross
            console.log(`  ${colors.red}✖${colors.reset} ${colors.bright}${providerName}${colors.reset}: ${colors.red}disabled${colors.reset}`);
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
function getProviderConfig() {
    try {
        if (!CONFIG_JSON) {
            logInfo('No CAPACITOR_CONFIG found, using defaults');
            return defaultProviders;
        }
        const config = JSON.parse(CONFIG_JSON);
        const providerConfig = config.plugins?.SocialLogin?.providers || defaultProviders;
        // Normalize config: convert true to 'implementation', false to 'compileOnly'
        const normalized = {};
        for (const [provider, value] of Object.entries(providerConfig)) {
            if (value === true) {
                normalized[provider] = 'implementation';
            }
            else if (value === false) {
                normalized[provider] = 'compileOnly';
            }
            else {
                // Legacy support: if someone passes a string, use it as-is
                normalized[provider] = value;
            }
        }
        // Merge with defaults for missing providers
        return { ...defaultProviders, ...normalized };
    }
    catch (error) {
        logError(`Error parsing config: ${error.message}`);
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
function configureAndroid(providerConfig) {
    logInfo('Configuring Android dependencies...');
    try {
        // Read existing gradle.properties if it exists
        let existingContent = '';
        if (fs.existsSync(gradlePropertiesPath)) {
            existingContent = fs.readFileSync(gradlePropertiesPath, 'utf8');
        }
        // Remove existing SocialLogin properties (if any)
        const lines = existingContent.split('\n');
        const filteredLines = [];
        let inSocialLoginSection = false;
        let lastWasEmpty = false;
        for (const line of lines) {
            // Check if this is a SocialLogin property or comment
            if (line.trim().startsWith('# SocialLogin') ||
                line.trim().startsWith('socialLogin.') ||
                line.trim() === '# Generated by SocialLogin hook script') {
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
                }
                else {
                    filteredLines.push(line);
                    lastWasEmpty = false;
                }
            }
        }
        // Build new SocialLogin properties section
        const socialLoginProperties = [];
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
    }
    catch (error) {
        logError(`Error updating gradle.properties: ${error.message}`);
    }
}
// ============================================================================
// iOS: Podspec Configuration
// ============================================================================
/**
 * Modify Podspec for iOS conditional dependencies
 */
function configureIOS(providerConfig) {
    logInfo('Configuring iOS dependencies...');
    try {
        let podspecContent = fs.readFileSync(podspecPath, 'utf8');
        // Replace dependency declarations with conditional ones
        // Handle both active and commented-out dependencies (including existing disabled comments)
        const replacements = [
            {
                // Google SignIn - handle both active and commented (including existing disabled comments)
                old: /(#\s*)?s\.dependency\s+'GoogleSignIn',\s*'~>\s*9\.0\.0'(\s*#.*)?/,
                new: providerConfig.google === 'implementation'
                    ? `s.dependency 'GoogleSignIn', '~> 9.0.0'`
                    : `# s.dependency 'GoogleSignIn', '~> 9.0.0'  # Disabled via config (compileOnly)`,
            },
            {
                // Facebook Core - handle both active and commented (including existing disabled comments)
                old: /(#\s*)?s\.dependency\s+'FBSDKCoreKit',\s*'18\.0\.0'(\s*#.*)?/,
                new: providerConfig.facebook === 'implementation'
                    ? `s.dependency 'FBSDKCoreKit', '18.0.0'`
                    : `# s.dependency 'FBSDKCoreKit', '18.0.0'  # Disabled via config (compileOnly)`,
            },
            {
                // Facebook Login - handle both active and commented (including existing disabled comments)
                old: /(#\s*)?s\.dependency\s+'FBSDKLoginKit',\s*'18\.0\.0'(\s*#.*)?/,
                new: providerConfig.facebook === 'implementation'
                    ? `s.dependency 'FBSDKLoginKit', '18.0.0'`
                    : `# s.dependency 'FBSDKLoginKit', '18.0.0'  # Disabled via config (compileOnly)`,
            },
            {
                // Alamofire (for Apple) - handle both active and commented (including existing disabled comments)
                old: /(#\s*)?s\.dependency\s+'Alamofire',\s*'~>\s*5\.10\.2'(\s*#.*)?/,
                new: providerConfig.apple === 'implementation'
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
        }
        else {
            logInfo('Podspec already up to date');
        }
    }
    catch (error) {
        logError(`Error modifying podspec: ${error.message}`);
    }
}
// ============================================================================
// Web: No Configuration Needed
// ============================================================================
/**
 * Web platform doesn't need native dependency configuration
 */
function configureWeb() {
    logInfo('Skipping conditional dependency compilation for web platform');
    logInfo('Web platform uses JavaScript dependencies managed by npm/bundler');
}
// ============================================================================
// Main Execution
// ============================================================================
/**
 * Main execution
 */
function main() {
    // Route to platform-specific configuration
    switch (PLATFORM) {
        case 'android':
            log('Configuring dynamic provider dependencies for SocialLogin', '🔧', colors.cyan);
            // eslint-disable-next-line no-case-declarations
            const androidConfig = getProviderConfig();
            logProviderConfig(androidConfig);
            configureAndroid(androidConfig);
            logSuccess('Configuration complete\n');
            break;
        case 'ios':
            log('Configuring dynamic provider dependencies for SocialLogin', '🔧', colors.cyan);
            // eslint-disable-next-line no-case-declarations
            const iosConfig = getProviderConfig();
            logProviderConfig(iosConfig);
            configureIOS(iosConfig);
            logSuccess('Configuration complete\n');
            break;
        case 'web':
            configureWeb();
            break;
        default:
            // If platform is not specified, configure all platforms (backward compatibility)
            log('Configuring dynamic provider dependencies for SocialLogin', '🔧', colors.blue);
            // eslint-disable-next-line no-case-declarations
            const defaultConfig = getProviderConfig();
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
