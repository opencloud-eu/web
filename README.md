<div align=center>

[![Matrix](https://img.shields.io/matrix/opencloud%3Amatrix.org?logo=matrix)](https://app.element.io/#/room/#opencloud:matrix.org)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

# OpenCloud Web

With OpenCloud Web you can manage your OpenCloud in your browser.

</div>

![image](https://github.com/user-attachments/assets/f7d0b419-674c-44b5-aa30-1dd6b6d029de)

OpenCloud Web is a single page, standalone frontend, based on modern web technologies. It brings new features as well as improved user flows and can be deployed independent of the backend server.

## Examples

Here are some examples of what you can do with OpenCloud Web:

- 🗂 **Files**: Upload, download, search and manage files (as you may know it for example from Dropbox, OneDrive, Google Drive etc.).
- 👥 **Share:** Allow fine-grained access to files and whole folders directly with other users on your OpenCloud.
- 🔗 **Links**: Create links and share them with anyone in the world - optional password-protection available.
- 📝 **Write**: Edit your documents with the editor of your choice like Collabora, ONLYOFFICE or Microsoft Word and more.
- 🤝 **Collaborate** in real-time on documents.
- 🚀 **Spaces**: You have to manage important projects? Let Spaces, the new special folders, keep order.
- ◀️ **Versioning** Saved the wrong version? We have the time machine you were looking for! Easily go back in time and restore older versions of your files.
- 📥 **Drop-folders:** Collect files from other people in one folder via a simple link, ex. homework from pupils or photos from your family - optional password-protection available.
- 🔒 **Privacy first:** OpenCloud Web is GDPR compliant and can both be used completely internally or together with external people. It also will never "phone home".
- 🛡 **Secure:** OpenCloud Web is an open source project which means that you can track every action, update and dependency of the software.
- ♿ **Inclusive:** Our goal is to be accessible for kids as well as seniors and for newbies as well as experts - since we are all affected by physical and cognitive limitations, depending on our personal situation.
- 🧩 **Extensible:** OpenCloud Web is built as a platform that can be extended in the most developer friendly way.
- 🌗 **Darkmode:** Initialized with your browser settings, and easily switched to please your eyes better.
- 🎭 **Themes**: Customize to your branding needs or personal taste in no time.
- 👉 and many more...

While the `web` frontend provides a performant, elegant, accessible and themeable base, it also aims to be extendable with custom extensions provided by external developers.

## Repository structure

The backbone of this project is built by the following parts of the `packages`:

- **client:** Generated TypeScript client for communications with the OpenCloud APIs
- **container:** Static assets and rarely changing base files
- **extension-sdk:** Provides utilities for developing and integrating custom extensions
- **pkg:** Shared logic for various places inside the codebase
- **runtime:** Central place of (user) authentication, provisioning of the user interface layout, client side storage, routing, theming, dependencies and (sub)application handling

The repository's `packages` also contains the following apps, which can be en-/disabled via the `config.json`:

- **activities:** An extension that provides a detailed activity stream, showing recent updates
- **admin-settings:** An extension that allows administrators to manage users, groups, spaces and generic settings for their OpenCloud efficiently
- **app-store:** An extension that allows users to browse and download additional apps and extensions directly from the web interface
- **epub-reader:** An extension for opening ebook files
- **external:** An extension for creating, opening and editing files using the WOPI server
- **files:** The default extension and core part of the project, responsible for file sync-and-share - up- and downloading, sharing with other users/groups or via links, version management and more
- **ocm:** Open Cloud Mesh integration to allow for collaboration across OpenCloud instances
- **pdf-viewer:** An extension for opening PDF files without leaving the UI
- **preview:** An extension for opening audio, video and image files
- **search:** An extension for registering search providers, which then get rendered into the layout in the **runtime** using an extension point
- **text-editor:** An extension for creating, opening and editing plain text files, like e.g. `.md` or `.txt`
- **webfinger:** Redirect app for the OpenCloud webfinger service

The full documentation on all available packages and the general repository structure [can be found in the docs](https://docs.opencloud.eu/docs/dev/web/development/repo-structure).

## Releases

We currently publish a new release every couple of weeks, strictly following [semver](https://semver.org/). Releases and their corresponding changelogs can be found on [the release page](https://github.com/opencloud-eu/web/releases) on GitHub.

## Documentation

The documentation is an important part of this project and can be found in the [Web dev docs](https://docs.opencloud.eu/docs/dev/web/).
If you want to contribute to the documentation you can find the source files in the [docs repository](https://github.com/opencloud-eu/docs/tree/main/docs/dev/20-web).

## Contribution

Contribution in the form of bug reports, user feedback or actual code is always welcome! We do have a [contribution guide](https://github.com/opencloud-eu/opencloud/blob/main/CONTRIBUTING.md), actively use the [good-first-issue](https://github.com/opencloud-eu/web/issues?q=is%3Aissue%20state%3Aopen%20label%3AType%3AGood-First-Issue) label and try to feedback on issues and pull requests in a timely manner. There is also a [setup guide](https://docs.opencloud.eu/docs/dev/web/getting-started) for building and running `web` locally.

## Tests

We assert the quality of this project by running an automated CI, while a guide on running the tests locally can be found in the [testing documentation](https://docs.opencloud.eu/docs/dev/web/testing/).

## Jobs

At OpenCloud, we are always looking for new additions to our team. You are welcome to take a look at [our open positions](https://www.heinlein-support.de/jobs).

## License

GNU Affero General Public License - [Details](https://github.com/opencloud-eu/web/blob/main/LICENSE)
