import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

// 仅校验公开的发布配置，不读取、打印或创建任何签名私钥/凭据。
export function releaseProblems(
  {
    packageVersion,
    cargoVersion,
    tauriVersion,
    updater,
    productName,
    identifier,
  },
  tag
) {
  const errors = []
  if (
    ![packageVersion, cargoVersion, tauriVersion].every(
      value => value === packageVersion
    )
  )
    errors.push(
      'package.json, Cargo.toml and tauri.conf.json versions must match'
    )
  if (tag && tag !== `v${packageVersion}`)
    errors.push('Release tag must match the application version')
  if (productName === 'tauri-app' || identifier === 'com.tauri-app.app')
    errors.push(
      'Replace template productName and identifier before a formal release'
    )
  if (!updater?.pubkey || updater.pubkey.includes('YOUR_'))
    errors.push('Configure the updater public key before a formal release')
  if (
    !updater?.endpoints?.length ||
    updater.endpoints.some(
      url => !url.startsWith('https://') || url.includes('YOUR_')
    )
  )
    errors.push(
      'Configure a real HTTPS updater endpoint before a formal release'
    )
  return errors
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = new URL('..', import.meta.url)
  const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'))
  const tauri = JSON.parse(
    fs.readFileSync(new URL('src-tauri/tauri.conf.json', root), 'utf8')
  )
  const cargo = fs.readFileSync(new URL('src-tauri/Cargo.toml', root), 'utf8')
  const errors = releaseProblems(
    {
      packageVersion: pkg.version,
      cargoVersion: cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
      tauriVersion: tauri.version,
      updater: tauri.plugins.updater,
      productName: tauri.productName,
      identifier: tauri.identifier,
    },
    process.argv[2] ?? process.env.RELEASE_TAG
  )
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else
    console.log(
      'Public release configuration passed (signing/notarization still requires platform validation)'
    )
}
