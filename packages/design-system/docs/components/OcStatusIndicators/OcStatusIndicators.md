---
title: OcStatusIndicators component
next: false
prev: false
---

# OcStatusIndicators component

## Description

The `OcStatusIndicators` component represents the status of a resource.

## Accessibility

Indicators should be described via the `accessibleDescription` if they serve a purpose other than decoration.

## Examples

### Default

The most basic use case involves a `resource` and a given list of `indicators`. The indicators with kind `icon` have a `handler` function that is called when the user clicks on it.

::: livecode {path=/components/OcStatusIndicators/default.vue}
<<< @/components/OcStatusIndicators/default.vue
:::

### Disabled handler

The handler can be disabled by setting `disable-handler` to `true`.

::: livecode

```html{11}
<oc-status-indicators
	:resource="{ id: '1' }"
	:indicators="[
		{
			id: '1',
			icon: 'cloud',
			label: 'This resource is synced in your cloud.',
			accessibleDescription: 'This resource is synced in your cloud.'
		}
	]"
	:disable-handler="true"
/>
```

:::

::: component-api
