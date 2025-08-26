---
title: OcCheckbox component
next: false
prev: false
---

# OcCheckbox component

## Description

The `OcCheckbox` component represents a simple checkbox input element that can either be checked or unchecked.

## Accessibility

The `label` is required and represents the name of the input. If `label-hidden` is set to `true`, the label will be hidden from the screen but still be available for screen readers via the `aria-label` attribute.

## Examples

### Default

The default use case needs a `label` and a `v-model` to bind the value of the checkbox.

::: livecode {path=/components/OcCheckbox/default.vue}
<<< @/components/OcCheckbox/default.vue
:::

### Sizes

The checkbox can be displayed in three different sizes: `small`, `medium`, and `large`.

::: livecode

```html
<div class="mb-2">
  <oc-checkbox label="Small checkbox" size="small" />
</div>
<div class="mb-2">
  <oc-checkbox label="Medium checkbox" size="medium" />
</div>
<div class="mb-2">
  <oc-checkbox label="Large checkbox" size="large" />
</div>
```

:::

::: component-api
