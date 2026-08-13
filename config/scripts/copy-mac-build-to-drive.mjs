// Fork-only: mirror freshly built mac dmg(s) into Google Drive "My Drive/Orca"
// so the newest build is always available to the other Macs. Prunes older
// dmgs so the folder only ever holds the latest (INSTALL.txt is untouched).
// Standalone: node config/scripts/copy-mac-build-to-drive.mjs [dmg ...]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DMG_PATTERN = /^orca-fork-macos-.*\.dmg$/

function findDriveOrcaDir() {
  const cloudStorage = path.join(os.homedir(), 'Library', 'CloudStorage')
  if (!fs.existsSync(cloudStorage)) {
    return null
  }
  for (const entry of fs.readdirSync(cloudStorage)) {
    if (!entry.startsWith('GoogleDrive-')) {
      continue
    }
    const orcaDir = path.join(cloudStorage, entry, 'My Drive', 'Orca')
    if (fs.existsSync(orcaDir)) {
      return orcaDir
    }
  }
  return null
}

// Stamp with the dmg's mtime, not "now" — standalone runs may copy an older build.
function stampedName(dmgPath) {
  const date = fs.statSync(dmgPath).mtime.toISOString().slice(0, 10)
  return path.basename(dmgPath).replace(/\.dmg$/, `-${date}.dmg`)
}

export function copyMacBuildsToDrive(dmgPaths) {
  if (process.platform !== 'darwin') {
    return []
  }
  const driveDir = findDriveOrcaDir()
  if (!driveDir) {
    console.warn('⚠️  Google Drive "My Drive/Orca" not found — build NOT copied to Drive.')
    return []
  }
  const copied = []
  for (const dmgPath of dmgPaths) {
    const target = path.join(driveDir, stampedName(dmgPath))
    // Copy under a temp name then rename so Drive never syncs a half-written dmg.
    const tmp = path.join(driveDir, `.tmp-${path.basename(target)}`)
    fs.copyFileSync(dmgPath, tmp)
    fs.renameSync(tmp, target)
    copied.push(target)
    console.log(`Copied to Drive: ${target}`)
  }
  const keep = new Set(copied.map((p) => path.basename(p)))
  for (const entry of fs.readdirSync(driveDir)) {
    if (DMG_PATTERN.test(entry) && !keep.has(entry)) {
      fs.unlinkSync(path.join(driveDir, entry))
      console.log(`Pruned old build from Drive: ${entry}`)
    }
  }
  return copied
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const distDir = path.resolve(import.meta.dirname, '..', '..', 'dist')
  const dmgs = args.length
    ? args.map((p) => path.resolve(p))
    : fs.existsSync(distDir)
      ? fs
          .readdirSync(distDir)
          .filter((f) => f.endsWith('.dmg'))
          .map((f) => path.join(distDir, f))
      : []
  if (!dmgs.length) {
    console.error('No dmg found in dist/ and none given on the command line.')
    process.exit(1)
  }
  copyMacBuildsToDrive(dmgs)
}
