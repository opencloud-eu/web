import { XMLBuilder } from 'fast-xml-parser'
import { DavNamespaces, DavProperties, DavPropertyValue } from '../constants'

export type DavPropertyRecord = Partial<Record<DavPropertyValue, unknown>> & Record<string, unknown>

/**
 * The `xmlns:*` attributes for a request body: the two well-known namespaces,
 * plus one for every prefix appearing in `extraProps`.
 *
 * An app's own prefix is declared as its own namespace, so `myapp:my-prop`
 * is stored and looked up under `myapp/my-prop`. That keeps prefixes
 * self-describing and lets any app introduce one without touching this package -
 * at the price of the namespace not being a URI, which nothing here needs.
 *
 * `d` and `oc` always keep their real URIs; an extra prop using either prefix
 * cannot override them.
 */
const buildNamespaceDeclarations = (extraProps: string[]) => {
  const declarations: Record<string, string> = Object.fromEntries(
    Object.entries(DavNamespaces).map(([prefix, uri]) => [`@@xmlns:${prefix}`, uri])
  )
  for (const name of extraProps) {
    const [prefix] = name.split(':')
    // Unprefixed extra props need no declaration - they land in the default namespace.
    if (prefix && prefix !== name && !(`@@xmlns:${prefix}` in declarations)) {
      declarations[`@@xmlns:${prefix}`] = prefix
    }
  }
  return declarations
}

const getNamespacedDavProps = (obj: DavPropertyRecord, extraProps: string[]) => {
  return Object.fromEntries(
    Object.entries(obj).map(([name, value]) => {
      if (extraProps.includes(name)) {
        return [name, value || '']
      }

      const davNamespace = DavProperties.DavNamespace.includes(name as unknown as DavPropertyValue)
      const propName = davNamespace ? `d:${name}` : `oc:${name}`
      return [propName, value || '']
    })
  )
}

export const buildPropFindBody = (
  properties: DavPropertyValue[] = [],
  {
    pattern,
    filterRules,
    limit = 0,
    extraProps = []
  }: {
    pattern?: string
    filterRules?: DavPropertyRecord
    limit?: number
    extraProps: string[]
  }
): string => {
  let bodyType = 'd:propfind'
  if (pattern) {
    bodyType = 'oc:search-files'
  }

  if (filterRules) {
    bodyType = 'oc:filter-files'
  }

  const object = properties.reduce<Record<string, unknown>>(
    (obj, item) => Object.assign(obj, { [item]: null }),
    {}
  )
  // Include extra props in the request so they appear in PROPFIND
  for (const ep of extraProps) {
    if (!(ep in object)) {
      object[ep] = null
    }
  }
  const props = getNamespacedDavProps(object, extraProps)

  const xmlObj = {
    [bodyType]: {
      'd:prop': props,
      ...buildNamespaceDeclarations(extraProps),
      ...(pattern && {
        'oc:search': { 'oc:pattern': pattern, 'oc:limit': limit }
      }),
      ...(filterRules && {
        'oc:filter-rules': getNamespacedDavProps(filterRules, [])
      })
    }
  }

  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@@',
    suppressEmptyNode: true
  })

  return builder.build(xmlObj)
}

export const buildPropPatchBody = (
  properties: DavPropertyRecord,
  extraProps: string[] = []
): string => {
  const xmlObj = {
    'd:propertyupdate': {
      'd:set': { 'd:prop': getNamespacedDavProps(properties, extraProps) },
      ...buildNamespaceDeclarations(extraProps)
    }
  }

  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@@',
    suppressEmptyNode: true
  })

  return builder.build(xmlObj)
}
