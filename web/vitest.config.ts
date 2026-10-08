import { defineConfig } from 'vitest/config'

// Unit tests for framework-free code in app/utils; no Nuxt runtime needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
