---
title: OcList component
next: false
prev: false
---

# OcList component

## Description

The `OcList` component can be used to display lists.

## Examples

### Default

The components provides a default slot to display the list items.

::: livecode

```html
<div>
  <oc-list>
    <li>First element</li>
    <li>Second element</li>
    <li>Third element</li>
  </oc-list>
</div>
<div class="mt-4">
  <oc-list :raw="true">
    <li>First element</li>
    <li>Second element</li>
    <li>Third element</li>
  </oc-list>
</div>
```

:::

### Timeline

The component provides an `oc-timeline` class to display a timeline-like list.
::: livecode

```html
<div>
  <oc-list class="oc-timeline">
    <li>
      <span>19 February 2025</span>
      <small>Release 1.0.0</small>
    </li>
    <li>
      <span>15 March 2025</span>
      <small>Release 1.1.0</small>
    </li>
    <li>
      <span>19 March 2025</span>
      <small>Release 1.1.1</small>
    </li>
  </oc-list>
</div>
```

:::

::: component-api
