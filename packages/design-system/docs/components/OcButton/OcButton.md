---
title: OcButton component
next: false
prev: false
---

# OcButton component

## Description

The `OcButton` component is supposed to be used for interface actions. It's suitable for all-purpose use.

It defaults to an outlined button with a white background. A filled appearance should be used only once per view for the main call-to-action. All buttons are built with a css grid which ensures that there will be a pre-defined gutter between all child items.

## Accessibility

### Distinction when to use `<button>` and when to use an `<a>`

Regardless of the visual representation the following differentiation should be made if in doubt what to choose:

- An anchor/link changes the location, be it internally on the website, or to another resource/document/route.
- A button does change the state of the website, e.g.: adds, deletes, opens, ...

### Accessible name

The `accessible-name` of a button is derived from several sources. Right now, only two of them are relevant:

- The value of the `aria-label` attribute
- The text between the opening and closing tag: `<button>This text here</button>`

When an `aria-label` attribute exists, its value will override the button text. So in this case, the accessible name would be "foo": `<button aria-label="foo">Bar</button>`, although visual users will see "Bar". This difference between accessible name and visual name is a problem for a certain type of assistive technology (explainer for the term), this is why the WCAG success criterion 2.5.3, "Label in name" exists. This difference should be avoided, if it can't, W3C recommends that the accessible name should start with visible label.

### Icon-only button

Every icon-only button has to have an `aria-label` that describes the purpose of the button.

## Examples

### Appearance

::: livecode

```html
<oc-button appearance="filled">Filled</oc-button>
<oc-button appearance="outline">Outline</oc-button>
<oc-button appearance="raw" class="oc-mx-s">Raw</oc-button>
<div class="oc-p-s oc-mt-m" style="background: #000000;">
  <oc-button appearance="raw-inverse">Raw-inverse</oc-button>
</div>
```

:::

### Icons

::: livecode

```html
<oc-button appearance="filled"><oc-icon name="home" /><span>Home</span></oc-button>
<oc-button><oc-icon name="home" /><span>Home</span></oc-button>
<oc-button aria-label="Go to your home"><oc-icon name="home" /></oc-button>
<oc-button aria-label="Go to your home" appearance="raw" class="oc-mx-s"
  ><oc-icon name="home"
/></oc-button>
```

:::

### Groups

::: livecode

```html
<div class="oc-button-group">
  <oc-button>Foo</oc-button>
  <oc-button>Bar</oc-button>
  <oc-button appearance="filled">Baz</oc-button>
</div>
```

:::

### Click handler

A click handler can be registered via the `@click` property.

::: livecode {path=/components/OcButton/handler.vue}
<<< @/components/OcButton/handler.vue
:::

::: component-api
