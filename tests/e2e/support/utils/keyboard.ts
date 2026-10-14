import { Locator, Page, expect } from '@playwright/test'
import util from 'util'
import { resourceNameSelector } from '../objects/app-files/resource/shared'

const rowCheckboxes = '[data-test-selection-resource-name]'
const rowCheckbox = '[data-test-selection-resource-name="%s"]'
const sortButtons = 'th .oc-button-sort'
const contextMenuAction = 'div[id^="context-menu-drop"] .oc-files-actions-%s-trigger'
const modal = '.oc-modal'

function checkboxInput(locator: Locator): Locator {
  return locator.locator('xpath=descendant-or-self::input[@type="checkbox"]')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getResourceCheckbox(page: Page, resource: string): Locator {
  return checkboxInput(page.locator(util.format(rowCheckbox, resource)))
}

export async function expectRowCheckboxesNamedByResource(page: Page): Promise<void> {
  const checkboxes = page.locator(rowCheckboxes)
  await expect(checkboxes.first()).toBeVisible()
  for (const checkbox of await checkboxes.all()) {
    const resource = await checkbox.getAttribute('data-test-selection-resource-name')
    await expect(checkboxInput(checkbox)).toHaveAccessibleName(new RegExp(escapeRegExp(resource)))
  }
}

export async function expectSortButtonsNamedByVisibleLabel(page: Page): Promise<void> {
  const buttons = page.locator(sortButtons)
  await expect(buttons.first()).toBeVisible()
  for (const button of await buttons.all()) {
    const label = (await button.innerText()).trim()
    if (!label) {
      continue
    }
    // WCAG 2.5.3: the accessible name must contain the visible label
    await expect(button).toHaveAccessibleName(new RegExp(escapeRegExp(label), 'i'))
  }
}

export async function toggleResourceCheckboxWithSpace(page: Page, resource: string) {
  await getResourceCheckbox(page, resource).focus()
  await page.keyboard.press('Space')
}

export async function openContextMenuAction(page: Page, resource: string, action: string) {
  await page.locator(util.format(resourceNameSelector, resource)).click({ button: 'right' })
  await page.locator(util.format(contextMenuAction, action)).click()
  await expect(page.locator(modal)).toBeVisible()
}

export async function closeModalWithEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.locator(modal)).toHaveCount(0)
}

function describeActiveElement(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) {
      return 'body'
    }
    return el.outerHTML.slice(0, 200)
  })
}

export async function expectFocusNotLost(page: Page): Promise<void> {
  await expect
    .poll(() => describeActiveElement(page), { message: 'keyboard focus fell back to <body>' })
    .not.toBe('body')
}

export async function expectFocusInside(page: Page, selector: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const inside = await page.evaluate(
          (selector) => !!document.activeElement?.closest(selector),
          selector
        )
        return inside ? selector : await describeActiveElement(page)
      },
      { message: `keyboard focus should be inside ${selector}` }
    )
    .toBe(selector)
}
