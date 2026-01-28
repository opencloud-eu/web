---
title: OcBottomDrawer component
next: false
prev: false
---

# OcBottomDrawer component

## Description

The `OcBottomDrawer` component can be used to display content in a bottom drawer that slides up from the bottom of the screen. It is especially useful on mobile devices instead of showing dropdown menus to the user.

Note however that this component mainly takes care of the visual representation of the bottom drawer. You will need to handle the opening and closing logic yourself (see example below).

## Examples

The component just requires an `id` to be set. But you usually also want to define a callback on the `clicked` event.

Per default, the component traps your focus within the drawer when opened. This however requires at least one tabbable element (like a button or link) to be present within the drawer. Alternatively, you can disable this behavior by setting the `isFocusTrapActive` prop to `false`.

::: livecode {path=/components/OcBottomDrawer/default.vue}
<<< @/components/OcBottomDrawer/default.vue
:::

::: component-api
