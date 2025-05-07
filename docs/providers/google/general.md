<script setup lang="ts">
import Picture from '../../components/Picture.vue';
</script>

# Google Login Setup

## Introduction

In this guide, you will learn how to setup Google Login with Capgo Social Login. You will need the following in order to setup Google Login:

- A Google account

## General setup

This step is required regardless of which the platform you decide to use. In this part, you will setup the login screen displayed by Google. 

1. Please go to [console.cloud.google.com](https://console.cloud.google.com/)

2. If you don't have a project already, please **create a new project**.
   
   - Click on the project selector
     <Picture src="../../assets/google_cons_project_selector.png" alt="Google Console Project Selector" />
   
   - Click `New project`
     <Picture src="../../assets/google_cons_new_project_btn.png" alt="New Project button in Google Console" />
   
   - Name your project and click `Create`
     <Picture src="../../assets/google_cons_name_projec.png" alt="Project naming screen showing name field and Create button" />
   
   - Ensure that you are on the right project
     <Picture src="../../assets/google_cons_right_proj.png" alt="Project name showing in the selector indicating correct project selection" />

3. Configure the  `OAuth consent screen`
   
   - Click on the search bar
     <Picture src="../../assets/google_cons_search.png" alt="Google Console search bar" />
   
   - Search for `OAuth consent screen` and click on it
     <Picture src="../../assets/google_cons_search_2.png" alt="Search results showing OAuth consent screen option" />
   
   - Configure the consent screen. I will assume that you are developing an app open to the public, so I will use the  `external`  user type. Please select the user type that suits you the best AND click `create`
     <Picture src="../../assets/google_cons_oauth_const_scr.png" alt="OAuth consent screen user type selection with External and Internal options" />
   
   - Now, you have a lot of informations to fill
     
     - Let's start with the `App Information`
       <Picture src="../../assets/google_cons_app_inf.png" alt="App Information section showing App name and User support email fields" />
       Please type in your `App Name`. **WARNING: THIS WILL BE DISPLAYED TO THE USERS**
       
       Next, please enter the User support email. You can learn more about the support email [here](https://support.google.com/cloud/answer/10311615#user-support-email&zippy=%2Cuser-support-email)
     
     - Then, you **CAN** add the app logo. This is not obligatory and I will skip this step
       <Picture src="../../assets/google_cons_app_logo.png" alt="App logo upload section in OAuth consent screen" />
     
     - Then, you **SHOULD** configure the `App domain`. I will not do that because this is just a simple demonstration that will **NOT** get published, but I strongly recommend filling this section.
       <Picture src="../../assets/google_cons_app_doma.png" alt="App domain configuration section with authorized domains field" />
     
     - Later, you **HAVE TO** provide the developer's email.
       <Picture src="../../assets/google_cons_dev_cont_inf.png" alt="Developer contact information section with email field" />
   
   - Please click `save and continue`
     <Picture src="../../assets/google_cons_cons_sav_cont.png" alt="Save and Continue button at bottom of form" />

4. Next, please configure the scopes
   
   - Click on `add or remove scopes` 
     <Picture src="../../assets/google_cons_add_rm_sco.png" alt="Add or remove scopes button in scopes configuration screen" />
   
   - Select the following scopes and click `update`
     <Picture src="../../assets/google_cons_update_scope.png" alt="Scope selection dialog with email and profile scopes selected" />
   
   - Click `save and continue`
     <Picture src="../../assets/google_cons_scope_save.png" alt="Save and Continue button in scopes screen" />

5. Now, you need to add a test user.
   
   - Click on `add users`
     <Picture src="../../assets/google_cons_add_test_usr.png" alt="Add users button in test users section" />
   
   - Enter your Google email, click enter, and click `add`
     <Picture src="../../assets/google_cons_add_test_usr_2.png" alt="Email input field and Add button for test users" />
   
   - Click `save and continue`
     <Picture src="../../assets/google_cons_test_usr_save.png" alt="Save and Continue button in test users screen" />

6. Click `back to dashboard`
   <Picture src="../../assets/google_cons_back_to_dahs.png" alt="Back to dashboard button at bottom of completion page" />

7. I strongly recommend submitting you app for verification. This is outside the scope of this tutorial. You can learn more [here](https://support.google.com/cloud/answer/13463073)