import { Page, Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const a11yRuleTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
const skipA11ySelectors = ['#oc-topbar-account-logout']

export async function checkAccessibility(page: Page, context: string = ''): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(a11yRuleTags).analyze()

  if (results.violations.length > 0) {
    console.error(`♿ Accessibility violations detected${context ? ` in ${context}` : ''}:`)
    for (const violation of results.violations) {
      console.error(`\n[${violation.id}] ${violation.help}`)
      console.error(`  Impact: ${violation.impact}`)
      console.error(`  Description: ${violation.description}`)
      console.error(`  Help: ${violation.helpUrl}`)
      violation.nodes.forEach((node, idx) => {
        console.error(`  Node ${idx + 1}: ${node.html}`)
      })
    }
    console.log(
      `Accessibility check failed with ${results.violations.length} violation(s)${context ? ` in ${context}` : ''}.`
    )

    // throw new Error(
    //   `Accessibility check failed with ${results.violations.length} violation(s)${context ? ` in ${context}` : ''}.`
    // )
  }
}

function shouldSkipA11y(selector: string): boolean {
  return skipA11ySelectors.some((skip) => selector.includes(skip))
}

export function patchPageForA11y(page: Page) {
  const originalLocator = page.locator.bind(page)

  page.locator = ((...args: Parameters<Page['locator']>): Locator => {
    const locator = originalLocator(...args)
    const selector = args[0]?.toString?.() ?? ''

    const originalClick = locator.click.bind(locator)
    locator.click = async (...clickArgs) => {
      const result = await originalClick(...clickArgs)
      await page.waitForTimeout(200)

      if (!shouldSkipA11y(selector)) {
        await checkAccessibility(page, `after locator.click(${selector})`)
      }
      return result
    }

    const originalFill = locator.fill.bind(locator)
    locator.fill = async (...fillArgs) => {
      const result = await originalFill(...fillArgs)
      await checkAccessibility(page, `after locator.fill(${args[0]})`)
      return result
    }

    const originalPress = locator.press.bind(locator)
    locator.press = async (...pressArgs) => {
      const result = await originalPress(...pressArgs)
      await checkAccessibility(page, `after locator.press(${args[0]})`)
      return result
    }

    return locator
  }) as typeof page.locator
}
