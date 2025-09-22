---
title: OcCard component
next: false
prev: false
---

# OcCard component

## Description

The `OcCard` component represents a simple card element consisting of a body and an optional header and footer. It is used to group related information in a visually distinct container.

## Examples

### Default

::: livecode

```html
<oc-card title="Card title"> Some content inside a card. </oc-card>
```

:::

### Styling

Visually, the default card mainly handles spacing and alignment. The card can then be customized via the provided properties `headerClass`, `bodyClass` and `footerClass` or simply by using utility classes on the card.

::: livecode

```html
<oc-card title="Card title" class="border" header-class="bg-gray-100 pb-4">
  Some content inside a card.
</oc-card>
```

:::

### Slots

The card can display custom content using the default slot.

::: livecode

```html
<oc-card title="Card title">
  <template #header>
    <p>Custom header</p>
  </template>
  <p>Some content inside a card.</p>
  <template #footer>
    <p>Custom footer</p>
  </template>
</oc-card>
```

:::

::: component-api
