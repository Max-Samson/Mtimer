import { test as base, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

const root = resolve(import.meta.dirname, '../../test-dist')
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

export const test = base.extend({
  page: async ({ page }, run) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      // 所有外部请求均拒绝，避免使用真实服务或用户数据。
      if (url.origin !== 'https://mtimer.test')
        return route.abort('blockedbyclient')
      const pathname =
        url.pathname === '/'
          ? '/tests/e2e/index.html'
          : decodeURIComponent(url.pathname)
      const file = resolve(root, `.${pathname}`)
      if (!file.startsWith(root + sep))
        return route.fulfill({ status: 403, body: 'Forbidden' })
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: types[extname(file)] ?? 'application/octet-stream',
        })
      } catch {
        await route.fulfill({
          status: 404,
          body: 'Build the browser fixture with npm run build:e2e first',
        })
      }
    })
    await run(page)
    expect(errors, 'Uncaught browser errors').toEqual([])
    if (!page.isClosed()) {
      const unexpected = await page.evaluate(
        () =>
          (window as unknown as { __MTIMER_E2E__?: { unexpected: string[] } })
            .__MTIMER_E2E__?.unexpected ?? []
      )
      expect(unexpected, 'Native calls require an explicit fixture').toEqual([])
    }
  },
})
export { expect }
