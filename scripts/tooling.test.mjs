import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { testEnvironment } from './test-env.mjs'
import { checkUi, inspectComponent, inspectTheme } from './check-ui.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('deterministic test environment', () => {
  it('replaces production mode and does not inherit application settings', () => {
    const env = testEnvironment({
      PATH: '/tools',
      NODE_ENV: 'production',
      TZ: 'Asia/Shanghai',
      APP_DATA_DIR: '/real/user/data',
      CI: 'true',
      SystemRoot: 'C:\\Windows',
    })
    expect(env).toMatchObject({
      PATH: '/tools',
      NODE_ENV: 'test',
      TZ: 'UTC',
      CI: 'true',
      SystemRoot: 'C:\\Windows',
    })
    expect(env).not.toHaveProperty('APP_DATA_DIR')
  })
})

describe('UI contract', () => {
  it('checks the actual project rather than a copied fixture', () =>
    expect(checkUi(root)).toEqual([]))
  it('rejects raw palette colors and arbitrary color literals', () => {
    expect(
      inspectComponent(
        '<div className="bg-red-500 hover:text-[#ffffff]" />',
        'src/components/New.tsx'
      )
    ).toHaveLength(2)
  })
  it('accepts semantic colors and token-based dimensions', () => {
    expect(
      inspectComponent(
        '<div className="bg-background text-foreground h-[var(--app-titlebar-height)]" />',
        'src/components/New.tsx'
      )
    ).toEqual([])
  })
  it('does not grant arbitrary components the native chrome exception', () => {
    const source = '<div className="bg-[#ff544d]" />'
    expect(
      inspectComponent(
        source,
        'src/components/titlebar/MacOSWindowControls.tsx'
      )
    ).toEqual([])
    expect(inspectComponent(source, 'src/components/New.tsx')).toHaveLength(1)
  })
  it('fails when a dark color or Tailwind token mapping is removed', () => {
    const css = fs.readFileSync(
      new URL('../src/theme-variables.css', import.meta.url),
      'utf8'
    )
    expect(
      inspectTheme(css.replace('--background: oklch(0.145 0 0);', ''))
    ).toContain('dark: --background must define an OKLCH semantic color')
    expect(
      inspectTheme(css.replace('--color-primary: var(--primary);', ''))
    ).toContain('Tailwind mapping missing: primary')
  })
})

it('keeps desktop hooks non-recursive and local packages unsigned for updates', () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  )
  const config = JSON.parse(
    fs.readFileSync(
      new URL('../src-tauri/tauri.conf.json', import.meta.url),
      'utf8'
    )
  )
  const local = JSON.parse(
    fs.readFileSync(
      new URL('../src-tauri/tauri.local-build.conf.json', import.meta.url),
      'utf8'
    )
  )
  expect(config.build.beforeDevCommand).toBe('npm run dev:web')
  expect(config.build.beforeBuildCommand).toBe('npm run build:frontend')
  expect(pkg.scripts['build:frontend']).not.toContain('tauri')
  expect(pkg.scripts.build).toContain('tauri.local-build.conf.json')
  expect(local.bundle.createUpdaterArtifacts).toBe(false)
  expect(config.bundle.createUpdaterArtifacts).toBe(true)
})

describe('release validation', () => {
  const valid = {
    packageVersion: '0.1.0',
    cargoVersion: '0.1.0',
    tauriVersion: '0.1.0',
    productName: 'Mtimer',
    identifier: 'me.example.mtimer',
    updater: {
      pubkey: 'test-public-key',
      endpoints: ['https://example.test/latest.json'],
    },
  }
  it('accepts consistent public release metadata', async () => {
    const { releaseProblems } = await import('./check-release.mjs')
    expect(releaseProblems(valid, 'v0.1.0')).toEqual([])
  })
  it('rejects mismatched versions and a wrong manual tag', async () => {
    const { releaseProblems } = await import('./check-release.mjs')
    expect(
      releaseProblems({ ...valid, cargoVersion: '0.2.0' }, 'main')
    ).toHaveLength(2)
  })
  it('rejects template values without ever opening signing material', async () => {
    const { releaseProblems } = await import('./check-release.mjs')
    expect(
      releaseProblems({
        ...valid,
        productName: 'tauri-app',
        updater: {
          pubkey: 'YOUR_KEY',
          endpoints: ['http://YOUR_REPO/latest.json'],
        },
      })
    ).toHaveLength(3)
  })
})
