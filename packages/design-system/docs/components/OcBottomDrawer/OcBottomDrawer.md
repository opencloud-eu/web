---
title: OcBottomDrawer component
next: false
prev: false
---

# OcBottomDrawer component

## Description

The `OcBottomDrawer` component displays content in a modal bottom drawer that slides up from the bottom of the screen. When active, it opens as a native modal dialog, moves focus into the drawer, and prevents interaction with the page behind it.

You need to handle the opening and closing logic yourself (see example below). The drawer has a translated default accessible name; pass `ariaLabel` to provide a more specific name.

## Examples

The component requires an `id`. You usually also want to define a callback on the `clicked` event.

Per default, the component traps your focus within the drawer when opened. This however requires at least one tabbable element (like a button or link) to be present within the drawer. Alternatively, you can disable this behavior by setting the `isFocusTrapActive` prop to `false`.

::: livecode {path=/components/OcBottomDrawer/default.vue}
<<< @/components/OcBottomDrawer/default.vue
:::

::: component-api
