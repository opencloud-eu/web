import { DavNamespaces } from '../constants'

export type PropName = { namespace: string; local: string }

/**
 * Split a property name into its namespace and local name.
 *
 * Two spellings are accepted: Clark notation `{https://app.example/ns}color`,
 * which is also how the property is keyed on a parsed response, and the older
 * `myapp:color`, where the prefix doubles as the namespace. The latter is what
 * earlier versions put on the wire, and the server stores properties under
 * `<namespace>/<local name>`, so keeping it means those values stay readable.
 */
export const parsePropName = (name: string): PropName => {
  if (name.startsWith('{')) {
    const end = name.indexOf('}')
    if (end !== -1) {
      return { namespace: name.slice(1, end), local: name.slice(end + 1) }
    }
  }

  const colonIndex = name.indexOf(':')
  if (colonIndex === -1) {
    return { namespace: '', local: name }
  }
  return { namespace: name.slice(0, colonIndex), local: name.slice(colonIndex + 1) }
}

/**
 * The key a property appears under on a parsed response. Matches the Clark
 * notation the WebDAV client is asked to produce, so it is stable no matter
 * which prefix a server picked to serialise the property with.
 */
export const toClarkKey = (name: string): string => {
  const { namespace, local } = parsePropName(name)
  return namespace ? `{${namespace}}${local}` : local
}

/**
 * Assign a prefix to every namespace used by `names`, so they can be declared
 * on a request body. Prefixes are cosmetic: the server identifies a property by
 * its namespace, so a generated one is as good as any, as long as the two
 * well-known namespaces keep theirs and a name that brought its own prefix
 * keeps that too.
 */
export const buildPrefixMap = (names: string[]): Map<string, string> => {
  const prefixes = new Map<string, string>(
    Object.entries(DavNamespaces).map(([prefix, uri]) => [uri, prefix])
  )
  const taken = new Set(prefixes.values())

  let generated = 0
  for (const name of names) {
    const { namespace } = parsePropName(name)
    if (!namespace || prefixes.has(namespace)) {
      continue
    }
    // `myapp:color` can keep `myapp`, Clark notation has no prefix to keep.
    const own = name.startsWith('{') ? null : namespace
    let prefix = own && !taken.has(own) ? own : `ns${generated++}`
    while (taken.has(prefix)) {
      prefix = `ns${generated++}`
    }
    prefixes.set(namespace, prefix)
    taken.add(prefix)
  }
  return prefixes
}
