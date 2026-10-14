import { createMemoryHistory, createRouter, Router } from 'vue-router'
import { buildUrl } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'

describe('buildUrl', () => {
  it.each`
    location                                     | base      | path            | expected
    ${'https://localhost:9200/#/files/list/all'} | ${''}     | ${'/login/foo'} | ${'https://localhost:9200/#/login/foo'}
    ${'https://localhost:9200/#/files/list/all'} | ${''}     | ${'/bar.html'}  | ${'https://localhost:9200/bar.html'}
    ${'https://localhost:9200/files/list/all'}   | ${'/'}    | ${'/login/foo'} | ${'https://localhost:9200/login/foo'}
    ${'https://localhost:9200/files/list/all'}   | ${'/foo'} | ${'/login/foo'} | ${'https://localhost:9200/foo/login/foo'}
    ${'https://localhost:9200/files/list/all'}   | ${'/'}    | ${'/bar.html'}  | ${'https://localhost:9200/bar.html'}
    ${'https://localhost:9200/files/list/all'}   | ${'/foo'} | ${'/bar.html'}  | ${'https://localhost:9200/foo/bar.html'}
  `('$path -> $expected', ({ location, base, path, expected }) => {
    delete window.location
    window.location = new URL(location) as any

    document.querySelectorAll('base').forEach((e) => e.remove())

    if (base) {
      const baseElement = document.createElement('base')
      baseElement.href = base
      document.getElementsByTagName('head')[0].appendChild(baseElement)
    }

    const router = {} as Router
    router.resolve = () => ({ href: urlJoin(base, path) }) as any

    expect(buildUrl(router, path)).toBe(expected)
  })

  it.each`
    location                                               | base      | to                                                            | expected
    ${'https://localhost:9200/#/files/list/all'}           | ${''}     | ${{ name: 'app-view', params: { item: 'abc' } }}              | ${'https://localhost:9200/#/app/view/abc'}
    ${'https://localhost:9200/index.html#/files/list/all'} | ${''}     | ${{ name: 'app-view', params: { item: 'abc' } }}              | ${'https://localhost:9200/#/app/view/abc'}
    ${'https://localhost:9200/#/files/list/all'}           | ${''}     | ${{ name: 'app-view', query: { contextRouteName: 'files' } }} | ${'https://localhost:9200/#/app/view?contextRouteName=files'}
    ${'https://localhost:9200/files/list/all'}             | ${'/'}    | ${{ name: 'app-view', params: { item: 'abc' } }}              | ${'https://localhost:9200/app/view/abc'}
    ${'https://localhost:9200/foo/files/list/all'}         | ${'/foo'} | ${{ name: 'app-view', params: { item: 'abc' } }}              | ${'https://localhost:9200/foo/app/view/abc'}
    ${'https://localhost:9200/foo/files/list/all'}         | ${'/foo'} | ${{ name: 'app-view', query: { contextRouteName: 'files' } }} | ${'https://localhost:9200/foo/app/view?contextRouteName=files'}
    ${'https://localhost:9200/foo/files/list/all'}         | ${'/foo'} | ${'/app/view?contextRouteName=files'}                         | ${'https://localhost:9200/foo/app/view?contextRouteName=files'}
  `('$to -> $expected', ({ location, base, to, expected }) => {
    delete window.location
    window.location = new URL(location) as any

    document.querySelectorAll('base').forEach((e) => e.remove())

    if (base) {
      const baseElement = document.createElement('base')
      baseElement.href = base
      document.getElementsByTagName('head')[0].appendChild(baseElement)
    }

    const router = createRouter({
      history: createMemoryHistory(base || '#'),
      routes: [
        {
          name: 'app-view',
          path: '/app/view/:item?',
          component: {}
        }
      ]
    })

    expect(buildUrl(router, to)).toBe(expected)
  })
})
