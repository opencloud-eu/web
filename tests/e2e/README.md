# E2E Tests

[Gherkin](https://cucumber.io/docs/gherkin/) features run with [Playwright](https://playwright.dev/) via
[playwright-bdd](https://github.com/vitalets/playwright-bdd).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Generating Tests From Features](#generating-tests-from-features)
- [Running Tests From the Terminal](#running-tests-from-the-terminal)
- [Running Tests in VS Code](#running-tests-in-vs-code)
- [Test Report](#test-report)
- [Debugging](#debugging)
- [Timeouts](#timeouts)

## Prerequisites

- A running OpenCloud backend (root [docker-compose.yml](../../docker-compose.yml), `docker-compose up -d`)
- `pnpm build` run once (repo root)
- Install playwright browsers: `npx playwright install` (in `tests/e2e`)

## Generating Tests From Features

Feature files (`tests/e2e/features/**/*.feature`) are compiled into Playwright spec (`tests/e2e/.features-gen`, gitignored)
files with [playwright-bdd](https://github.com/vitalets/playwright-bdd):

```bash
(cd tests/e2e pnpm bddgen)
```

> [!IMPORTANT]
> Re-run after adding/changing a `.feature` file or adding/renaming a step. All commands below assume
> `.features-gen` is up to date.

## Running Tests From the Terminal

```bash
pnpm test:e2e   # from repo root: runs bddgen + playwright test
```

Tests run **headless** by default. See the [Playwright CLI docs](https://playwright.dev/docs/test-cli) for all flags:

```bash
pnpm test:e2e --headed                                          # show the browser
pnpm test:e2e test --ui                                         # interactive UI mode (https://playwright.dev/docs/test-ui-mode)
pnpm test:e2e favorites.feature.spec.js:10 --project=chromium   # single scenario, single project
pnpm test:e2e -g "mark and unmark resources as favorites using batch action"
pnpm test:e2e --workers=1                                       # override worker count (default: ~4 locally, 1 on CI)
```

Available [projects](./playwright.config.ts): `chromium`, `firefox`, `webkit`, `mobile-chromium`, `mobile-webkit`,
`ipad-chromium`, `ipad-landscape-webkit`.

Useful env vars (set before the command, e.g. `OC_BASE_URL=... pnpm test:e2e`; full list in
[`playwright.config.ts`](./playwright.config.ts) `appConfig`):

| Variable                       | Default                     | Description                      |
| ------------------------------ | --------------------------- | -------------------------------- |
| `OC_BASE_URL`                  | `host.docker.internal:9200` | URL of the OpenCloud instance    |
| `BASIC_AUTH`                   | `false`                     | Basic auth instead of OIDC login |
| `KEYCLOAK`                     | `false`                     | Enable Keycloak-specific tests   |
| `FEDERATED_SERVER`             | `false`                     | Run against the federated server |
| `SLOW_MO`                      | `0`                         | Slow down operations by N ms     |
| `TEST_TIMEOUT`                 | `120`                       | Per-test timeout in seconds      |
| `FAIL_ON_UNCAUGHT_CONSOLE_ERR` | `true`                      | Fail on uncaught console errors  |

## Running Tests in VS Code

Install [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
(recommended in [`.vscode/extensions.json`](../../.vscode/extensions.json)).

1. `cd tests/e2e && pnpm bddgen` at least once.
2. Open the **Testing** sidebar (flask icon) — generated specs appear as a tree.
3. Run/debug via the ▶ icons; toggle "Show browser" for `--headed`.

## Test Report

[HTML report](https://playwright.dev/docs/test-reporters#html-reporter) of the **last test run**
(`playwright-report/`):

```bash
(cd tests/e2e && pnpm exec playwright show-report)
```

## Debugging

- `pnpm playwright test --debug` — [Playwright Inspector](https://playwright.dev/docs/debug#playwright-inspector)
  (combine with `--project=chromium -g "scenario name"` to target one test).
- `pnpm playwright show-trace <trace.zip>` — [Trace Viewer](https://playwright.dev/docs/trace-viewer) for a recorded
  trace (recorded `on-first-retry` by default, see `playwright.config.ts`).

## Timeouts

There is a single **per-test** timeout, `testTimeout` (default `120`s, override with `TEST_TIMEOUT`). It is the
budget for the whole scenario (all steps + hooks)

When a scenario needs more time, use ([playwright-bdd special tags](https://vitalets.github.io/playwright-bdd/#/writing-features/special-tags)):

```gherkin
@slow                 # test.slow() → triples the timeout
Scenario: Upload large resources ...

@timeout:300000       # exact timeout in milliseconds
Scenario: something even longer ...
```
