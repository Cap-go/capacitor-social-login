# Migration guide for the V1 version

## Introduction

> [!WARNING]
> This guide is for the `V1`/`V7` version of the plugin for people who were sitll using this plugin with the `0.x.x` version.

This guide will cover the following:

- Migrating to the V1 version from the `main` version

- Migrating to the V1 version from the `development` version

## Important changes in V1

V1 is just a port of the development version into main. It does, however, include a lot of important changes that are not available in the `main` V0 version. Those changes include:

- Access scopes for Google login

- Offline mode for Google login

- Unification of the different implementations.
  
  - Extensive testing was conducted to ensure that all implementations of the Google Provider behave in the same way between platforms

## Migration from the V0 main version

- Changes in the `MainActivity.java` for Android
  
  - Please follow the [Google Setup Guide](../providers/google/android.md). Specifically, please search for `MainActivity.java`

- Please add redirect urls in the Google Console. Without adding redirect urls, Google login will not work. 
  
  - Again, please follow the [Google Setup Guide](../providers/google/android.md). Specifically, please search for `Authorized redirect URIs`

- Please ensure that you are not using `grantOfflineAccess` in the config. This feature is not supported in V1.

- Please ensure that authentication works on all the platforms.

## Migration from the V0 development version

Changes in the `MainActivity.java` for Android

- Please follow the [Google Setup Guide](../providers/google/android.md). Specifically, please search for `MainActivity.java`. In V1, you **HAVE TO** implement `ModifiedMainActivityForSocialLoginPlugin` in your main activity. This change is crucial for the plugin to work
- Please add redirect urls in the Google Console. Without adding redirect urls, Google login will not work.
  - Again, please follow the [Google Setup Guide](../providers/google/android.md). Specifically, please search for `Authorized redirect URIs`
- Please ensure that types and variable names are correct. Please know that types and variables might not match between development and V1.
- Please ensure that authentication works on all the platforms.
