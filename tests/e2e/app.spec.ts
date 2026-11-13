import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

async function openPreferences(page: Page) {
  await page.getByRole('heading', { name: 'Hello World' }).waitFor()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Preferences', exact: true })
  ).toBeVisible()
}

test('opens preferences by mouse, switches panes and closes with Escape', async ({
  page,
}) => {
  await page.goto('/')
  await openPreferences(page)
  await page.getByRole('button', { name: 'Appearance', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Color Theme', exact: true })
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('keyboard command palette executes a real command', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const search = page.getByPlaceholder('Type a command or search...')
  await expect(search).toBeVisible()
  await search.fill('Open Preferences')
  await page.getByRole('option').filter({ hasText: 'Open Preferences' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Preferences', exact: true })
  ).toBeVisible()
})

test('persists the selected theme across a frontend reload', async ({
  page,
}) => {
  await page.goto('/')
  await openPreferences(page)
  await page.getByRole('button', { name: 'Appearance', exact: true }).click()
  await page.getByRole('combobox', { name: 'Color Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(
    page.getByText('Preferences saved', { exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('a failed save is visible and does not overwrite stored preferences', async ({
  page,
}) => {
  await page.goto('/')
  await openPreferences(page)
  await page.getByRole('button', { name: 'Appearance', exact: true }).click()
  await page.evaluate(() =>
    (
      window as unknown as { __MTIMER_E2E__: { failSave: () => void } }
    ).__MTIMER_E2E__.failSave()
  )
  await page.getByRole('combobox', { name: 'Color Theme', exact: true }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(
    page.getByText('Failed to save preferences', { exact: true }).first()
  ).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'Color Theme', exact: true })
  ).toBeEnabled()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/light/)
})

test('cross-window submission is rendered through the actual event listener', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await page.evaluate(async () => {
    const fixture = (
      window as unknown as {
        __MTIMER_E2E__: {
          emit: (event: string, payload: unknown) => Promise<void>
        }
      }
    ).__MTIMER_E2E__
    await fixture.emit('quick-pane-submit', {
      text: 'Focus <script>safe text</script>',
    })
  })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Last entry: Focus <script>safe text</script>'
  )
  await expect(page.locator('h1 script')).toHaveCount(0)
})

for (const [width, height] of [
  [1000, 700],
  [1440, 900],
]) {
  for (const platform of ['macos', 'windows', 'linux']) {
    test(`layout remains contained: ${platform}, ${width}x${height}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await page.goto(`/?platform=${platform}`)
      await openPreferences(page)
      const dialog = await page
        .getByRole('dialog', { name: 'Preferences', exact: true })
        .boundingBox()
      if (!dialog) throw new Error('Preferences dialog has no layout box')
      expect(dialog.x).toBeGreaterThanOrEqual(0)
      expect(dialog.y).toBeGreaterThanOrEqual(0)
      expect(dialog.x + dialog.width).toBeLessThanOrEqual(width + 1)
      expect(dialog.y + dialog.height).toBeLessThanOrEqual(height + 1)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true)
    })
  }
}

test('dark theme uses the shared semantic colors at the minimum desktop size', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'mtimer-e2e-preferences',
      JSON.stringify({
        theme: 'dark',
        language: 'en',
        quick_pane_shortcut: null,
      })
    )
  )
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await openPreferences(page)
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const app = document.querySelector('#root > div')
    const probe = document.createElement('span')
    probe.style.backgroundColor = 'var(--background)'
    document.body.append(probe)
    const resolved = getComputedStyle(probe).backgroundColor
    probe.remove()
    return {
      token: root.getPropertyValue('--background').trim(),
      actual: app ? getComputedStyle(app).backgroundColor : '',
      resolved,
    }
  })
  expect(colors.token).toMatch(/^oklch\(/)
  expect(colors.actual).toBe(colors.resolved)
})

test('sidebar toggles keep the main content mounted and usable', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await expect(page.getByRole('separator')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Hide Left Sidebar', exact: true })
    .click()
  await expect(page.getByRole('separator')).toHaveCount(1)
  await page
    .getByRole('button', { name: 'Hide Right Sidebar', exact: true })
    .click()
  await expect(page.getByRole('separator')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await page
    .getByRole('button', { name: 'Show Left Sidebar', exact: true })
    .click()
  await expect(page.getByRole('separator')).toHaveCount(1)
})
