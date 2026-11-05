#!/usr/bin/env node
/**
 * Client-plugin maintenance for this home repo.
 *
 * `pnpm setup`  — install the build toolchain and both profiles, build the six
 *                 client plugins, then verify the result. Run this after every
 *                 `git pull`: the profile `node_modules` links are gitignored, so
 *                 a pull that renames or adds a package leaves the profile
 *                 resolving nothing until the links are recreated.
 * `pnpm build`  — rebuild the six plugins only (regenerates `lib/` from `src/`).
 * `pnpm verify` — read-only checks: built identity strings, profile links, and
 *                 that the desktop profile selects the `zar-desktop` bundle.
 *
 * No dependencies besides Node: this has to run before `node_modules` exists.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES = 'packages/client'
const PROFILES = ['desktop', 'web']
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

/** Plugin directory names under `packages/client`, in display order. */
const PLUGINS = [
  'ui-edits',
  'ui-changes',
  'ui-git',
  'ui-session-metrics',
  'ui-chat-tab-icons',
  'ui-todo-pill',
]

const ok = (message) => console.log(`  \u2713 ${message}`)
const warn = (message) => console.log(`  ! ${message}`)
const fail = (message) => {
  console.log(`  \u2717 ${message}`)
  failures.push(message)
}
const failures = []

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env })
  if (result.error !== undefined) throw result.error
  return result.status ?? 1
}

function pluginDir(name) {
  return join(ROOT, PACKAGES, name)
}

function eachPlugin(task) {
  for (const name of PLUGINS) {
    const dir = pluginDir(name)
    if (!existsSync(join(dir, 'package.json'))) {
      fail(`${PACKAGES}/${name} is missing its package.json`)
      continue
    }
    task(name, dir, readJson(join(dir, 'package.json')))
  }
}

/** Install the root toolchain and recreate each profile's `link:` symlinks. */
function install() {
  console.log('\nInstalling dependencies')
  const rootStatus = run(PNPM, ['install'], ROOT)
  if (rootStatus !== 0) throw new Error(`pnpm install failed in ${ROOT}`)
  ok('root toolchain (tsdown, typescript, vitest)')
  for (const profile of PROFILES) {
    const dir = join(ROOT, 'profiles', profile)
    if (!existsSync(join(dir, 'package.json'))) continue
    const status = run(PNPM, ['install'], dir)
    if (status !== 0) throw new Error(`pnpm install failed in ${dir}`)
    ok(`profiles/${profile}: links recreated`)
  }
}

/** Rebuild every plugin against the shared `clientBundle` preset. */
function build() {
  console.log('\nBuilding client plugins')
  const tsdown = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsdown.cmd' : 'tsdown')
  if (!existsSync(tsdown)) throw new Error(`tsdown is not installed at ${tsdown}; run "pnpm setup" first`)
  eachPlugin((name, dir) => {
    if (run(tsdown, [], dir) !== 0) {
      fail(`${PACKAGES}/${name}: build failed`)
      return
    }
    ok(`${PACKAGES}/${name}/lib/client.js`)
  })
}

/** Read-only checks that catch what a pull can quietly break. */
function verify() {
  console.log('\nVerifying built artifacts')
  eachPlugin((name, dir, pkg) => {
    const bundle = join(dir, 'lib', 'client.js')
    if (!existsSync(bundle)) return fail(`${PACKAGES}/${name}/lib/client.js is missing; run "pnpm build"`)
    const code = readFileSync(bundle, 'utf8')
    if (!code.startsWith('window.__ModuleLoader__.load({')) {
      return fail(`${PACKAGES}/${name}/lib/client.js is not a clientBundle artifact; run "pnpm build"`)
    }
    const id = /^\s*id:\s*"([^"]+)"/m.exec(code)?.[1]
    if (id !== pkg.name) {
      return fail(
        `${PACKAGES}/${name}/lib/client.js declares id ${JSON.stringify(id)} but package.json names ${JSON.stringify(pkg.name)}; run "pnpm build"`,
      )
    }
    ok(`${pkg.name} (id matches the package name)`)
  })

  console.log('\nVerifying profile links')
  for (const profile of PROFILES) {
    const dir = join(ROOT, 'profiles', profile)
    const manifest = join(dir, 'package.json')
    if (!existsSync(manifest)) continue
    const pkg = readJson(manifest)
    const links = Object.keys(pkg.dependencies ?? {}).filter((name) => name.startsWith('@zar-desktop/'))
    let broken = 0
    for (const name of links) {
      const linked = join(dir, 'node_modules', ...name.split('/'), 'package.json')
      if (!existsSync(linked)) {
        broken++
        fail(`profiles/${profile}: ${name} is not linked; run "pnpm setup"`)
        continue
      }
      const linkedName = readJson(linked).name
      if (linkedName !== name) {
        broken++
        fail(`profiles/${profile}: ${name} resolves to ${JSON.stringify(linkedName)}; run "pnpm setup"`)
        continue
      }
      // A stale link can still point at a directory that no longer exists.
      try {
        realpathSync(dirname(linked))
      } catch {
        broken++
        fail(`profiles/${profile}: ${name} links to a missing directory; run "pnpm setup"`)
      }
    }
    if (links.length > 0 && broken === 0) ok(`profiles/${profile}: ${links.length} @zar-desktop link(s) resolve`)
  }

  console.log('\nVerifying bundle selection')
  const desktop = join(ROOT, 'profiles', 'desktop', 'package.json')
  if (existsSync(desktop)) {
    const bundles = readJson(desktop).dsh?.profile?.bundles ?? []
    if (bundles.includes('zar-desktop')) ok('desktop profile selects the zar-desktop bundle')
    else fail('desktop profile does not list "zar-desktop" in dsh.profile.bundles')
  }
}

function report() {
  if (failures.length === 0) {
    console.log('\nOK — restart the desktop app (or reload the GUI tab) so the client boot graph is re-read.')
    return 0
  }
  console.log(`\n${failures.length} problem(s) found.`)
  return 1
}

const command = process.argv[2] ?? 'setup'
try {
  if (command === 'setup') {
    install()
    build()
    verify()
  } else if (command === 'build') {
    build()
  } else if (command === 'verify') {
    verify()
  } else {
    console.error(`usage: node scripts/client-plugins.mjs [setup|build|verify]`)
    process.exit(2)
  }
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
process.exit(report())
