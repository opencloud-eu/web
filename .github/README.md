# OpenCloud Web Documentation

This directory contains the GitHub Actions workflows for OpenCloud Web.

## Documentation

The documentation for this project is automatically deployed to GitHub Pages with every push to the main branch.

When enabled, the documentation is available at:

- `https://[organization-name].github.io/[repository-name]/`

## Workflow

The documentation workflow runs automatically when changes are made to the `docs/` directory in the main branch. It uses Hugo with the [Geekdoc theme](https://github.com/thegeeklab/hugo-geekdoc) to build the documentation site and deploys it to GitHub Pages.

You can also trigger the workflow manually from the Actions tab in the GitHub repository.

## Theme

The documentation uses the Geekdoc theme, which provides the following features:

- Responsive design
- Dark mode support
- Search functionality
- Customizable sidebar
- Table of contents
- Automatic page navigation
- Code highlighting
- Custom shortcodes including `hint` and `toc`

For more information about the theme, see the [Geekdoc documentation](https://geekdocs.de/).