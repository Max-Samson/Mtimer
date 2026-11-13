import { resolve } from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import appConfig from './vite.config.ts'

// 测试入口独立构建，Mock 和测试控制接口不会进入正式安装包。
export default defineConfig(async env => mergeConfig(await appConfig(env), {
  build: {
    outDir: 'test-dist',
    rolldownOptions: { input: resolve(import.meta.dirname, 'tests/e2e/index.html') },
  },
}))
