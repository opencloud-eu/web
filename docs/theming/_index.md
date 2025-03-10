---
title: 'Theming'
date: 2021-04-01T00:00:00+00:00
weight: 55
geekdocRepo: https://github.com/opencloud-eu/web
geekdocEditPath: edit/master/docs/theming
geekdocFilePath: _index.md
geekdocCollapseSection: true
---

{{< toc >}}

## Introduction

By providing your own theme, you can customize the user experience for your own OpenCloud installation. This is being achieved by providing a `json` file that contains text snippets (like brand name and slogan), paths to images (e.g. logos or favicon) and design tokens for various color, sizing and spacing parameters.

This page documents the setup and configuration options, and provides a template for you to get started.

## Providing a theme

Please refer to the [web server docs](https://github.com/opencloud-eu/opencloud/tree/main/services/web#loading-themes) for details on how to provide a theme to your OpenCloud instance.

## Configuring a theme

Inside your `theme.json`, there is a `common` key, which is explained in the next section, and a `clients` key: Here, you can find the available OpenCloud clients - please note that the documentation below focuses on `web` and check the respective documentation for other clients for details on their themability.

The general top-level structure of a valid `theme.json` is outlined below:

```json
{
  "common": {},
  "clients": {
    "android": {},
    "desktop": {},
    "ios": {},
    "web": {}
  }
}
```

### Common section

The `common` section provides a set of information that is designed to be available for all clients. It gets merged "down" to the final themes and aims to reduce duplication, but can be overwritten by more specific information inside both the clients' defaults and actual themes.

The structure of a valid `common` section is outlined below:

```json
"common": {
  "name": "OpenCloud",
  "slogan": "OpenCloud – Excellent file sharing",
  "logo": "themes/opencloud/assets/logo.svg",
  "urls": {
    "accessDeniedHelp": "",
    "imprint": "",
    "privacy": ""
  },
  "shareRoles": {}
}
```

All of the below parameters are required:

- `name` specifies the publicly visible name
- `slogan` specifies the publicly visible slogan
- `logo` specifies the logo in e.g. the top bar within the web UI
- `accessDeniedHelp` specifies the target URL for the access denied help link
- `imprintUrl` specifies the target URL for the imprint link
- `privacyUrl` specifies the target URL for the privacy link

### Web Theme

The structure of a valid `web` client section is outlined below:

```json
{
  "web": {
    "defaults": {
      "logo": "", // Please see below for details
      "background": "", // Please see below for details
      "designTokens": {
        // Please see below for details
      }
    },
    "themes": [
      // Your custom web themes go here, see below for details
    ]
  }
}
```

#### The "defaults"

Similar to the top level `common` section, this object contains information that shall be shared among the available themes and can/should be defined only once. The top level `common` section first gets merged into the `defaults`, which then get merged into the individual themes.

##### The image options

Specify a "logo" (e.g. for the top bar), "background" for plain layout pages like the access denied page, and a "favicon".

##### The "loginPage" options

You can set the background image for the login page by providing an image file in the `"backgroundImg"` option.

```json
"loginPage": {
  "backgroundImg": "themes/opencloud/assets/background.png"
},
```

##### The "designTokens" options

To further customize your OpenCloud instance, you can provide your own styles. To give you an idea of how a working design system looks like, feel free to head over to the [OpenCloud design tokens](https://design.opencloud.eu/) for inspiration.

**Hint:** All the variables are initialized using the [OpenCloud design tokens](https://design.opencloud.eu/) and then overwritten by your theme variables. Therefore, you don't have to provide all the variables and can use the default OpenCloud colors as a fallback.

In general, the theme loader looks for a `designTokens` key inside your theme configuration. Inside the `designTokens`, it expects to find a `colorPalette`, `fontSizes`, `roles`, and `spacing` collection. The structure is outlined below:

```json
"designTokens": {
  "breakpoints": {
    // Please see below for details
  },
  "colorPalette": {
    // Please see below for details
  },
  "fontFamily": "", // Please see below for details
  "fontSizes": {
    // Please see below for details
  },
  "roles": {
    // Please see below for details
  },
  "sizes": {
    // Please see below for details
  },
  "spacing": {
    // Please see below for details
  }
}
```

###### Breakpoints

If you'd like to set different breakpoints than the default ones in the OpenCloud design system, you can set them using theming variables.

Breakpoint variables get prepended with `--oc-breakpoint-`, so e.g. _"large-default"_ creates the custom CSS property `--oc-breakpoint-large-default`.

```json
{
  "breakpoints": {
    "xsmall-max": "",
    "small-default": "",
    "small-max": "",
    "medium-default": "",
    "medium-max": "",
    "large-default": "",
    "large-max": "",
    "xlarge": ""
  }
}
```

###### Colors

Some icon colors can be defined via the `colorPalette` key. You can use any valid CSS color format, e.g. **hex** (#fff), **rgb** (rgb(255,255,255)) or **color names** (white).

Color variables get prepended with `--oc-color-`, so e.g. _"icon-folder"_ creates the custom CSS property `--oc-color-icon-folder`.

```json
{
  "colorPalette": {
    "icon-folder": "",
    "icon-archive": "",
    "icon-image": "",
    "icon-spreadsheet": "",
    "icon-document": "",
    "icon-video": "",
    "icon-audio": "",
    "icon-presentation": "",
    "icon-pdf": ""
  }
}
```

###### Font sizes

You can change the `default`, `large` and `medium` font sizes according to your needs. If you need more customization options regarding font sizes, please [open an issue on GitHub](https://github.com/opencloud-eu/web/issues/new) with a detailed description.

Font size variables get prepended with `--oc-font-size-`, so e.g. _"default"_ creates the custom CSS property `--oc-font-size-default`.

```json
{
  "fontSizes": {
    "default": "",
    "large": "",
    "medium": ""
  }
}
```

###### Font family

You can change the font family according to your needs. The font family gets written into the `--oc-font-family` CSS variable.

```json
{
  "fontFamily": ""
}
```

Please note that you also need to make the font available as a `font-face` via CSS.

###### Roles

For the color role values, you can use any valid CSS color format, e.g. **hex** (#fff), **rgb** (rgb(255,255,255)) or **color names** (white).

Color variables get prepended with `--oc-role-`, so e.g. _"primary"_ creates the custom CSS property `--oc-role-primary`.

We use the material design framework for our color roles. Please refer to the [OpenCloud design tokens](https://design.opencloud.eu/designTokens/colorRoles.html) for a full list of available color roles.

```json
{
  "roles": {
    "primary": "",
    "surfaceTint": "",
    "onPrimary": "",
    "primaryContainer": "",
    "onPrimaryContainer": "",
    "secondary": "",
    "onSecondary": "",
    "secondaryContainer": "",
    "onSecondaryContainer": "",
    "tertiary": "",
    "onTertiary": "",
    "tertiaryContainer": "",
    "onTertiaryContainer": "",
    "error": "",
    "onError": "",
    "errorContainer": "",
    "onErrorContainer": "",
    "background": "",
    "onBackground": "",
    "surface": "",
    "onSurface": "",
    "surfaceVariant": "",
    "onSurfaceVariant": "",
    "outline": "",
    "outlineVariant": "",
    "shadow": "",
    "scrim": "",
    "inverseSurface": "",
    "inverseOnSurface": "",
    "inversePrimary": "",
    "primaryFixed": "",
    "onPrimaryFixed": "",
    "primaryFixedDim": "",
    "onPrimaryFixedVariant": "",
    "secondaryFixed": "",
    "onSecondaryFixed": "",
    "secondaryFixedDim": "",
    "onSecondaryFixedVariant": "",
    "tertiaryFixed": "",
    "onTertiaryFixed": "",
    "tertiaryFixedDim": "",
    "onTertiaryFixedVariant": "",
    "surfaceDim": "",
    "surfaceBright": "",
    "surfaceContainerLowest": "",
    "surfaceContainerLow": "",
    "surfaceContainer": "",
    "surfaceContainerHigh": "",
    "surfaceContainerHighest": "",
    "chrome": "",
    "onChrome": ""
  }
}
```

###### Sizes

Use sizing variables to change various UI elements, such as icon and logo appearance, table row or checkbox sizes, according to your needs.
If you need more customization options regarding sizes, please [open an issue on GitHub](https://github.com/opencloud-eu/web/issues/new) with a detailed description.

Size variables get prepended with `--oc-size-`, so e.g. _"icon-default"_ creates the custom CSS property `--oc-size-icon-default`.

```json
{
  "sizes": {
    "form-check-default": "",
    "height-small": "",
    "height-table-row": "",
    "icon-default": "",
    "max-height-logo": "",
    "max-width-logo": "",
    "width-medium": "",
    "tiles-default": "",
    "tiles-resize-step": ""
  }
}
```

###### Spacing

Use the six spacing options (`xsmall | small | medium | large | xlarge | xxlarge`) to create a more (or less) condensed version of the user interface. If you need more customization options regarding sizes, please [open an issue on GitHub](https://github.com/opencloud-eu/web/issues/new) with a detailed description.

Spacing variables get prepended with `--oc-space-`, so e.g. _"xlarge"_ creates the custom CSS property `--oc-space-xlarge`.

```json
{
  "spacing": {
    "xsmall": "",
    "small": "",
    "medium": "",
    "large": "",
    "xlarge": "",
    "xxlarge": ""
  }
}
```

#### Actual Themes

Apart from the `defaults`, you need to provide one or more themes in the `themes` key within the `web`-`clients` in your `theme.json`. As a reminder, the general structure should be:

```json
{
  "common": { ... },
  "clients": {
    ...,
    "web": {
      "defaults": {
        ...
      },
      "themes": [
        {
          "isDark": false,
          "label": "Light Theme",
        }
      ]
    }
  }
}
```

Again, both the global `common` section as well as the `defaults` will get merged into your themes, but locally provided information takes precedence.

Required information

- `label` for the visible label in the theme switcher and to save the current theme to localStorage
- `isDark` to provide the user agent with additional information

Optional information

- `common` see section above
- `designTokens` see section above
- `logo` see section above
- `loginPage` see section above

## Extendability

If you define different key-value pairs inside any of the objects (`breakpoints`, `colorPalette`, `fontSizes`, `roles`, `sizes`, `spacing`) in `"designTokens"`, they will get loaded and initialized as CSS custom properties but don't necessarily take any effect in the user interface. This gives you an opportunity to, for example, customize extensions from within the theme in the web runtime (and not the extension itself).

## Example theme

A full template for your custom theme is provided below, and you can use the instructions above to set it up according to your needs:

```json
{
  "common": {
    "name": "OpenCloud",
    "slogan": "OpenCloud – Excellent file sharing",
    "logo": "themes/opencloud/assets/logo.svg",
    "urls": {
      "accessDeniedHelp": "",
      "imprint": "",
      "privacy": ""
    },
    "shareRoles": {
      "b1e2218d-eef8-4d4c-b82d-0f1a1b48f3b5": {
        "name": "UnifiedRoleViewer",
        "iconName": "eye"
      },
      "a8d5fe5e-96e3-418d-825b-534dbdf22b99": {
        "label": "UnifiedRoleSpaceViewer",
        "iconName": "eye"
      },
      "2d00ce52-1fc2-4dbc-8b95-a73b73395f5a": {
        "label": "UnifiedRoleFileEditor",
        "iconName": "pencil"
      },
      "fb6c3e19-e378-47e5-b277-9732f9de6e21": {
        "label": "UnifiedRoleEditor",
        "iconName": "pencil"
      },
      "58c63c02-1d89-4572-916a-870abc5a1b7d": {
        "label": "UnifiedRoleSpaceEditor",
        "iconName": "pencil"
      },
      "312c0871-5ef7-4b3a-85b6-0e4074c64049": {
        "label": "UnifiedRoleManager",
        "iconName": "user-star"
      },
      "1c996275-f1c9-4e71-abdf-a42f6495e960": {
        "label": "UnifiedRoleUploader",
        "iconName": "pencil"
      },
      "aa97fe03-7980-45ac-9e50-b325749fd7e6": {
        "label": "UnifiedRoleSecureView",
        "iconName": "shield"
      }
    }
  },
  "clients": {
    "android": {},
    "desktop": {},
    "ios": {},
    "web": {
      "defaults": {
        "logo": "themes/opencloud/assets/logo.svg",
        "favicon": "themes/opencloud/assets/favicon.ico",
        "background": "themes/opencloud/assets/background.png",
        "designTokens": {
          "breakpoints": {
            "xsmall-max": "",
            "small-default": "",
            "small-max": "",
            "medium-default": "",
            "medium-max": "",
            "large-default": "",
            "large-max": "",
            "xlarge": ""
          },
          "fontSizes": {
            "default": "",
            "large": "",
            "medium": ""
          },
          "sizes": {
            "form-check-default": "",
            "height-small": "",
            "height-table-row": "",
            "icon-default": "",
            "max-height-logo": "",
            "max-width-logo": "",
            "width-medium": "",
            "tiles-default": "",
            "tiles-resize-step": ""
          },
          "spacing": {
            "xsmall": "",
            "small": "",
            "medium": "",
            "large": "",
            "xlarge": "",
            "xxlarge": ""
          }
        }
      },
      "themes": [
        {
          "isDark": false,
          "label": "Light Theme",
          "designTokens": {
            "roles": {},
            "colorPalette": {
              "icon-folder": "#4d7eaf",
              "icon-archive": "#fbbe54",
              "icon-image": "#ee6b3b",
              "icon-spreadsheet": "#15c286",
              "icon-document": "#3b44a6",
              "icon-video": "#045459",
              "icon-audio": "#700460",
              "icon-presentation": "#ee6b3b",
              "icon-pdf": "#ec0d47"
            }
          }
        },
        {
          "isDark": true,
          "label": "Dark Theme",
          "designTokens": {
            "roles": {},
            "colorPalette": {
              "icon-folder": "rgb(44, 101, 255)",
              "icon-archive": "rgb(255, 207, 1)",
              "icon-image": "rgb(255, 111, 0)",
              "icon-spreadsheet": "rgb(0, 182, 87)",
              "icon-document": "rgb(44, 101, 255)",
              "icon-video": "rgb(0, 187, 219)",
              "icon-audio": "rgb(208, 67, 236)",
              "icon-presentation": "rgb(255, 64, 6)",
              "icon-pdf": "rgb(225, 5, 14)"
            }
          }
        }
      ]
    }
  }
}
```
