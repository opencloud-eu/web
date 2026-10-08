---
title: OcIcon component
next: false
prev: false
---

# OcIcon component

## Description

The `OcIcon` component displays icons as SVGs. The design system includes a list of icons made by [Remixicon](https://remixicon.com/) and, in the case of the `resource-type-*` icons, [Font Awesome](https://fontawesome.com/) (available under the CC-BY-4.0 license).

## Accessibility

An `accessible-label` can be provided if the element has a purpose. If the icon is purely decorative, `accessible-label` should be left empty, resulting in the `aria-hidden` attribute to be set to `true`.

## Examples

### Default

The basic usage of the component needs the icon `name` property.

::: livecode

```html
<oc-icon name="check" />
<oc-icon name="home" />
<oc-icon name="user" />
<oc-icon name="settings" />
<oc-icon name="github" />
```

:::

### Fill types

The available fill types are: `fill`, `line` and `none`.

::: livecode

```html
<oc-icon name="user" fill-type="fill" />
<oc-icon name="user" fill-type="line" />
<oc-icon name="user" fill-type="none" />
```

:::

### Sizes

You can use Tailwind size classes to set the size of the icon.

::: livecode

```html
<oc-icon name="check" size-class="size-4" />
<oc-icon name="check" size-class="size-6" />
<oc-icon name="check" size-class="size-8" />
```

:::

### Named icons and image icons

The `icon` property accepts an `Icon`: the name of an icon, a named icon or an image icon. This is the property to use when the icon is not known upfront, for example when it has been declared by an app or extension. A string is always treated as the name of an icon.

A named icon carries a `name` and optionally a `fillType` and a `color`. Both take precedence over the `fill-type` and `color` properties, which act as defaults.

::: livecode

```html
<oc-icon :icon="{ name: 'user', fillType: 'line' }" />
<oc-icon :icon="{ name: 'user', color: 'red' }" fill-type="line" />
```

:::

An image icon carries a `src` and optionally a `srcDark`. It is rendered as an image and shown as is, so `fill-type` and `color` have no effect. The `accessible-label` is used as alternative text. If the image can't be loaded, the icon stays empty and an `error` event is emitted.

::: livecode

```html
<oc-icon
  :icon="{
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23e2725b%22/%3E%3C/svg%3E'
  }"
  size-class="size-8"
/>
```

:::

The `src` needs to be a resolved URL. Apps should import the image as an asset (`import iconUrl from './assets/icon.svg'`) instead of writing a relative path, because a relative path would be resolved against the host page. Images from a different origin need to be allowed by the `img-src` directive of the content security policy.

#### Dark mode

The design system does not know whether the application is in dark mode, so the application needs to provide that state under the `iconIsDarkInjectionKey`. The provided value can be a boolean, a ref or a getter. The `srcDark` of an image icon is used while it is truthy. Without a provided value, the `src` is always used.

::: component-api
