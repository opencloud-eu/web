import { AxiosInstance } from 'axios'
import { DriveItemsFactory } from '../../../../src/graph/driveItems/driveItems'
import { Configuration } from '../../../../src/graph/generated'

const basePath = 'https://cloud.test/graph'

const getClient = () => {
  const request = vi.fn().mockResolvedValue({ data: { id: 'item' } })
  const axiosClient = { request, defaults: {} } as unknown as AxiosInstance
  const driveItems = DriveItemsFactory({
    axiosClient,
    config: new Configuration({ basePath })
  })
  return { driveItems, request }
}

const requestedUrl = (request: ReturnType<typeof vi.fn>) => request.mock.calls[0][0].url

describe('statDriveItem', () => {
  it('stats by id through the generated operation', async () => {
    const { driveItems, request } = getClient()

    await driveItems.statDriveItem('storage$space', { itemId: 'storage$space!item' })

    expect(requestedUrl(request)).toBe(
      `${basePath}/v1.0/drives/storage%24space/items/storage%24space!item`
    )
  })

  it('passes select and expand along', async () => {
    const { driveItems, request } = getClient()

    await driveItems.statDriveItem(
      'storage$space',
      { itemId: 'storage$space!item' },
      {
        select: new Set(['@libre.graph.shareTypes' as const]),
        expand: new Set(['children' as const])
      }
    )

    const url = requestedUrl(request)
    expect(url).toContain('%24select=%40libre.graph.shareTypes')
    expect(url).toContain('%24expand=children')
  })

  it('stats by path through the colon syntax', async () => {
    const { driveItems, request } = getClient()

    await driveItems.statDriveItem('storage$space', { path: '/Documents/Notes' })

    expect(requestedUrl(request)).toBe(
      `${basePath}/v1.0/drives/storage%24space/root:/Documents/Notes`
    )
  })

  // the server splits the path on a literal ':/', so a colon in a name must
  // arrive encoded or it would be read as the delimiter
  it('encodes each path segment', async () => {
    const { driveItems, request } = getClient()

    await driveItems.statDriveItem('storage$space', { path: '/Urlaub 2026/tag:1/foo&bar.txt' })

    expect(requestedUrl(request)).toBe(
      `${basePath}/v1.0/drives/storage%24space/root:/Urlaub%202026/tag%3A1/foo%26bar.txt`
    )
  })

  it('ignores a leading and trailing slash on the path', async () => {
    const { driveItems, request } = getClient()

    await driveItems.statDriveItem('storage$space', { path: 'Documents/' })

    expect(requestedUrl(request)).toBe(`${basePath}/v1.0/drives/storage%24space/root:/Documents`)
  })
})

describe('listDriveItemChildren', () => {
  it('lists the children of an item', async () => {
    const request = vi.fn().mockResolvedValue({ data: { value: [{ id: 'child' }] } })
    const axiosClient = { request, defaults: {} } as unknown as AxiosInstance
    const driveItems = DriveItemsFactory({
      axiosClient,
      config: new Configuration({ basePath })
    })

    const children = await driveItems.listDriveItemChildren('storage$space', 'storage$space!item')

    expect(requestedUrl(request)).toBe(
      `${basePath}/v1.0/drives/storage%24space/items/storage%24space!item/children`
    )
    expect(children).toEqual([{ id: 'child' }])
  })
})
