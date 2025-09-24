---
title: Tailwind migration
next: false
---

# Tailwind migration

Starting with `v4` of OpenCloud Web and the design-system, the custom utility classes and variables have been removed in favor of [Tailwind](https://tailwindcss.com/). We made this decision because great CSS frameworks like Tailwind are already out there and we feel like there is no need to reinvent the wheel. We want as little custom code as possible to be able to develop fast and with high quality while providing a well documented developer experience. The latter is given via [Tailwind's extensive documentation](https://tailwindcss.com/docs).

The following guide shows how to migrate your application or extension to `v4` of OpenCloud Web and its design-system.

## Utility classes

### Spacing

| OC utility class | Tailwind utility class |
| ---------------- | ---------------------- |
| `oc-m-xs`        | `m-1`                  |
| `oc-m-s`         | `m-2`                  |
| `oc-m-m`         | `m-4`                  |
| `oc-m-l`         | `m-6`                  |
| `oc-m-xl`        | `m-12`                 |
| `oc-m-xxl`       | `m-24`                 |
| `oc-m`           | `m-4`                  |
| `oc-m-rm`        | `m-0`                  |

The same goes for the `padding` utility classes (replace `m` with `p`).

### Text size

| OC utility class | Tailwind utility class |
| ---------------- | ---------------------- |
| `oc-text-xsmall` | `text-xs`              |
| `oc-text-small`  | `text-sm`              |
| `oc-text-medium` | `text-base`            |
| `oc-text-large`  | `text-lg`              |
| `oc-text-xlarge` | `text-xl`              |

### Font weight

| OC utility class   | Tailwind utility class |
| ------------------ | ---------------------- |
| `oc-font-semibold` | `font-semibold`        |
| `oc-text-bold`     | `font-semibold`        |

### Text alignment

| OC utility class | Tailwind utility class |
| ---------------- | ---------------------- |
| `oc-text-center` | `text-center`          |
| `oc-text-left`   | `text-left`            |
| `oc-text-right`  | `text-right`           |

### Word breaks and truncation

| OC utility class   | Tailwind utility class |
| ------------------ | ---------------------- |
| `oc-text-truncate` | `truncate`             |
| `oc-text-nowrap`   | `whitespace-nowrap`    |

### Line height

The `line-height` gets determined by the given `text-` class. However, it can also be adjusted separately via the `leading-` classes (see https://tailwindcss.com/docs/line-height#setting-independently).

### Text decoration

For `text-decoration` we didn't have a utility class. When a decoration is needed on hover, just use `hover:underline`. Disabling the underline is usually not needed since this is already done via the Tailwind preflight.

### Colors

The theme color roles now exist as Tailwind variables and can be used like so: `bg-role-primary`, `text-role-on-primary`. This also supports variations, e.g. `hover:text-role-on-primary` or `bg-role-primary/50`.

These oc-helper classes are now redundant:

| OC utility class | Tailwind utility class         |
| ---------------- | ------------------------------ |
| `oc-text-muted`  | `text-role-on-surface-variant` |
| `oc-text-error`  | `text-role-on-error`           |

### Borders

| OC utility class | Tailwind utility class |
| ---------------- | ---------------------- |
| `oc-border`      | `border`               |
| `oc-rounded`     | `rounded-sm`           |

For more variants, please refer to https://tailwindcss.com/docs/border-width.

### Width

| OC utility class  | Tailwind utility class |
| ----------------- | ---------------------- |
| `oc-width-1-1`    | `w-full`               |
| `oc-width-1`      | `w-full`               |
| `oc-width-large`  | `w-lg`                 |
| `oc-width-medium` | `w-sm`                 |
| `oc-width-small`  | `w-xs`                 |
| `oc-width-expand` | `flex-1`               |
| `oc-width-auto`   | `w-auto`               |

### Height

| OC utility class     | Tailwind utility class |
| -------------------- | ---------------------- |
| `oc-height-1-1`      | `h-full`               |
| `oc-height-viewport` | `h-screen`             |
| `oc-height-small`    | `h-[150px]`            |
| `oc-height-medium`   | `h-[300px]`            |
| `oc-height-large`    | `h-[450px]`            |

### Display

| OC utility class          | Tailwind utility class |
| ------------------------- | ---------------------- |
| `oc-display-block`        | `block`                |
| `oc-display-inline-block` | `inline-block`         |

### Flex

| OC utility class         | Tailwind utility class |
| ------------------------ | ---------------------- |
| `oc-flex`                | `flex`                 |
| `oc-flex-inline`         | `inline-flex`          |
| `oc-flex-left`           | `justify-start`        |
| `oc-flex-center`         | `justify-center`       |
| `oc-flex-right`          | `justify-end`          |
| `oc-flex-between`        | `justify-between`      |
| `oc-flex-around`         | `justify-around`       |
| `oc-flex-top`            | `items-start`          |
| `oc-flex-middle`         | `items-center`         |
| `oc-flex-bottom`         | `items-end`            |
| `oc-flex-stretch`        | `items-stretch`        |
| `oc-flex-row`            | `flex-row`             |
| `oc-flex-row-reverse`    | `flex-row-reverse`     |
| `oc-flex-column`         | `flex-col`             |
| `oc-flex-column-reverse` | `flex-col-reverse`     |
| `oc-flex-nowrap`         | `flex-nowrap`          |
| `oc-flex-wrap`           | `flex-wrap`            |
| `oc-flex-wrap-reverse`   | `flex-wrap-reverse`    |
| `oc-flex-1`              | `flex-1`               |

### Overflow

| OC utility class     | Tailwind utility class                |
| -------------------- | ------------------------------------- |
| `oc-overflow-hidden` | `overflow-hidden`                     |
| `oc-overflow-auto`   | `overflow-auto`                       |
| `oc-text-overflow`   | `max-w-full` and/or `overflow-hidden` |

### Position

| OC utility class            | Tailwind utility class                                            |
| --------------------------- | ----------------------------------------------------------------- |
| `oc-position-relative`      | `relative`                                                        |
| `oc-position-fixed`         | `fixed`                                                           |
| `oc-position-absolute`      | `absolute`                                                        |
| `oc-position-center`        | `absolute top-[50%] left-[50%] transform-[translate(-50%, -50%)]` |
| `oc-position-center-right`  | `absolute top-[50%] right-0 transform-[translateY(-50%)]`         |
| `oc-position-bottom-center` | `absolute left-[50%] bottom-0 transform-[translateX(-50%)]`       |
| `oc-position-cover`         | `absolute inset-0`                                                |

### Visibility

| OC utility class  | Tailwind utility class |
| ----------------- | ---------------------- |
| `oc-invisible-sr` | `sr-only`              |
| `oc-invisible`    | `invisible`            |
| `oc-hidden`       | `hidden`               |

### Cursor

| OC utility class    | Tailwind utility class |
| ------------------- | ---------------------- |
| `oc-cursor-pointer` | `cursor-pointer`       |

### Box-shadow

| OC utility class       | Tailwind utility class |
| ---------------------- | ---------------------- |
| `oc-box-shadow-medium` | `shadow-md/20`         |

## Custom CSS

The philosophy of Tailwind is to use utility classes as much as possible. However, in rare occasions where you need to write custom CSS, it's recommended to put your styles into Tailwind's layer system.

### Example

```html
<style>
  @reference '@opencloud-eu/design-system/dist/tailwind.css';

  @layer components {
    .element {
      @apply text-small;
    }
  }
</style>
```

The `reference` is needed so Tailwind classes like `text-small` are recognized when working with `@apply`. Still, you can also use layers without that:

```html
<style>
  @layer components {
    .element {
      font-size: 12px;
    }
  }
</style>
```

Please refer to https://tailwindcss.com/docs/adding-custom-styles#using-custom-css for more information on layers and how to write custom CSS with Tailwind.

## OcCard

`OcCard` is now a dedicated component instead of a class.

```ts
<div class="oc-card"> // [!code --]
<oc-card> // [!code ++]
  <div class="oc-card-header"> // [!code --]
    <template #header>  // [!code ++]
    <h2>Card title</h2>
  </div> // [!code --]
  </template> // [!code ++]
  <div class="oc-card-body"> // [!code --]
    <p>Some body content</p>
  </div> // [!code --]
  <div class="oc-card-footer"> // [!code --]
  <template #footer>  // [!code ++]
    <p>Some footer</p>
  </div> // [!code --]
  </template> // [!code ++]
</div> // [!code --]
</oc-card> // [!code ++]
```

Please refer to the [OcCard docs](../components/OcCard/OcCard.md) for more details on how to use this component.

## OcGrid

The `OcGrid` component has been removed. Please use the [Tailwind grid layout](https://tailwindcss.com/docs/grid-template-columns) instead.

## Mixins

The following mixins have been removed:

- `oc-form-check-size`
- `oc-icon-size`
- `oc-spinner-size`

## Media queries (breakpoints)

The custom breakpoint variables have been removed:

- `$oc-breakpoint-xsmall-max`
- `$oc-breakpoint-small-default`
- `$oc-breakpoint-small-max`
- `$oc-breakpoint-medium-default`
- `$oc-breakpoint-medium-max`
- `$oc-breakpoint-large-default`
- `$oc-breakpoint-large-max`
- `$oc-breakpoint-xlarge`

Please use the corresponding [Tailwind utilities](https://tailwindcss.com/docs/responsive-design) instead. The old breakpoints have been mapped to those.

```ts
<div class="element" /> // [!code --]
<div class="hidden sm:block" /> // [!code ++]

<style> // [!code --]
  .element { // [!code --]
    display: block; // [!code --]
  } // [!code --]
  @media (max-width: $oc-breakpoint-small-default) { // [!code --]
    .element { // [!code --]
      display: none; // [!code --]
    } // [!code --]
  } // [!code --]
</style> // [!code --]
```

## Theming options

The theming options for breakpoints, spacing, fontSizes and sizes have been removed. They just added unnecessary complexity and are not needed with Tailwind.
