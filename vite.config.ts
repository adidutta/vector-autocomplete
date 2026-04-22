import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@emotion/react',
        '@emotion/styled',
        '@mui/material',
        '@huggingface/transformers',
        'hnswlib-wasm',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'hnswlib-wasm'],
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
