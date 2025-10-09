import { Page, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { franc } from 'franc-min'

const a11yRuleTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']

export async function checkA11yOrLocalization(
  page: Page,
  context: string,
  selector: string
): Promise<void> {
  if (process.env.RUN_LOCALIZATION_TEST_FOR_LANG === 'de') {
    await checkGermanLanguage(page, selector, context)
  } else {
    await checkAccessibility(page, context, selector)
  }
}

async function checkAccessibility(
  page: Page,
  context: string = '',
  includeSelector: string
): Promise<void> {
  await expect(page.locator(includeSelector)).toBeVisible()
  const builder = new AxeBuilder({ page }).withTags(a11yRuleTags).include(includeSelector)
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

async function checkGermanLanguage(
  page: Page,
  includeSelector: string,
  context: string
): Promise<void> {
  await expect(page.locator(includeSelector)).toBeVisible()

  // wait a bit for dynamic content to load
  await page.waitForTimeout(1000)

  const texts: string[] = await page.evaluate((includeSelector: string) => {
    const allowList = [
      'OpenCloud',
      'web',
      'Spaces',
      'space',
      'parent',
      'lorem',
      'alice',
      'brian',
      'admin',
      'testavatar',
      'A-Z',
      'my_space',
      'GB',
      'MB',
      'KB',
      'B',
      'TB',
      'Gb',
      'Mb',
      'Kb',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      'Ctrl',
      '⌘',
      'Name',
      'Status',
      'E-Mail',
      'Neu',
      'Aktionen',
      'Tags',
      'Personen',
      'CalDAV',
      'CalCAV',
      'Typ',
      'Link',
      '...',
      'Version',
      'Passwort',
      'Avatar',
      'Manager',
      'Titel'
    ]

    const shouldIgnore = (text: string) => {
      if (text.length < 3) return true
      if (/\.(txt|jpeg|md|.odt|png|pdf|docx)$/i.test(text)) return true
      if (allowList.some((a) => text.toLowerCase().includes(a.toLowerCase()))) return true
      return /function|var |const |let |=>|return/.test(text)
    }

    const root = document.querySelector(includeSelector)
    if (!root) return []
    const arr: string[] = []

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
    while (walker.nextNode()) {
      const text = walker.currentNode.nodeValue?.trim()
      if (text && text.length > 2 && !shouldIgnore(text)) {
        arr.push(text)
      }
    }
    return arr
  }, includeSelector)

  const nonGerman: string[] = []
  for (const t of texts) {
    const lang = franc(t, { minLength: 3, only: ['deu', 'eng'] })
    if (lang !== 'deu') {
      nonGerman.push(`${t} [${lang}]`)
    }
  }

  if (nonGerman.length > 0) {
    console.log(`🌐 Language check failed${context ? ` in ${context}` : ''}. Non-German texts:`)
    nonGerman.forEach((text) => console.log(` - ${text}`))
  }
}
