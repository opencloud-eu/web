# OcApplicationIcon component

## Description

The `OcApplicationIcon` component showcases an icon with a nice, colored background. You can either specify the background color directly or let the component generate one based on the icon's name.

## Examples

### Default

The default and most simple use case involves an `icon`. Please check out [Remix Icon](https://remixicon.com/) for a list of available icons.

::: livecode
```vue
<oc-application-icon icon="home" />
<oc-application-icon icon="cloud" /> 
<oc-application-icon icon="book" /> 
<oc-application-icon icon="settings" /> 
<oc-application-icon icon="github"/>
```
:::

### Colors

A primary color can be passed to the component. Note that colors need to be in hexadecimal format.

::: livecode
```vue
<oc-application-icon icon="home" color-primary="#e2baff" />
```
:::

::: component-api
