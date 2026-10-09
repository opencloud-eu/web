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

interface Fixture {
  name: string
  markdown: string
  expected: string
}

const outputSuffix = '.out.md'

function readFixture(dir: string, name: string): string {
  const content = readFileSync(join(dir, name), 'utf8')
  // an empty fixture would pass silently
  if (!content.trim()) {
    throw new Error(`Empty fixture ${name}`)
  }
  return content
}

function trimFinalNewline(markdown: string): string {
  return markdown.endsWith('\n') ? markdown.slice(0, -1) : markdown
}

/**
 * Loads the `<name>.md` fixtures. The editor must save a fixture unchanged, or as
 * `<name>.out.md` where that exists. A single final newline is ignored.
 */
function loadFixtures(dir: string): Fixture[] {
  const names = readdirSync(dir).sort()
  names
    .filter((name) => name.endsWith(outputSuffix))
    .forEach((name) => {
      if (!names.includes(name.replace(outputSuffix, '.md'))) {
        throw new Error(`Output ${name} without fixture`)
      }
    })

  return names
    .filter((name) => name.endsWith('.md') && !name.endsWith(outputSuffix))
    .map((name) => {
      const markdown = readFixture(dir, name)
      const output = name.replace(/\.md$/, outputSuffix)
      const expected = names.includes(output) ? readFixture(dir, output) : markdown
      return { name, markdown, expected }
    })
}

// Reference renderer for both the original and the saved markdown. The list tokenizer
// makes marked read a lone `- ` as an empty item, as CommonMark does.
// The render check is weak where marked differs from the editor, which the exact
// output check covers: marked reads letter or roman lists and frontmatter as
// paragraphs, expands tabs in list items to spaces, and normalize() folds nbsp into
// a space.
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

function expectSaved({ markdown, expected }: Fixture): string {
  const { serialized, reserialized } = expectStableRoundtrip(markdown)

  expect(trimFinalNewline(serialized)).toBe(trimFinalNewline(expected))
  expect(reserialized).toBe(serialized)
  return serialized
}

describe('markdown fixture roundtrip', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  afterEach(() => {
    destroyEditors()
  })

  it.each(loadFixtures(fixturesDir))('keeps $name', (fixture) => {
    const saved = expectSaved(fixture)

    expect(render(saved), saved).toBe(render(fixture.markdown))
  })
})
