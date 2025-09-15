---
title: OcDrop component
next: false
prev: false
---

# OcDrop component

## Description

The `OcDrop` component displays given content or action items inside a dropdown menu.

## Examples

### Default

The most common use case of the component is in combination with a button. It's important that the button `id` matches the `toggle` attribute of the dropdown.

::: livecode

```html
<oc-button id="drop-btn">Open drop</oc-button>
<oc-drop toggle="#drop-btn" mode="click" padding-size="medium"> Some content. </oc-drop>
```

:::

### Action items

The following example shows how to use the component to display action items.

::: livecode

```html
<oc-button id="drop-2-btn">Open drop</oc-button>
<oc-drop drop-id="drop-drop" toggle="#drop-2-btn" mode="click" padding-size="small">
  <oc-list :raw="true">
    <li>
      <oc-button class="w-full" justify-content="left" appearance="raw"> Create Folder </oc-button>
    </li>
    <li>
      <oc-button class="w-full" justify-content="left" appearance="raw"> Create Space </oc-button>
    </li>
    <li>
      <oc-button class="w-full" justify-content="left" appearance="raw"> Create File </oc-button>
    </li>
  </oc-list>
</oc-drop>
```

:::

::: component-api
