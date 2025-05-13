---
title: OcColorInput component
next: false
prev: false
---

# OcColorInput component

## Description

`OcColorInput`s allow users to pick or type a color.

## Accessibility

The label is required and represents the name of the input.

The description-message can be used additionally to give further information about the input field. When a
description is given, it will be referenced via the `aria-describedby` property automatically.
An error or warning will replace the description as well as the `aria-describedby` property until the error
or warning is fixed.

## Examples

### Default

The default and most simple use case involves a `v-model` and a `label`.

::: livecode {path=/components/OcColorInput/default.vue}
<<< @/components/OcColorInput/default.vue
:::

::: component-api
