import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Dev-only render studio for stills and films. Not part of the site build.
export default defineConfig({ root: import.meta.dirname, plugins: [react()], server: { port: 5180, host: '127.0.0.1', fs: { allow: ['../..'] } }, publicDir: '../../public' })
