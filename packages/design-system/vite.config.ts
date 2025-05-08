import { resolve } from 'path'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import dts from 'vite-plugin-dts'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

const projectRootDir = searchForWorkspaceRoot(process.cwd())

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "sass:math";
          @import "${projectRootDir}/packages/design-system/src/styles/styles";
        `,
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    }
  },
  build: {
    lib: {
      entry: {
        'design-system': resolve(__dirname, 'src/index.ts'),
        'design-system/components': resolve(__dirname, 'src/components/index.ts'),
        'design-system/composables': resolve(__dirname, 'src/composables/index.ts'),
        'design-system/helpers': resolve(__dirname, 'src/helpers/index.ts')
      }
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies).filter(
          (dep) =>
            // include vue-select because there is something off with its module type
            dep !== 'vue-select'
        ),
        '**/tests',
        '**/*.spec.ts',
        'vue'
      ],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  plugins: [vue(), dts({ copyDtsFiles: true, exclude: ['**/tests', '**/*.spec.ts'] })]
})
