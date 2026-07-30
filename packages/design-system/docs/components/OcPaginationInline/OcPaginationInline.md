---
title: OcPaginationInline component
next: false
prev: false
---

# OcPaginationInline component

## Description

The `OcPaginationInline` component is a compact pagination control for paginating a list in place, e.g. inside a sidebar panel.

Unlike [OcPagination](/components/OcPagination), it does not read or write the route. The current page is passed in via `currentPage` and changes are emitted via `update:currentPage`, so it can be used with `v-model:current-page`. Nothing is rendered if `pages` is `1` or lower.

## Examples

### Default

The component needs to be provided with the `currentPage` and the total number of `pages`.

::: livecode {path=/components/OcPaginationInline/default.vue}
<<< @/components/OcPaginationInline/default.vue
:::

### Custom label

If more than one pagination exists on the same page, the accessible name of the navigation should be set via the `label` property.

::: livecode

```html
<oc-pagination-inline :pages="3" :current-page="1" label="Member list pagination" />
```

:::

::: component-api
