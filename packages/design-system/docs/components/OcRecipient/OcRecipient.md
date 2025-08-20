---
title: OcRecipient component
next: false
prev: false
---

# OcRecipient component

## Description

The `OcRecipient` component displays a user or a group with a name and an avatar. It's usually being used when selecting a recipient for a share.

## Examples

### Default

The most basic use case involves a `recipient` object with a `name` property.

::: livecode

```html
<div class="oc-width-1-4">
  <oc-recipient :recipient="{ name: 'Admin' }" />
</div>
```

:::

### Avatar

The component can show an avatar in front of the recipient's name.

::: livecode

```html{5-7}
<div class="oc-width-1-4">
	<oc-recipient
		:recipient="{
			name: 'Admin',
			hasAvatar: true,
			avatar: 'https://picsum.photos/50/50?image=550',
			isLoadingAvatar: false
		}"
	/>
</div>
```

:::

### Slot

The component provides an `append` slot to add additional content.

::: livecode

```html{3-5}
<div class="oc-width-1-4">
	<oc-recipient :recipient="{ name: 'Admin' }">
		<template #append>
			<span class="text-sm">Additional content</span>
		</template>
	</oc-recipient>
</div>
```

:::

::: component-api
