import { createMemoryHistory, createRouter, Router } from 'vue-router'
import { buildUrl } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'

function setLocation(location: string, base: string) {
  delete window.location
  window.location = new URL(location) as any

  document.querySelectorAll('base').forEach((e) => e.remove())

  if (base) {
    const baseElement = document.createElement('base')
    baseElement.href = base
    document.getElementsByTagName('head')[0].appendChild(baseElement)
  }
}

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
    setLocation(location, base)

    const router = {} as Router
    router.resolve = () => ({ href: urlJoin(base, path) }) as any

    expect(buildUrl(router, path)).toBe(expected)
  })

  it.each([
    {
      description: 'named route in hash mode',
      location: 'https://localhost:9200/#/files/list/all',
      base: '',
      to: { name: 'app-view', params: { item: 'abc' } },
      expected: 'https://localhost:9200/#/app/view/abc'
    },
    {
      description: 'named route in hash mode with index.html',
      location: 'https://localhost:9200/index.html#/files/list/all',
      base: '',
      to: { name: 'app-view', params: { item: 'abc' } },
      expected: 'https://localhost:9200/#/app/view/abc'
    },
    {
      description: 'named route with query in hash mode',
      location: 'https://localhost:9200/#/files/list/all',
      base: '',
      to: { name: 'app-view', query: { contextRouteName: 'files' } },
      expected: 'https://localhost:9200/#/app/view?contextRouteName=files'
    },
    {
      description: 'named route in history mode',
      location: 'https://localhost:9200/files/list/all',
      base: '/',
      to: { name: 'app-view', params: { item: 'abc' } },
      expected: 'https://localhost:9200/app/view/abc'
    },
    {
      description: 'named route in history mode with base path',
      location: 'https://localhost:9200/foo/files/list/all',
      base: '/foo',
      to: { name: 'app-view', params: { item: 'abc' } },
      expected: 'https://localhost:9200/foo/app/view/abc'
    },
    {
      description: 'named route with query in history mode',
      location: 'https://localhost:9200/foo/files/list/all',
      base: '/foo',
      to: { name: 'app-view', query: { contextRouteName: 'files' } },
      expected: 'https://localhost:9200/foo/app/view?contextRouteName=files'
    },
    {
      description: 'path with query in history mode',
      location: 'https://localhost:9200/foo/files/list/all',
      base: '/foo',
      to: '/app/view?contextRouteName=files',
      expected: 'https://localhost:9200/foo/app/view?contextRouteName=files'
    }
  ])('builds the url for a $description', ({ location, base, to, expected }) => {
    setLocation(location, base)

    const router = createRouter({
      history: createMemoryHistory(base || '#'),
      routes: [{ name: 'app-view', path: '/app/view/:item?', component: {} }]
    })

    expect(buildUrl(router, to)).toBe(expected)
  })
})
