import { Locator, expect } from '@playwright/test'
import { getSSEEvents } from '../environment/sse'
import { appConfig } from '../../playwright.config'

// waits until the CSS transitions of the element (e.g. a sliding sidebar panel) have finished,
// also passes if there is no transition at all, e.g. with reduced motion
export async function waitForTransitionsToEnd(locator: Locator): Promise<void> {
  await expect
    .poll(() =>
      locator.evaluate(
        (element) =>
          element.getAnimations().filter((animation) => animation instanceof CSSTransition).length
      )
    )
    .toBe(0)
}

// clicks the trigger until the target shows up, for drops that sometimes ignore the first click
export async function clickUntilVisible(trigger: Locator, target: Locator): Promise<void> {
  await expect(async () => {
    if (!(await target.isVisible())) {
      await trigger.click()
    }
    await expect(target).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: appConfig.minTimeout * 2 * 1000 })
}

// clicks the trigger until the target has the class, e.g. a sidebar panel select click
// that firefox sometimes ignores right after the sidebar got opened
export async function clickUntilClass(
  trigger: Locator,
  target: Locator,
  className: string
): Promise<void> {
  await expect(async () => {
    const classes = (await target.getAttribute('class', { timeout: 1000 })) || ''
    if (!classes.split(/\s+/).includes(className)) {
      await trigger.click({ timeout: 2000 })
    }
    await expect(target).toContainClass(className, { timeout: 2000 })
  }).toPass({ timeout: appConfig.minTimeout * 3 * 1000 })
}

export const buildXpathLiteral = (value: string) => {
  switch (true) {
    case !value.includes("'"):
      // if we don't have any single quotes, then wrap them with single quotes
      return "'" + value + "'"
    case !value.includes('"'):
      // if we don't have any double quotes, then wrap them with double quotes
      return '"' + value + '"'
    default:
      // use concat to find the literal in the xpath if they contain both quotes
      return "concat('" + value.replace(/'/g, "',\"'\",'") + "')"
  }
}

export const waitForSSEEvent = (user: string, event: string) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(function () {
      const events = getSSEEvents(user)
      // some events arrive delayed, e.g. Collabora unlocks files ~5s after the editor is closed
      if (Date.now() - startTime > appConfig.minTimeout * 3 * 1000) {
        reject(new Error(`SSE event ${event} was not obtained in the events list:[${events}]`))
        clearInterval(interval)
      }
      if (events.indexOf(event) !== -1) {
        // remove the read event
        events.splice(events.indexOf(event), 1)
        resolve(true)
        clearInterval(interval)
      }
    }, 500)
  })
}

export const expectNoSSEEvent = async (user: string, event: string) => {
  // give the server time to deliver an unexpected event
  await new Promise((resolve) => setTimeout(resolve, appConfig.minTimeout * 1000))
  const events = getSSEEvents(user)
  if (events.includes(event)) {
    throw new Error(`SSE event ${event} was unexpectedly obtained in the events list:[${events}]`)
  }
}
