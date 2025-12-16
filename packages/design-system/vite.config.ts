import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
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
    },
    postcss: {
      plugins: [
        {
          // The design-system css file is supposed to be imported in the main css file of the consuming
          // application. We need to remove the tailwind reference directives because they are already
          // resolved in the main css file via the top tailwind import. Leaving them would cause issues.
          postcssPlugin: 'remove-reference-directive',
          AtRule: {
            reference(atRule) {
              atRule.remove()
            }
          }
        }
      ]
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
        'vue',
        'pinia'
      ],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  plugins: [
    vue(),
    viteStaticCopy({
      targets: (() => {
        return [
          {
            src: './src/assets/icons/*',
            dest: 'icons'
          },
          {
            src: './l10n/translations.json',
            dest: '.'
          },
          {
            src: './src/styles/tailwind.css',
            dest: '.'
          },
          {
            src: './src/styles/defaults.css',
            dest: '.'
          }
        ]
      })()
    }),
    dts({ copyDtsFiles: true, exclude: ['**/tests', '**/*.spec.ts'] })
  ]
})
