<script setup lang="ts">
import { ref, computed } from 'vue';
import { useData } from 'vitepress';

const { isDark } = useData();

const packageManager = ref('npm');
const packageManagers = [
  { value: 'npm', label: 'npm', installCmd: 'npm install @capgo/capacitor-social-login', syncCmd: 'npx cap sync', icon: '/assets/icons/npm.svg' },
  { value: 'pnpm', label: 'pnpm', installCmd: 'pnpm add @capgo/capacitor-social-login', syncCmd: 'pnpm exec cap sync', icon: '/assets/icons/pnpm.svg' },
  { value: 'yarn', label: 'yarn', installCmd: 'yarn add @capgo/capacitor-social-login', syncCmd: 'yarn cap sync', icon: '/assets/icons/yarn.svg' },
  { value: 'bun', label: 'bun', installCmd: 'bun add @capgo/capacitor-social-login', syncCmd: 'bunx cap sync', icon: '/assets/icons/bun.svg' }
];

const socialProviders = [
  { value: 'google', label: 'Google', icon: '/assets/icons/google.svg', docsUrl: 'https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_google.md' },
  { value: 'facebook', label: 'Facebook', icon: '/assets/icons/facebook.svg', docsUrl: 'https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_facebook.md' },
  { value: 'apple', label: 'Apple', icon: '/assets/icons/apple.svg', docsUrl: 'https://github.com/Cap-go/capacitor-social-login/blob/main/docs/setup_apple.md' }
];

const selectedPackageManager = computed(() => {
  return packageManagers.find(pm => pm.value === packageManager.value)!;
});

const copyStates = ref({
  install: false,
  sync: false
});

function copyCommand(command: string, type: 'install' | 'sync') {
  navigator.clipboard.writeText(command);
  copyStates.value[type] = true;
  
  setTimeout(() => {
    copyStates.value[type] = false;
  }, 2000);
}

function openDocumentation(url: string) {
  window.open(url, '_blank');
}
</script>

<template>
  <div class="install-container">
    <h1 class="install-title">Installation</h1>
    
    <div class="package-manager-selector">
      <span class="label">Package Manager:</span>
      <div class="button-group">
        <button 
          v-for="pm in packageManagers" 
          :key="pm.value"
          :class="['pm-button', { active: packageManager === pm.value }]"
          @click="packageManager = pm.value"
        >
          <img :src="pm.icon" :alt="pm.label" class="pm-icon" />
          <span class="pm-label">{{ pm.label }}</span>
        </button>
      </div>
    </div>

    <div class="install-steps">
      <div class="step">
        <div class="step-header">
          <span class="step-number">1</span>
          <h3>Install the package</h3>
          <button class="copy-button" @click="copyCommand(selectedPackageManager.installCmd, 'install')" title="Copy to clipboard">
            <span v-if="!copyStates.install" class="icon clipboard">📋</span>
            <span v-else class="icon check">✓</span>
          </button>
        </div>
        <pre class="code-block" @click="copyCommand(selectedPackageManager.installCmd, 'install')">{{ selectedPackageManager.installCmd }}</pre>
      </div>

      <div class="step">
        <div class="step-header">
          <span class="step-number">2</span>
          <h3>Sync with native projects</h3>
          <button class="copy-button" @click="copyCommand(selectedPackageManager.syncCmd, 'sync')" title="Copy to clipboard">
            <span v-if="!copyStates.sync" class="icon clipboard">📋</span>
            <span v-else class="icon check">✓</span>
          </button>
        </div>
        <pre class="code-block" @click="copyCommand(selectedPackageManager.syncCmd, 'sync')">{{ selectedPackageManager.syncCmd }}</pre>
      </div>
      
      <div class="step">
        <div class="step-header">
          <span class="step-number">3</span>
          <h3>Configure the plugin</h3>
        </div>
        <div class="social-providers">
          <button 
            v-for="provider in socialProviders" 
            :key="provider.value"
            class="provider-button"
            @click="openDocumentation(provider.docsUrl)"
            :title="`Configure ${provider.label}`"
          >
            <img :src="provider.icon" :alt="provider.label" class="provider-icon" />
            <span class="provider-label">{{ provider.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');

.install-container {
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  max-width: 800px;
  margin: 0 auto;
  background-color: v-bind('isDark ? "#313244" : "#ffffff"');
  color: v-bind('isDark ? "#cdd6f4" : "#4a5568"');
}

.install-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
}

.package-manager-selector {
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.label {
  font-weight: 600;
  font-size: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.pm-button {
  padding: 0.5rem 1rem;
  border: 1px solid v-bind('isDark ? "#6c7086" : "#e2e8f0"');
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: v-bind('isDark ? "#45475a" : "#f8fafc"');
  color: v-bind('isDark ? "#cdd6f4" : "#4a5568"');
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pm-icon {
  width: 20px;
  height: 20px;
}

.pm-button.active {
  font-weight: bold;
  background-color: v-bind('isDark ? "#74c7ec" : "#3b82f6"');
  color: v-bind('isDark ? "#181825" : "#ffffff"');
}

.install-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  border: 1px solid v-bind('isDark ? "#6c7086" : "#e2e8f0"');
  border-radius: 6px;
  overflow: hidden;
  background-color: v-bind('isDark ? "#45475a" : "#ffffff"');
}

.step-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid v-bind('isDark ? "#6c7086" : "#e2e8f0"');
  background-color: v-bind('isDark ? "#313244" : "#f8fafc"');
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: bold;
  margin-right: 0.75rem;
  background-color: v-bind('isDark ? "#74c7ec" : "#3b82f6"');
  color: v-bind('isDark ? "#181825" : "#ffffff"');
}

.step h3 {
  margin: 0;
  font-size: 1rem;
  flex-grow: 1;
}

.copy-button {
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: v-bind('isDark ? "#45475a" : "#f1f5f9"');
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.copy-button:hover {
  opacity: 0.7;
  background-color: v-bind('isDark ? "#585b70" : "#e2e8f0"');
}

.icon {
  font-size: 16px;
}

.icon.clipboard {
  font-family: 'Noto Color Emoji', sans-serif;
}

.icon.check {
  color: #10b981;
  font-weight: bold;
}

.code-block {
  margin: 0;
  padding: 1rem;
  font-family: monospace;
  overflow-x: auto;
  white-space: pre;
  font-size: 0.9rem;
  line-height: 1.5;
  background-color: v-bind('isDark ? "#1e1e2e" : "#f8fafc"');
  color: v-bind('isDark ? "#cdd6f4" : "#334155"');
  cursor: pointer;
  transition: background-color 0.2s;
}

.code-block:hover {
  background-color: v-bind('isDark ? "#181825" : "#f1f5f9"');
}

.social-providers {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.provider-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid v-bind('isDark ? "#6c7086" : "#e2e8f0"');
  background-color: v-bind('isDark ? "#45475a" : "#f8fafc"');
  color: v-bind('isDark ? "#cdd6f4" : "#4a5568"');
  cursor: pointer;
  transition: all 0.2s ease;
  width: 120px;
}

.provider-button:hover {
  background-color: v-bind('isDark ? "#585b70" : "#e2e8f0"');
  transform: translateY(-2px);
}

.provider-icon {
  width: 32px;
  height: 32px;
}

.provider-label {
  font-size: 0.9rem;
  font-weight: 500;
}
</style>