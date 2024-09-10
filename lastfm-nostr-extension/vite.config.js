import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import tailwind from 'tailwindcss'

export default defineConfig({
  plugins: [crx({ manifest })],
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
})