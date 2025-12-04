---
title: OcTextInput component
next: false
prev: false
---

# OcTextInput component

## Description

`OcTextInput`s allow users to provide text input. Commonly used when the expected input is short.
This component has a range of options and supports several input types, including numbers.
For longer input, use the `OcTextarea` component.

## Accessibility

The label is required and represents the name of the input.

The description-message can be used additionally to give further information about the input field. When a
description is given, it will be referenced via the `aria-describedby` property automatically.
An error or warning will replace the description as well as the `aria-describedby` property until the error
or warning is fixed.

## Examples

### Default

The default and most simple use case involves a `v-model` and a `label`.

::: livecode {path=/components/OcTextInput/default.vue}
<<< @/components/OcTextInput/default.vue
:::

### Inline Label

::: livecode

```vue

<oc-text-input label="Your name" :inline-label="true"/>
```

:::

### Disabled

::: livecode

```vue

<oc-text-input disabled label="Address" model-value="I am disabled"/>
```

:::

### Input Types

The following input types ares supported.

::: livecode

```vue

<oc-text-input class="mb-2" label="Text"/>
<oc-text-input class="mb-2" read-only="true" label="Read only" value="I am read only"/>
<oc-text-input class="mb-2" type="number" label="Number"/>
<oc-text-input class="mb-2" type="email" label="Email"/>
<oc-text-input class="mb-2" type="password" label="Password"/>
```

:::

### Customization
`OcTextInput` is highly customizable

::: livecode

```vue

<div class="border-b mb-2">
  <oc-text-input class="mb-2" label="Your name" :inline-label="true" :has-border="false"/>
</div>
<div class="border-b">
  <oc-text-input class="mb-2" label="Full address" :inline-label="true" :has-border="false"/>
</div>
```

:::

### Interactions

::: livecode {path=/components/OcTextInput/interactions.vue}
<<< @/components/OcTextInput/interactions.vue
:::

### Messages

::: livecode {path=/components/OcTextInput/messages.vue}
<<< @/components/OcTextInput/messages.vue
:::

::: component-api
