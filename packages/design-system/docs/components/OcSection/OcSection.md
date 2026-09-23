---
title: OcSection component
next: false
prev: false
---

# OcSection component

## Description

The `OcSection` component groups related content, e.g. a set of form fields, in a visually distinct container. It has a header consisting of a `title`, an optional `subtitle` and an optional `icon`. It can optionally be made expandable, so users can collapse content they don't need.

## Accessibility

The title is rendered inside a heading element (`h2` by default). Use the `titleTag` property to fit it into the heading hierarchy of the surrounding page.

When the section is expandable, the header is rendered as a button with `aria-expanded` and `aria-controls` attributes, so screen readers announce the state and relation to the content.

## Examples

### Default

The basic usage needs a `title`. A `subtitle` can be used to describe the content. If an `icon` is given, the content gets indented to align with the title.

::: livecode

```html
<oc-section title="Section title">Some content inside a section.</oc-section>
<oc-section
  class="mt-3"
  title="Announcement banner"
  subtitle="Shows a banner on top for all users."
  icon="megaphone"
>
  Some content inside a section.
</oc-section>
```

:::

### Expandable

Set `expandable` to let users collapse and expand the content by clicking the header. Use `v-model:expanded` to control or observe the state. Sections are expanded by default. The content isn't rendered while the section is collapsed.

::: livecode {path=/components/OcSection/expandable.vue}
<<< @/components/OcSection/expandable.vue
:::

::: component-api
