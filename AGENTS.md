# AGENTS.md - AI Assistant Guide for OpenCloud Web

## Project Overview

OpenCloud Web is a TypeScript/Vue 3 single-page application that serves as the browser-based frontend for OpenCloud. It is structured as a **pnpm monorepo** and uses Vite as the build tool.

## Repository Structure

```
/
├── packages/          # All packages and apps (monorepo workspaces)
│   ├── web-client/    # API abstraction layer (LibreGraph, WebDAV, OCS)
│   ├── web-pkg/       # Shared composables, components, types and helpers
│   ├── web-runtime/   # Core: auth, bootstrapping, layout, routing, theming
│   ├── web-test-helpers/  # Unit test helpers (published as @opencloud-eu/web-test-helpers)
│   ├── design-system/ # ODS – design tokens, components, styles
│   ├── eslint-config/ # Shared ESLint configuration
│   ├── prettier-config/ # Shared Prettier configuration
│   ├── tsconfig/      # Shared TypeScript configuration
│   ├── extension-sdk/ # Utilities for custom extensions
│   └── web-app-*/     # Standalone apps/extensions (files, search, preview, …)
├── tests/
│   └── e2e/           # End-to-end tests (Playwright + Cucumber)
├── dev/               # Docker/infrastructure config for local development
├── docker-compose.yml
├── vite.config.ts     # Root Vite config
└── package.json       # Root scripts and dev dependencies
```

Each package typically contains:

- `src/` – source code
- `tests/unit/` – unit tests (mirroring `src/` folder structure)
- `l10n/` – translations
- `package.json` – package-specific metadata and dependencies

---

## Running Scripts

Scripts are defined in the root `package.json` and run with `pnpm`:

```
pnpm build             # Production build
pnpm build:w           # Build with watch/hot-reload
pnpm vite              # Instant hot-reload dev server (faster iteration)
pnpm lint              # Run ESLint
pnpm format:check      # Check formatting with Prettier
pnpm format:write      # Auto-fix formatting with Prettier
pnpm check:types       # TypeScript type checking via vue-tsc
pnpm check:all         # Types + lint + format + unit tests (run before opening a PR)
pnpm test:unit --run   # Run all unit tests with Vitest (--run prevents watch mode)
pnpm test:e2e:cucumber # Run e2e tests (default browser)
```

---

## Coding Style

### Formatting

Enforced via Prettier (`packages/prettier-config`). Run `pnpm format:write` to auto-fix.

### Linting

Enforced via ESLint (`packages/eslint-config`). Run `pnpm lint` to check.

### Best practices

#### General

- **TypeScript everywhere** – use types to catch bugs at compile time and support IDE tooling.
- **Composables over services** – encapsulate reusable logic in composables. Avoid services.
- **Early returns** – prefer early returns to keep code readable and performant.
- **Translations** – use `$gettext` (or its variants) for all user-facing strings. Don't manually edit the generated `l10n/translations.json` files inside a package.
- **Minimal dependencies** – avoid adding new dependencies unless necessary, to keep bundle size small and reduce security surface.
- **Vue unref() vs .value** – prefer `unref()` for accessing Ref values for better readability. Use `.value` only when setting values (e.g. `foo.value = 'bar'` or `foo.value.push('bar')`).
- **Functions vs arrow functions** – prefer named `function` declarations over arrow functions. Use arrow functions only for callbacks or when the `this` context requires it.
- **Tailwind CSS** – use Tailwind utility classes for styling. Avoid custom CSS unless necessary.
- **Cross-package imports** – only `web-pkg`, `web-client`, `web-test-helpers`, and `design-system` may be imported from other packages. Always use their package names (e.g. `import { useFoo } from '@opencloud-eu/web-pkg'`), never relative paths. Check each package's `exports` field in `package.json` to see what is exposed.

#### Vue components

- **Composition API + `<script setup>`** – prefer Vue's Composition API with `<script setup>` over the Options API.
- **Component size** – keep components under ~300 lines. Split larger ones into smaller sub-components.
- **Props** – define props with explicit types and default values. Avoid using `any` or `unknown`.
- **Emits** – define emitted events with explicit types.

## Testing

### Unit Tests

- **Framework:** [Vitest](https://vitest.dev/)
- **Location:** `tests/unit/` inside each package, mirroring the `src/` folder structure.
- **File naming:** `{originalFileName}.spec.ts` (e.g. `src/composables/foo.ts` → `tests/unit/composables/foo.spec.ts`).
- **Helpers:** The `@opencloud-eu/web-test-helpers` package (`packages/web-test-helpers`) provides shared utilities for mounting components, mocking stores, etc. Use it instead of rolling your own helpers.
- **Snapshots:** Avoid using snapshot tests, as they can be brittle and hard to maintain. Prefer explicit assertions that check specific behavior or output.
- **Run:** `pnpm test:unit --run` (the `--run` flag is required to prevent Vitest from staying in watch mode)
- **Run single file:** `pnpm test:unit --run packages/path/to/file.spec.ts`

### End-to-End Tests

- **Framework:** [Playwright](https://playwright.dev/) + [Cucumber](https://cucumber.io/)
- **Location:** `tests/e2e/` (outside of `packages/`)
- **Prerequisites:** Run `pnpm build` before executing e2e tests. A running OpenCloud backend is also required — use `docker-compose up -d` to start one locally.
- **Run:** `pnpm test:e2e:cucumber`

## Documentation

Full developer documentation is available at https://docs.opencloud.eu/docs/dev/web/.
