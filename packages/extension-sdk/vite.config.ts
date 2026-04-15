import { resolve } from 'path'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import pkg from './package.json'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: 'extension-sdk',
      formats: ['es']
    },
    rolldownOptions: {
      external: [
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
        'path',
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
