#!/usr/bin/env node

import fs from 'fs'
import { execSync } from 'child_process'

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    })
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`)
  }
}

async function prepareRelease() {
  const version = process.argv[2]

  if (!version || !version.match(/^v?\d+\.\d+\.\d+$/)) {
    console.error('❌ Usage: node scripts/prepare-release.js v1.0.0')
    console.error('   or: npm run release:prepare -- v1.0.0')
    process.exit(1)
  }

  const cleanVersion = version.replace('v', '')
  const tagVersion = version.startsWith('v') ? version : `v${version}`

  console.log(`🚀 Preparing release ${tagVersion}...\n`)

  try {
    // Check git status
    console.log('🔍 Checking git status...')
    const gitStatus = exec('git status --porcelain', { silent: true })
    if (gitStatus.trim()) {
      console.error(
        '❌ Working directory is not clean. Please commit or stash changes first.'
      )
      console.log('Uncommitted changes:')
      console.log(gitStatus)
      process.exit(1)
    }
    console.log('✅ Working directory is clean')

    // Run all checks first
    console.log('\n🔍 Running pre-release checks...')
    exec('npm run check:all')
    console.log(
      '✅ Static and unit/component checks passed (browser E2E is separate)'
    )

    // Update package.json
    console.log('\n📝 Updating package.json...')
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const oldPkgVersion = pkg.version
    pkg.version = cleanVersion
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
    console.log(`   ${oldPkgVersion} → ${cleanVersion}`)

    // Update Cargo.toml
    console.log('📝 Updating Cargo.toml...')
    const cargoPath = 'src-tauri/Cargo.toml'
    const cargoToml = fs.readFileSync(cargoPath, 'utf8')
    const oldCargoVersion = cargoToml.match(/version = "([^"]*)"/)
    const updatedCargo = cargoToml.replace(
      /version = "[^"]*"/,
      `version = "${cleanVersion}"`
    )
    fs.writeFileSync(cargoPath, updatedCargo)
    console.log(
      `   ${oldCargoVersion ? oldCargoVersion[1] : 'unknown'} → ${cleanVersion}`
    )

    // Update tauri.conf.json
    console.log('📝 Updating tauri.conf.json...')
    const tauriConfigPath = 'src-tauri/tauri.conf.json'
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'))
    const oldTauriVersion = tauriConfig.version
    tauriConfig.version = cleanVersion
    fs.writeFileSync(
      tauriConfigPath,
      JSON.stringify(tauriConfig, null, 2) + '\n'
    )
    console.log(`   ${oldTauriVersion} → ${cleanVersion}`)

    // Run npm install to update lock files
    console.log('\n📦 Updating lock files...')
    exec('npm install', { silent: true })
    console.log('✅ Lock files updated')

    // 公开配置检查独立执行；本脚本不读取或管理签名材料。
    console.log(
      'ℹ️  Formal release also requires node scripts/check-release.mjs to pass.'
    )

    // Final check that Rust code compiles
    console.log('\n🔍 Running final compilation check...')
    exec('cargo check --manifest-path src-tauri/Cargo.toml')
    console.log('✅ Rust compilation check passed')

    console.log(`\n🎉 Successfully prepared release ${tagVersion}!`)
    console.log(
      '\n📋 Review changes and complete validation before committing:'
    )
    console.log('   npm run test:e2e')
    console.log(`   node scripts/check-release.mjs ${tagVersion}`)
    console.log('   git diff')
    console.log(
      '   git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json'
    )
    console.log(`   git commit -m "chore: release ${tagVersion}"`)
    console.log(`   git tag ${tagVersion}`)
    console.log('   git push origin HEAD')
    console.log(`   git push origin ${tagVersion}`)

    console.log('\n🚀 After pushing:')
    console.log('   • GitHub Actions will automatically build the release')
    console.log('   • A draft release will be created on GitHub')
    console.log("   • You'll need to manually publish the draft release")
    console.log('   • Verify installers on target platforms before publishing')
    console.log(
      '   • Auto-updates require a correctly configured updater and published release'
    )

    // 版本准备不自动提交、打标签、推送或发布；由维护者分别审阅并执行。
  } catch (error) {
    console.error('\n❌ Pre-release preparation failed:', error.message)
    process.exit(1)
  }
}

// Run if this is the main module
prepareRelease()
