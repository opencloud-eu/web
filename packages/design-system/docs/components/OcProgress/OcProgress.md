---
title: OcProgress component
next: false
prev: false
---

# OcProgress component

## Description

The `OcProgress` component displays a progress bar.

## Examples

### Default

The default usage of the component involves the `value` and `max` properties.

::: livecode

```html
<oc-progress :value="4" :max="10" />
```

:::

### Indeterminate

The component can be set to an indeterminate state by setting `indeterminate` to `true`.

::: livecode

```html
<oc-progress :indeterminate="true" />
```

:::

::: component-api
