import { resolve } from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  build: {
    lib: {
      entry: {
        'web-client': resolve(__dirname, 'src/index.ts'),
        'web-client/graph': resolve(__dirname, 'src/graph/index.ts'),
        'web-client/graph/generated': resolve(__dirname, 'src/graph/generated/index.ts'),
        'web-client/ocs': resolve(__dirname, 'src/ocs/index.ts'),
        'web-client/ox': resolve(__dirname, 'src/ox/index.ts'),
        'web-client/sse': resolve(__dirname, 'src/sse/index.ts'),
        'web-client/webdav': resolve(__dirname, 'src/webdav/index.ts')
      },
      formats: ['es']
    }
  },
  plugins: [
    nodePolyfills({
      exclude: ['crypto']
    })
  ]
})
