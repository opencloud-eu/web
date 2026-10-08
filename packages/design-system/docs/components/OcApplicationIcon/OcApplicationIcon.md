---
title: OcApplicationIcon component
next: false
prev: false
---

# OcApplicationIcon component

## Description

The `OcApplicationIcon` component showcases an icon with a nice, colored background. You can either specify the background color directly or let the component generate one based on the icon's name.

## Examples

### Default

The default and most simple use case involves an `icon`. Please check out [Remix Icon](https://remixicon.com/) for a list of available icons.

::: livecode

```vue
<oc-application-icon icon="home" />
<oc-application-icon icon="cloud" />
<oc-application-icon icon="book" />
<oc-application-icon icon="settings" />
<oc-application-icon icon="github" />
```

:::

### Colors

A primary color can be passed to the component. Note that colors need to be in hexadecimal format.

::: livecode

```vue
<oc-application-icon icon="home" color-primary="#e2baff" />
```

:::

### Image icons

The `icon` also accepts a named icon or an image icon. An image icon fills the whole tile and gets no background, which suits images that bring their own shape. If a primary color is passed, the image is displayed in icon size on the colored tile instead, which suits images with a transparent background.

::: livecode

```vue
<oc-application-icon
  :icon="{
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23e2725b%22/%3E%3C/svg%3E'
  }"
/>
<oc-application-icon
  :icon="{
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23e2725b%22/%3E%3C/svg%3E'
  }"
  color-primary="#e2baff"
/>
```

:::

::: component-api
