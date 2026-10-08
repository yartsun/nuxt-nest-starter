export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },

  runtimeConfig: {
    // Server-side rendering talks to the API over the internal network when one exists.
    apiBaseServer: '',
    public: {
      apiBase: 'http://localhost:3001',
    },
  },

  // Signed-in pages depend on a session that lives in the browser; render them on the client.
  routeRules: {
    '/items/**': { ssr: false },
    '/import': { ssr: false },
    '/auth/**': { ssr: false },
  },

  icon: { serverBundle: { collections: ['lucide'] } },

  app: {
    head: {
      title: 'Catalog — Nuxt + NestJS starter',
      meta: [{ name: 'description', content: 'Searchable, real-time catalog built with Nuxt, NestJS, BullMQ and Meilisearch.' }],
    },
  },
})
