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

The available sizes are: `xsmall`, `small`, `medium`, `large`, `xlarge`, `xxlarge` and `xxxlarge`.

::: livecode

```html
<oc-icon name="check" size="xsmall" />
<oc-icon name="check" size="small" />
<oc-icon name="check" size="medium" />
<oc-icon name="check" size="large" />
<oc-icon name="check" size="xlarge" />
<oc-icon name="check" size="xxlarge" />
<oc-icon name="check" size="xxxlarge" />
```

:::

::: component-api
