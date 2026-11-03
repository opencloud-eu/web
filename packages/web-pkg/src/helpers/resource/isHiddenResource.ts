import { Resource } from '@opencloud-eu/web-client'

/**
 * A resource is hidden if its own name or any segment of its path starts with a dot,
 * e.g. both `.hidden` and `.hidden/inside.txt`.
 */
export function isHiddenResource(resource: Pick<Resource, 'name' | 'path'>): boolean {
  if (resource.name?.startsWith('.')) {
    return true
  }
  return (resource.path || '').split('/').some((segment) => segment.startsWith('.'))
}
