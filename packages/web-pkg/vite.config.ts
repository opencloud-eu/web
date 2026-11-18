import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

const external = [...Object.keys(pkg.dependencies)]

export default defineConfig({
  build: {
    lib: {
      entry: {
        'web-pkg': resolve(__dirname, 'src/index.ts'),
        'web-pkg/editor': resolve(__dirname, 'src/editor/index.ts')
      },
      formats: ['es']
    },
    rolldownOptions: {
      external
    }
  },
  plugins: [
    tailwindcss(),
    vue(),
    nodePolyfills({
      exclude: ['crypto']
    })
  ]
})
