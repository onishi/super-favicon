import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { bookmarkletPlugin } from './bookmarklet/vite-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), bookmarkletPlugin()],
})
