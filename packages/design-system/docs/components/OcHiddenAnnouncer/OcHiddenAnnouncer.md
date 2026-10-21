---
title: OcHiddenAnnouncer component
next: false
prev: false
---

# OcHiddenAnnouncer component

## Description

The `OcHiddenAnnouncer` component provides live regions for screen reader announcements.

## Accessibility

Screen reader software detect dynamic changes in regions registered as live regions (elements with attributes like `aria-live="polite"` and `aria-live="assertive"`). So when using this component or live regions in general, make sure that the region already exists in the DOM and assistive technology can subscribe to its changes. More information about this can be found in the [mdn web docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions).

## Examples

The default use case of the component needs an `announcement` property to be passed to it. This string is not visible on the screen and will only be read by screen readers. Every change of the `announcement` gets announced. To announce the same text again, change the `announcementKey` property as well, e.g. by increasing a counter.

### Default

::: livecode {path=/components/OcHiddenAnnouncer/default.vue}
<<< @/components/OcHiddenAnnouncer/default.vue
:::

::: component-api
