import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 两组互斥收集；逻辑测试不加载 DOM、原生接口 Mock 或组件清理。
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: {
    allowOnly: !process.env.CI,
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
          exclude: ['src/**/*.ui.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ui.ts'],
          include: ['src/**/*.ui.test.{ts,tsx}'],
          execArgv: Number(process.versions.node.split('.')[0]) >= 25
            ? ['--no-experimental-webstorage'] : [],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // 保留现有阈值，并纳入未被导入的源码，避免虚假的高覆盖率。
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/lib/bindings.ts', 'src/main.tsx', 'src/quick-pane.tsx'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 60, functions: 60, branches: 60 },
    },
  },
})
