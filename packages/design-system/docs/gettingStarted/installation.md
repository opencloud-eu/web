---
title: Installation
next: false
---

# Installation

## Within an OpenCloud Web app

You don't necessarily need to install the design-system when developing an application or extension for OpenCloud Web, since it's already included in the Web runtime. However, if you want to have proper type support and access to the components in your IDE, or need to use the provided helper functions, you can install the design-system as a dev dependency.

```shell
$ npm install @opencloud-eu/design-system --save-dev

$ pnpm add @opencloud-eu/design-system -D

$ yarn add @opencloud-eu/design-system -D
```

This is all you need to do, the Web runtime already takes care of the initialization.

## As a package

If you want to use the design-system in your own standalone Vue application, you first need to install the package. Depending on your package manager, run one of the following commands:

```shell
$ npm install @opencloud-eu/design-system

$ pnpm add @opencloud-eu/design-system

$ yarn add @opencloud-eu/design-system
```

### Add styles

The design-system uses [Tailwind](https://tailwindcss.com/) for styling. However, it does not ship Tailwind, meaning it must be provided by your application. Additionally, you need to import the design-system's styles at the very beginning of your main CSS file and tell Tailwind where to look for class names. It's important that this file is imported before any other styles to ensure the styles and Tailwind are working correctly.

```css
@import './node_modules/@opencloud-eu/design-system/dist/tailwind.css';
@source './node_modules/@opencloud-eu/design-system';
@import './node_modules/@opencloud-eu/design-system/dist/design-system.css';
```

### Register components

To register the components globally in your standalone Vue app, you need to do the following:

```ts
import { createApp } from 'vue'
import DesignSystem from '@opencloud-eu/design-system'

const app = createApp({ ... })
app.use(DesignSystem)
```

In order for your IDE to pick up the correct component types, you need to add the following to your `types.d.ts` file:

```ts
/// <reference types="@opencloud-eu/design-system/types" />
```

Optionally, you can pass custom design tokens to the design-system. Check the [example theme](https://github.com/opencloud-eu/opencloud/blob/v3.5.0/services/web/assets/themes/opencloud/theme.json) for a list of available tokens.

```ts
const tokens = {
  roles: {
    primary: '#ffffff',
    onPrimary: '#000000'
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

```ts
app.use(DesignSystem, {
  language: {
    initGettext: true,
    defaultLanguage: 'en'
  }
})
```

The provided `setLanguage` method must then be called when switching languages in your application:

```ts
import { setLanguage } from '@opencloud-eu/design-system'

setLanguage('de')
```

You can also provide custom translations:

```ts
app.use(DesignSystem, {
  language: {
    initGettext: true,
    defaultLanguage: 'en',
    translations: {
      en: {
        hello: 'Hello',
        world: 'World'
      },
      de: {
        hello: 'Hallo',
        world: 'Welt'
      }
    }
  }
})
```

If your application already uses `vue3-gettext`, there is no need for all of this. However, you might want to include the provided translations in your `vue3-gettext` instance. They can be imported like so:

```ts
import translations from '@opencloud-eu/design-system/dist/translations.json'
```
