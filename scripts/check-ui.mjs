import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import ts from 'typescript'

export const requiredTokens = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'sidebar',
  'sidebar-foreground',
]

export function inspectTheme(css) {
  const errors = []
  const tokens = selector =>
    new Map(
      [
        ...(
          (css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`)) ?? [])[1] ?? ''
        ).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g),
      ].map(m => [m[1], m[2].trim()])
    )
  const light = tokens(':root')
  const dark = tokens('\\.dark')
  for (const name of requiredTokens) {
    for (const [mode, values] of [
      ['light', light],
      ['dark', dark],
    ]) {
      if (!values.get(name)?.startsWith('oklch('))
        errors.push(`${mode}: --${name} must define an OKLCH semantic color`)
    }
    if (!css.includes(`--color-${name}: var(--${name})`))
      errors.push(`Tailwind mapping missing: ${name}`)
  }
  for (const name of light.keys()) {
    // 几何 token 可以沿用浅色定义；颜色必须在两种主题中成对声明。
    if (!name.startsWith('app-') && name !== 'radius' && !dark.has(name))
      errors.push(`dark token missing: ${name}`)
  }
  if (!light.has('radius')) errors.push('Shared --radius token missing')
  return errors
}

export function inspectComponent(source, filename) {
  // 原生交通灯的颜色是 OS 约定，不应被应用主题替代；例外仅限这一文件。
  if (filename === 'src/components/titlebar/MacOSWindowControls.tsx') return []
  const overlays = new Set(
    ['dialog', 'sheet', 'alert-dialog'].map(
      name => `src/components/ui/${name}.tsx`
    )
  )
  const errors = []
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      for (const token of node.text.split(/\s+/)) {
        const raw =
          /(?:^|:)(?:bg|text|border|ring|fill|stroke)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/[^\s]+)?$/.test(
            token
          ) ||
          /(?:^|:)(?:bg|text|border|ring|fill|stroke)-\[(?:#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\()/i.test(
            token
          )
        const overlay = overlays.has(filename) && token === 'bg-black/50'
        const destructive =
          [
            'src/components/ui/button.tsx',
            'src/components/ui/badge.tsx',
          ].includes(filename) && token === 'text-white'
        if (raw && !overlay && !destructive)
          errors.push(`${filename}: use semantic color instead of ${token}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return errors
}

export function checkUi(root) {
  const errors = inspectTheme(
    fs.readFileSync(path.join(root, 'src/theme-variables.css'), 'utf8')
  )
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.'))
        errors.push(
          ...inspectComponent(
            fs.readFileSync(full, 'utf8'),
            path.relative(root, full).split(path.sep).join('/')
          )
        )
    }
  }
  walk(path.join(root, 'src/components'))
  for (const file of ['App.css', 'quick-pane.css']) {
    if (
      !fs
        .readFileSync(path.join(root, 'src', file), 'utf8')
        .includes("@import './theme-variables.css'")
    )
      errors.push(`${file} must reuse shared theme tokens`)
  }
  return errors
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const errors = checkUi(fileURLToPath(new URL('..', import.meta.url)))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else
    console.log(
      'UI contract passed: paired semantic colors, shared windows, explicit native exceptions'
    )
}
