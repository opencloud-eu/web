---
title: OcIcon component
next: false
prev: false
---

# OcIcon component

## Description

The `OcIcon` component displays icons as SVGs. The design system includes a list of icons made by [Remixicon](https://remixicon.com/) and, in the case of the `resource-type-*` icons, [Font Awesome](https://fontawesome.com/) (available under the CC-BY-4.0 license).

## Accessibility

An `accessible-label` can be provided if the element has a purpose. If the icon is purely decorative, `accessible-label` should be left empty, resulting in the `aria-hidden` attribute to be set to `true`.

## Examples

### Default

The basic usage of the component needs the icon `name` property.

::: livecode

```html
<oc-icon name="check" />
<oc-icon name="home" />
<oc-icon name="user" />
<oc-icon name="settings" />
<oc-icon name="github" />
```

:::

### Fill types

The available fill types are: `fill`, `line` and `none`.

::: livecode

```html
<oc-icon name="user" fill-type="fill" />
<oc-icon name="user" fill-type="line" />
<oc-icon name="user" fill-type="none" />
```

:::

### Sizes

You can use Tailwind size classes to set the size of the icon.

::: livecode

```html
<oc-icon name="check" size-class="size-4" />
<oc-icon name="check" size-class="size-6" />
<oc-icon name="check" size-class="size-8" />
```

:::

::: component-api
