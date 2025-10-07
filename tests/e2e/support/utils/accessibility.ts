import { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const a11yRuleTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

export async function checkAccessibility(
  page: Page,
  context: string = '',
  includeSelector?: string
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(a11yRuleTags)
  if (includeSelector) {
    builder = builder.include(includeSelector)
  }
  const results = await builder.analyze()

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
    throw new Error(`Accessibility check failed${context ? ` in ${context}` : ''}.`)
  }
}
