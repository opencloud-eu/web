---
title: OcGrid component
next: false
prev: false
---

# OcGrid component

## Description

The `OcGrid` component allows you to arrange block elements in columns.

## Examples

### Default

The component provides a default slot for any content that should be displayed in the grid.

::: livecode

```html
<oc-grid>
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-primary)"
    class="oc-height-small"
  ></div>
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-secondary)"
    class="oc-height-small"
  ></div>
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-tertiary)"
    class="oc-height-small"
  ></div>
</oc-grid>

<oc-grid direction="column" class="mt-4">
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-primary)"
    class="oc-height-small"
  ></div>
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-secondary)"
    class="oc-height-small"
  ></div>
  <div
    style="width: 80px; height: 80px; background-color: var(--oc-role-tertiary)"
    class="oc-height-small"
  ></div>
</oc-grid>
```

:::

::: component-api
