export default defineNuxtConfig({
  app: {
    layoutTransition: {
      name: "fade",
      mode: "out-in",
    },
    pageTransition: {
      name: "fade",
      mode: "out-in",
    },
  },

  routeRules: {
    "/": { isr: true, prerender: true },
  },

  css: ["~/assets/style/main.scss"],

  imports: {
    dirs: ["store"],
  },

  devtools: { enabled: true },

  runtimeConfig: {
    private: {
      adminPassword: process.env.ADMIN_PASSWORD,
      resendApiKey: process.env.RESEND_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      openaiBaseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.MODEL,
      openaiBaseUrl_fast: process.env.DEV_OPENAI_BASE_URL,
      model_fast: process.env.DEV_MODEL,
      alltalkTtsUrl: process.env.ALLTALK_TTS_URL,
    },
  },

  modules: [
    "@vueuse/nuxt",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    "@nuxthq/ui",
    "nuxt-svgo",
    "@nuxt/image",
    "@nuxtjs/mdc",
    "@nuxtjs/device"
  ],

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    storageKey: 'nuxt-starter-color-mode',
  },

  i18n: {
    strategy: "no_prefix",
    detectBrowserLanguage: {
      alwaysRedirect: true,
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: 'root',
    },
    locales: [
      {
        code: 'en',
        iso: 'en-US'
      },
      {
        code: 'fr',
        iso: 'fr-FR'
      }
    ],
    baseUrl: 'https://nuxt-starter.com',
    vueI18n: "~/i18n.config.ts",
  },

  image: {
    format: ["webp"],
  },

  nitro: {
    experimental: {
      websocket: true,
    },
    prerender: {
      crawlLinks: true,
      routes: ["/sitemap.xml"],

      // If there are errors during build but no useful info,
      //   try setting this to false and running the app
      // There should be a thrown error when you go to the page
      // https://github.com/nuxt/nuxt/discussions/22397#discussioncomment-7724547
      // https://stackoverflow.com/questions/76752732/error-while-deploying-nuxt-3-in-pre-rendered-mode/76761528#76761528
      failOnError: false,
    },
    storage: {
      'server-logs': {
        driver: 'fs',
        base: './data/logs',
      },
      'rooms': {
        driver: 'fs',
        base: './data/rooms',
      },
      'tts': {
        driver: 'fs',
        base: './data/tts',
      },
      'server-options': {
        driver: 'fs',
        base: './data/options',
      }
    },
  },

  svgo: {
    autoImportPath: "./assets/logo/",
  },

  plugins: [],
  compatibilityDate: "2024-12-30",

  vite: {
    optimizeDeps: {
      include: ['vue', 'lodash', '@heroicons/vue'],
    },
    css: {
      preprocessorOptions: {
        scss: { api: 'modern' }
      }
    }
  }
});
