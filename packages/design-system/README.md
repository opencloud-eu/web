# OpenCloud Design System

[![Matrix](https://img.shields.io/matrix/opencloud%3Amatrix.org?logo=matrix)](https://app.element.io/#/room/#opencloud:matrix.org)

The **OpenCloud Design System** provides components and utilities for application and extension development within the
OpenCloud Web ecosystem. It can be developed standalone via the design system documentation. The documentation is
built with [VitePress](https://vitepress.dev/).

Head over to the [hosted docs](https://docs.opencloud.eu/design-system/) for more information!

## Running the docs locally

To run the docs, you first need to install all dependencies:

```
pnpm i
```

Start docs in dev mode:

```
pnpm docs:dev
```

## Usage as a package

### Installation

To use the design-system in your application, you first need to install the package. Depending on your package manager, run one of the following commands:

```
$ npm install @opencloud-eu/design-system

$ pnpm add @opencloud-eu/design-system

$ yarn add @opencloud-eu/design-system
```

Note that if you're using the design-system in an OpenCloud Web app, it's recommended to install it as dev dependency. This is because the Web runtime already ships the design-system and you only need it for development purposes in your IDE.

### Styles

In order to use the provided CSS classes and to ensure the components are styled correctly, you need to import the styles like so:

```
import '@opencloud-eu/design-system/dist/design-system.css'
```

Again, this is not needed if you're using the design-system in an OpenCloud Web app because the styles are already available via the Web runtime.

### Components

To use a component, you need to import it. For example, to use the `OcButton` component:

```
import { OcButton } from '@opencloud-eu/design-system/components'

<oc-button>
  Click me!
</oc-button>
```

You can also register the components globally in your standalone Vue app. This way you don't need to import them any time you want to use them.

```
import { createApp } from 'vue'
import DesignSystem from '@opencloud-eu/design-system'

const app = createApp({ ... })
app.use(DesignSystem)
```

In order for your IDE to pick up the correct component types, you need to add the following to your `types.d.ts` file:

```
/// <reference types="@opencloud-eu/design-system/types" />
```

Optionally, you can pass custom design tokens to the design-system. Check the [example theme](https://github.com/opencloud-eu/opencloud/blob/v2.2.0/services/web/assets/themes/opencloud/theme.json) for a list of available tokens.

```
const tokens = {
  spacing: {
    small: '4px',
    medium: '8px',
    large: '16px',
  }
}

app.use(DesignSystem, { tokens })
```

### Icons

To make sure all icons are loaded properly, you need to make sure they are served by your application. They are located under `node_modules/@opencloud-eu/design-system/dist/icons`. It's recommended to copy them to your public folder. You might need to set `iconUrlPrefix: '/'` when installing the design-system to ensure they are always loaded from the correct path.

### Fonts

There is no need to serve the fonts yourself since they are embedded in the CSS.

### Translations

The design-system uses [vue3-gettext](https://jshmrtn.github.io/vue3-gettext/) for translations. If your application doesn't use `vue3-gettext`, you need to tell the design-system to initialize it. This is done by passing the `initGettext` option:

```
app.use(DesignSystem, {
  language: {
    initGettext: true,
    defaultLanguage: 'en'
  }
})
```

The provided `setLanguage` method must then be called when switching languages in your application:

```
import { setLanguage } from '@opencloud-eu/design-system'

setLanguage('de')
```

You can also provide custom translations:

```
app.use(DesignSystem, {
  language: {
    initGettext: true,
    defaultLanguage: 'en',
    translations: {
      'en': {
        'hello': 'Hello',
        'world': 'World'
      },
      'de': {
        'hello': 'Hallo',
        'world': 'Welt'
      }
    }
  }
})
```

If your application already uses `vue3-gettext`, there is no need for all of this. However, you might want to include the provided translations in your `vue3-gettext` instance. They can be imported like so:

```
import translations from '@opencloud-eu/design-system/dist/translations.json'
```
