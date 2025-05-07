import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Capacitor Social Login",
  description: "A Capacitor plugin for social login",
  markdown: {
    theme: {
      light: 'catppuccin-latte',
      dark: 'catppuccin-mocha',
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get started', link: '/get-started' }
    ],

    sidebar: [
      {
        text: 'Get started',
        link: '/get-started'
      },
      {
        text: 'Providers',
        items: [
          { 
            text: 'Google',
            items: [
              { text: 'General', link: '/providers/google/general' },
              { text: 'iOS', link: '/providers/google/ios' },
              { text: 'Android', link: '/providers/google/android' },
              { text: 'Web', link: '/providers/google/web' }
            ]
          },
          {
            text: 'Apple',
            items: [
              { text: 'General', link: '/providers/apple/general' },
              { text: 'iOS', link: '/providers/apple/ios' },
              { text: 'Android', link: '/providers/apple/android' },
              { text: 'Web', link: '/providers/apple/web' }
            ]
          },
          {
            text: 'Facebook',
            link: '/providers/facebook'
          },
          {
            text: 'Migrations',
            items: [
              { text: 'Apple', link: '/migrations/migration_apple' },
              { text: 'Google', link: '/migrations/migration_codetrix' },
              { text: 'Facebook', link: '/migrations/migration_facebook' },
              { text: 'To V1/V7 of the plugin', link: '/migrations/migration_to_v1' }
            ]
          }
        ]
      }
    ],
    logo: {
      src: '/capgo.svg',
      alt: 'Capacitor Social Login Logo'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Cap-go/capacitor-social-login' }
    ],
  }
})
