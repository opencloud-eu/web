/**
 * Checks compiled translations.json files for markup. Runs after vue-gettext-compile (see the
 * `translations` target in packages/web-runtime/l10n/Makefile), so translations from Transifex
 * can't bring HTML into the app.
 *
 * A translation that contains markup is removed for its language, so the English text is shown
 * instead, and a warning is logged. The file is only written if something was removed.
 *
 * Example: the German "Delete" pair is removed, French and all other German strings stay.
 *
 *   { "de": { "Delete": "Löschen<img src=x onerror=alert(1)>", "Rename": "Umbenennen" },
 *     "fr": { "Delete": "Supprimer", "Rename": "Renommer" } }
 *
 *   becomes
 *
 *   { "de": { "Rename": "Umbenennen" },
 *     "fr": { "Delete": "Supprimer", "Rename": "Renommer" } }
 *
 * Usage: node dev/scripts/check-translations.ts <translations.json>...
 */
import { readFile, writeFile } from 'node:fs/promises'

type Message = string | string[]
type Translations = Record<string, Record<string, Message | Record<string, Message>>>

// HTML markup (tags, end tags, comments, doctypes) can only start with `<` followed by a letter,
// `!`, `/` or `?`. Plain text like `a < b` or `<3` doesn't match.
const markupPattern = /<[a-zA-Z!/?]/
// the placeholder syntax of vue3-gettext, e.g. `%{ amount }`
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
