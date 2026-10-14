import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import pkg from './package.json'

export default defineConfig({
  build: {
    lib: {
      entry: {
        'extension-sdk': resolve(__dirname, 'src/index.ts'),
        'vitest.setup': resolve(__dirname, 'src/vitest.setup.ts')
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['es']
    },
    rolldownOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
        'path',
        'url',
        'process',
        'fs',
        'http',
        'https'
      ]
    }
  },
  plugins: [
    viteStaticCopy({
      targets: (() => {
        return [{ src: './src/tailwind.css', dest: '.', rename: { stripBase: 1 } }]
      })()
    })
  ]
})
