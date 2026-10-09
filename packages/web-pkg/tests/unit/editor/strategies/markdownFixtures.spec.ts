import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Marked } from 'marked'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { registerMarkdownListTokenizer } from '../../../../src/editor/extensions'
import { destroyEditors, expectStableRoundtrip } from './helpers'

vi.mock('vue3-gettext', () => ({
  useGettext: () => ({ $gettext: (text: string) => text })
}))

const fixturesDir = join(import.meta.dirname, 'fixtures', 'markdown')

function loadFixtures(dir: string): [string, string][] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const markdown = readFileSync(join(dir, name), 'utf8')
      // an empty fixture would pass silently
      if (!markdown.trim()) {
        throw new Error(`Empty fixture ${name}`)
      }
      return [name, markdown]
    })
}

function save(markdown: string): string {
  return expectStableRoundtrip(markdown).serialized
}

// Reference renderer for both the original and the saved markdown. The list tokenizer
// makes marked read a lone `- ` as an empty item, as CommonMark does. Since the editor
// uses the same tokenizer, empty items need inline tests with exact output.
// The render check is weak where marked differs from the editor, which needs inline
// tests as well: marked reads letter or roman lists and frontmatter as paragraphs,
// expands tabs in list items to spaces, and normalize() folds nbsp into a space.
const marked = new Marked()
registerMarkdownListTokenizer(marked)

const blockTagPattern = /^(BLOCKQUOTE|H[1-6]|HR|OL|P|PRE|TABLE|UL)$/

/**
 * Wraps the inline content of tight list items into paragraphs, since the editor
 * does not keep lists tight or loose.
 */
function wrapListItemContent(item: Element) {
  let paragraph: HTMLParagraphElement | null = null
  for (const child of Array.from(item.childNodes)) {
    if (child instanceof Element && blockTagPattern.test(child.tagName)) {
      paragraph = null
      continue
    }
    if (!paragraph) {
      paragraph = document.createElement('p')
      item.insertBefore(paragraph, child)
    }
    paragraph.appendChild(child)
  }
}

/**
 * Removes differences that do not change what a reader sees: whitespace, tight or
 * loose lists, and the "&nbsp;" the editor writes into empty list items.
 */
function normalize(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const root = template.content

  root
    .querySelectorAll('li > input[type="checkbox"], li > p:first-child > input')
    .forEach((input) => {
      const checkbox = input as HTMLInputElement
      checkbox.closest('li').dataset.task = checkbox.checked ? 'done' : 'open'
      checkbox.remove()
    })
  root.querySelectorAll('li').forEach(wrapListItemContent)

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('code, pre')) {
      node.textContent = node.textContent.replace(/\s+/g, ' ')
    }
  }

  // one tag per line for readable diffs
  return template.innerHTML
    .replace(
      /\s*(<\/?(?:blockquote|br|h[1-6]|hr|li|ol|p|pre|table|thead|tbody|tr|td|th|ul)\b[^>]*>)\s*/g,
      '$1\n'
    )
    .replace(/<p>\n<\/p>\n/g, '')
}

function render(markdown: string): string {
  return normalize(marked.parse(markdown) as string)
}

function expectRoundtrip(markdown: string) {
  const saved = save(markdown)

  expect(render(saved), saved).toBe(render(markdown))
  expect(save(saved)).toBe(saved)
}

describe('markdown fixture roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  it.each(loadFixtures(fixturesDir))('keeps %s', (_, markdown) => {
    expectRoundtrip(markdown)
  })
})
