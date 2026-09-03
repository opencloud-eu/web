import { XMLBuilder } from 'fast-xml-parser'
import { DavProperties, DavPropertyValue } from '../constants'
import { buildPrefixMap, parsePropName } from './namespaces'

export type DavPropertyRecord = Partial<Record<DavPropertyValue, unknown>> & Record<string, unknown>

/**
 * The `xmlns:*` attributes for a request body: the two well-known namespaces,
 * plus one for every namespace used by `extraProps`.
 *
 * An app brings its own namespace with the property name, either in Clark
 * notation (`{https://app.example/ns}color`) or in the older `myapp:color`
 * form, where the prefix doubles as the namespace. Nothing has to be
 * registered in this package. `d` and `oc` always keep their real URIs; an
 * extra prop cannot override them.
 */
const buildNamespaceDeclarations = (extraProps: string[]) => {
  const prefixes = buildPrefixMap(extraProps)
  return Object.fromEntries(
    [...prefixes].map(([uri, prefix]) => [`@@xmlns:${prefix}`, uri])
  ) as Record<string, string>
}

const getNamespacedDavProps = (obj: DavPropertyRecord, extraProps: string[]) => {
  const prefixes = buildPrefixMap(extraProps)
  return Object.fromEntries(
    Object.entries(obj).map(([name, value]) => {
      if (extraProps.includes(name)) {
        const { namespace, local } = parsePropName(name)
        // Unprefixed extra props need no declaration, they land in the
        // default namespace.
        const prefix = prefixes.get(namespace)
        return [prefix ? `${prefix}:${local}` : local, value || '']
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
