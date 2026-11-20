import { readFile, writeFile } from 'node:fs/promises'

type Message = string | string[]
type Translations = Record<string, Record<string, Message | Record<string, Message>>>

const markupPattern = /<[a-zA-Z!/?]/
const placeholderPattern = /%\{((?:.|\n)+?)\}/g

function collectStrings(value: Message | Record<string, Message>): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  return Object.values(value).flatMap(collectStrings)
}

// placeholders resolve to their expression or a parameter value, both could complete a tag
function containsMarkup(text: string) {
  return [
    text,
    text.replace(placeholderPattern, (_, expression: string) => expression.trim()),
    text.replace(placeholderPattern, (_, expression: string) => `x${expression.trim()}`)
  ].some((variant) => markupPattern.test(variant))
}

function checkTranslations(translations: Translations) {
  const cleaned: Translations = {}
  const removed: { language: string; msgid: string; value: string }[] = []
  for (const [language, messages] of Object.entries(translations)) {
    cleaned[language] = {}
    for (const [msgid, value] of Object.entries(messages)) {
      const offending = collectStrings(value).find(containsMarkup)
      if (offending === undefined) {
        cleaned[language][msgid] = value
        continue
      }
      removed.push({ language, msgid, value: offending })
    }
  }
  return { cleaned, removed }
}

function shorten(text: string) {
  return text.length > 100 ? `${text.slice(0, 100)}...` : text
}

for (const file of process.argv.slice(2)) {
  const { cleaned, removed } = checkTranslations(JSON.parse(await readFile(file, 'utf-8')))
  if (!removed.length) {
    continue
  }
  for (const { language, msgid, value } of removed) {
    console.warn(
      `WARNING: removed the ${language} translation of "${shorten(msgid)}" from ${file}, it contains markup: ${shorten(value)}`
    )
  }
  await writeFile(file, JSON.stringify(cleaned))
}
