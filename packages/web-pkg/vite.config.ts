import { join, resolve } from 'path'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import dts from 'vite-plugin-dts'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

const projectRootDir = searchForWorkspaceRoot(process.cwd())
const external = [...Object.keys(pkg.dependencies)]

export default defineConfig({
  resolve: {
    alias: {
      crypto: join(projectRootDir, 'polyfills/crypto.js')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "sass:math";
          @use "sass:string";
          @use "sass:meta";
        `,
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'web-pkg',
      fileName: 'web-pkg'
    },
    rollupOptions: {
      external: external.filter(
        (e) =>
          // something is off with this lib, see https://github.com/ahmadjoya/generate-password-lite/issues/8
          e !== 'js-generate-password'
      )
    }
  },
  plugins: [
    vue(),
    nodePolyfills({
      exclude: ['crypto']
    }),
    dts({ exclude: ['**/tests'] })
  ]
})
