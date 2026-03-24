import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import pkg from './package.json'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'web-test-helpers',
      formats: ['es']
    },
    rolldownOptions: {
      external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]
    }
  },
  plugins: [vue(), dts()]
})
