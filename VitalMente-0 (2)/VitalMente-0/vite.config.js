import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Em desenvolvimento, /api vai para o backend Express (mesma origem => cookies de sessão funcionam).
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
