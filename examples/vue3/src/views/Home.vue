<script lang="ts" setup>
import {
  IonContent,
  IonButton,
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonAvatar,
  IonItem,
  IonLabel,
  IonInput,
  IonList,
} from '@ionic/vue';
import { useStorage, StorageSerializers } from '@vueuse/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { onMounted, ref } from 'vue';
import GoogleIcon from '../components/GoogleIcon.vue';

const isInitialized = ref(false);

onMounted(async() => {
  if (isInitialized.value) return;
  await SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        iOSClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID_IOS,
      },
    });
  isInitialized.value = true;
});

const session = useStorage<{ user: any }>('capacitor-google-auth', null, undefined, {
  serializer: StorageSerializers.object,
  mergeDefaults: true,
});
// const isLoggedIn = computed(() => store.value !== null);

async function signIn() {
  await SocialLogin.login({
    provider: 'google',
    options: {
      // scopes: ['profile', 'email'],
      style: 'bottom',
    },
  })
    .then((user) => {
      session.value.user = user;
    })
    .catch((error) => {
      console.error(error);
    });
}

async function signOut() {
  // await GoogleAuth.signOut()
  //   .then(() => {
  //     session.value = null;
  //   })
  //   .catch((error) => {
  //     console.error(error);
  //   });
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Capacitor Google Auth</ion-title>
        <ion-buttons slot="end" v-if="session?.user">
          <ion-button @click="signOut()"> Signout </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :color="session?.user ? 'light' : undefined">
      <div v-if="!isInitialized">Not initialized</div>
      <template v-if="session?.user">
        <div class="">
          <div v-if="session.user.imageUrl" class="ion-padding header">
            <ion-avatar class="avatar">
              <img :src="session.user.imageUrl" />
            </ion-avatar>
          </div>

          <IonList :inset="true">
            <template v-for="(value, key) in session.user" :key="key">
              <ion-item v-if="typeof value === 'string'">
                <ion-input label-placement="fixed" :value="`${value}`" readonly></ion-input>
              </ion-item>

              <template v-else-if="typeof value === 'object'">
                <ion-item>
                  <IonLabel>{{ key }}:</IonLabel>
                </ion-item>
                <ion-item v-for="(v, k) in value" :key="`${key}-${k}`">
                  <ion-input label-placement="floating" :label="`${k}`" :value="`${v}`" readonly></ion-input>
                </ion-item>
              </template>
            </template>
          </IonList>
        </div>
      </template>
      <template v-else>
        <div class="ion-text-center ion-padding">
          <ion-button color="light" @click="signIn()">
            <GoogleIcon class="google-icon" />
            <span>Login with Google</span>
          </ion-button>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<style>
.google-icon {
  height: 20px;
  margin-right: 12px;
  min-width: 20px;
  width: 20px;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.label-text,
.label {
  font-size: 16px;
}
</style>
