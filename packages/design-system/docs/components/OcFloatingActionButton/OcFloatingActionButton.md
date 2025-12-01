---
title: OcFloatingActionButton component
next: false
prev: false
---

# OcFloatingActionButton component

## Description

The `OcFloatingActionButton` component displays a button that floats above an interface and represents the primary or
most common action of a screen.

## Examples

### Default

The default use case displays a menu of stacked buttons.

::: livecode

```html

<oc-floating-action-button
        class="!static"
        :items="[
		{ label: 'File', icon: 'file', to: { path: 'root' } },
		{ label: 'Folder', icon: 'folder', to: { path: 'folder' } },
		{ label: 'Public link', icon: 'link', to : { path: 'subfolder' } }
	]"
/>
```

:::

### Action mode

While setting `mode` to `action`, only the primary Floating Action Button will be displayed.

::: livecode

```html

<oc-floating-action-button
        mode="action"
        class="!static"
        :items="[
		{ label: 'File', icon: 'file', to: { path: 'root' } },
	]"
/>
```

:::
