---
title: OcSearchBar component
next: false
prev: false
---

# OcSearchBar component

## Description

The `OcSearchBar` component displays an input element used for searching resources or to filter local results.

## Accessibility

The `label` is required and represents the name of the input. It's not visible on the screen and only used by screen readers.

### Landmark `role=search`

Given there is only one instance of `<oc-search-bar>` per page/route, this component should communicate its purpose, being the main site search, to screen readers. If the component serves as a filter form, it is advised to disable the landmark role via `is-filter="true"`.

### Making sure a submit button exits

Both a search and filter form does need a submit button, regardless if the button is visually perceivable or not. If a "buttonless" look is desired, use `button-hidden="true"`, which renders the button visually hidden.

The `aria-label` of the loading spinner can be set via `loading-accessible-label`. If not set, it will default to "Loading results".

## Examples

### Default

The most basic use case requires a `label` property. The components emits a `search` event when the user submits the form via `Enter` or by clicking the search button.

`Escape` clears a non-empty search term and is not passed on, so e.g. a surrounding modal only closes on the next `Escape`. If the cancel button is shown, `Escape` acts like a click on it and calls the `cancel-handler`.

::: livecode {path=/components/OcSearchBar/default.vue}
<<< @/components/OcSearchBar/default.vue
:::

### Hidden search button

The search button can be hidden via the `button-hidden` property.

::: livecode {path=/components/OcSearchBar/hiddenButton.vue}
<<< @/components/OcSearchBar/hiddenButton.vue{5}
:::

### Advanced search

When the advanced search icon is displayed (which is the default behavior), clicking it will emit an `advancedSearch` event. This can e.g. be used to redirect the user to a dedicated search result page.

::: livecode {path=/components/OcSearchBar/advancedSearch.vue}
<<< @/components/OcSearchBar/advancedSearch.vue{7,23-26}
:::

::: component-api
