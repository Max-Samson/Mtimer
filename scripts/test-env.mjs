import { spawn } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'

// 只继承工具链和 OS 必需变量，不让应用配置或终端 production 模式污染测试。
export function testEnvironment(source) {
  const allowed = [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'PATHEXT',
    'HOME',
    'USERPROFILE',
    'TMPDIR',
    'TMP',
    'TEMP',
    'CI',
    'GITHUB_ACTIONS',
    'TERM',
    'NO_COLOR',
    'FORCE_COLOR',
  ]
  const env = Object.fromEntries(
    allowed
      .filter(key => source[key] !== undefined)
      .map(key => [key, source[key]])
  )
  if (env.FORCE_COLOR !== undefined) delete env.NO_COLOR
  return { ...env, NODE_ENV: 'test', TZ: 'UTC', LANG: 'C', LC_ALL: 'C' }
}

const runners = {
  vitest: '../node_modules/vitest/vitest.mjs',
  playwright: '../node_modules/@playwright/test/cli.js',
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [runner, ...args] = process.argv.slice(2)
  if (!Object.hasOwn(runners, runner ?? '')) {
    console.error(
      'Usage: node scripts/test-env.mjs <vitest|playwright> [...args]'
    )
    process.exitCode = 2
  } else {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL(runners[runner], import.meta.url)), ...args],
      { stdio: 'inherit', env: testEnvironment(process.env) }
    )
    child.on('error', error => {
      console.error(error.message)
      process.exitCode = 1
    })
    child.on('exit', (code, signal) => {
      process.exitCode = signal ? 1 : (code ?? 1)
    })
  }
}
