---
title: OcTag component
next: false
prev: false
---

# OcTag component

## Description

The `OcTag` component can display various information in form of a tag.

## Examples

### Default

The component provides a default slot that can be filled with the content that should be displayed inside the tag.

::: livecode

```html
<oc-tag>Folder</oc-tag>
<oc-tag>File</oc-tag>
<oc-tag>Space</oc-tag>
```

:::

### Sizes

These sizes are available: `xsmall`, `small`, `medium`, `large`.

::: livecode

```html
<oc-tag size="xsmall">Tag</oc-tag>
<oc-tag size="small">Folder</oc-tag>
<oc-tag size="medium">File</oc-tag>
<oc-tag size="large">Space</oc-tag>
```

:::

### Links and handlers

Tags can also be a button or a link. This is determined by the `type` property.

If the `type` property is set to `button`, the tag has a handler that will emit a `click` event. If the `type` property is set to `a` or `router-link`, the tag needs to be provided with a `to` property.

::: livecode {path=/components/OcTag/linksHandlers.vue}
<<< @/components/OcTag/linksHandlers.vue
:::

::: component-api
