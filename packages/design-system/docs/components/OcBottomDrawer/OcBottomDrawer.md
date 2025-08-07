---
title: OcBottomDrawer component
next: false
prev: false
---

# OcBottomDrawer component

## Description

The `OcBottomDrawer` component can be used to display content in a bottom drawer that slides up from the bottom of the screen. It is especially useful on mobile devices instead of showing dropdown menus to the user.

## Examples

### Default

The default use case gets an ID and the selector of the toggle button as props.

::: livecode {path=/components/OcBottomDrawer/default.vue}
<<< @/components/OcBottomDrawer/default.vue
:::

### Nesting

The bottom drawer can also be nested, for example to categorize items.

::: livecode {path=/components/OcBottomDrawer/nesting.vue}
<<< @/components/OcBottomDrawer/nesting.vue
:::

### Portal

You can also provide a `portal-target` via `portal-vue` if you want to render the bottom drawer outside of the current DOM hierarchy.

::: livecode {path=/components/OcBottomDrawer/portal.vue}
<<< @/components/OcBottomDrawer/portal.vue
:::

::: component-api
