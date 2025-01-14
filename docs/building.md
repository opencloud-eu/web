---
title: "Building from source"
date: 2018-05-02T00:00:00+00:00
weight: 20
geekdocRepo: https://github.com/opencloud-eu/web
geekdocEditPath: edit/master/docs
geekdocFilePath: building.md
---

{{< toc >}}

## Building OpenCloud Web

- Run `pnpm install` to install dependencies
- Run `pnpm build` to build Web and all apps included in the `packages` folder

## Updating dependencies

- Run `pnpm upgrade` to update dependencies

## Building the documentation

### Setting up

- Install [hugo](https://gohugo.io/getting-started/installing/)
- Run `make docs`

### Viewing the documentation

To view the rendered docs in the browser run:
```bash
cd hugo
hugo -D server
```

Then open "http://localhost:1313/"

When making changes to the docs, run `make docs` again and the server will pick up the changes and reload the page automatically

### Deploying the documentation

The documentation is automatically deployed from the master branch to https://docs.opencloud.eu/clients/web/

