import { join, resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
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
