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

The announced text is not visible on the screen and will only be read by screen readers.

To announce a message on an action, e.g. "Copied to clipboard!" after clicking a copy button, call the exposed `announce(message)` method via a template ref. Every call gets announced, also the same text again.

The `announcement` property can be used instead to announce a state. It gets announced on every change.

### Default

::: livecode {path=/components/OcHiddenAnnouncer/default.vue}
<<< @/components/OcHiddenAnnouncer/default.vue
:::

::: component-api
