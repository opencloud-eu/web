---
title: OcSelect component
next: false
prev: false
---

# OcSelect component

## Description

The `OcSelect` component displays a select input field based on [Vue Select](https://vue-select.org/). A more detailed description can be found in the [Vue Select documentation](https://vue-select.org/).

## Accessibility

The label is required and represents the name of the input. It can be visually hidden on the screen by setting `label-hidden` to `true`, however it will still be read by screen readers.

## Examples

### Default

The most basic use case requires the `label` property and usually has a `v-model` to bind the selected value and some options.

::: livecode {path=/components/OcSelect/default.vue}
<<< @/components/OcSelect/default.vue
:::

### Multiple

Multiple options can be selected by setting `multiple` to `true`.

::: livecode {path=/components/OcSelect/multiple.vue}
<<< @/components/OcSelect/multiple.vue{6}
:::

### States

The component can be in a `disabled` or a `loading` state.

::: livecode

```html{3,8}
<oc-select
	label="Please select an option"
	disabled
	class="mb-4"
/>
<oc-select
	label="Please select an option"
	loading
	class="mb-4"
/>
```

:::

### Messages

There are two different types of messages that can be displayed: `description-message` and `error-message`.

::: livecode

```html{3,8,13}
<oc-select
	label="Please select an option"
	description-message="This is a description message"
	class="mb-4"
/>
<oc-select
	label="Please select an option"
	error-message="This is an error message"
	class="mb-4"
/>
```

:::

::: component-api
