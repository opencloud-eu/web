# OpenCloud extension-sdk

[![Matrix](https://img.shields.io/matrix/opencloud%3Amatrix.org?logo=matrix)](https://app.element.io/#/room/#opencloud:matrix.org)

This package provides a default vite config that can be used when developing applications and extensions for the OpenCloud Web ecosystem.

## Installation

Depending on your package manager, run one of the following commands:

```
$ npm install @opencloud-eu/extension-sdk --save-dev

$ pnpm add -D @opencloud-eu/extension-sdk

$ yarn add @opencloud-eu/extension-sdk --dev
```

## Usage

You can use the OpenCloud vite config via the `defineConfig` method provided by this package. The following example showcases how your `vite.config.ts` file could look like:

```ts
import { defineConfig } from '@opencloud-eu/extension-sdk'

export default defineConfig({
  name: 'your-app',
  server: {
    port: 9700
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'your-app.js'
      }
    }
  }
})
```

### Tailwind CSS

The extension-sdk comes with a preconfigured Tailwind CSS setup for extension development. To use it, simply import the provided CSS file in your main application file. Note that Tailwind classes need to be prefixed via `ext:` in extensions to avoid style conflicts.

```ts
import '@opencloud-eu/extension-sdk/tailwind.css'
```
