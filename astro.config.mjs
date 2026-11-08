import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

// Static output. React is used for islands only; everything else is plain HTML.
export default defineConfig({
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    build: { chunkSizeWarningLimit: 1100 }, // the lazy 3D chunk is large on purpose
  },
})
