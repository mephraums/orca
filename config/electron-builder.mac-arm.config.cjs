// Why: local fork builds only ever get installed on this Apple Silicon machine,
// so the x64 slice and the auto-update zips are pure build time — auto-update is
// disabled in this fork (see FORK_AUTO_UPDATE_DISABLED in src/main/updater.ts),
// and nothing consumes the mac zips. Kept as a separate config so the shared one
// stays byte-identical to upstream and never conflicts on merge; `build:mac:all`
// still produces every artifact when a real cross-arch build is needed.
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const baseConfig = require('./electron-builder.config.cjs')

module.exports = {
  ...baseConfig,
  // Mirror the fresh dmg to Google Drive so other Macs always have the latest build.
  // A failed copy warns but never fails the build — the artifact still exists in dist/.
  afterAllArtifactBuild: async (buildResult) => {
    const dmgs = buildResult.artifactPaths.filter((p) => p.endsWith('.dmg'))
    if (dmgs.length) {
      try {
        const scriptUrl = pathToFileURL(path.join(__dirname, 'scripts', 'copy-mac-build-to-drive.mjs')).href
        const { copyMacBuildsToDrive } = await import(scriptUrl)
        copyMacBuildsToDrive(dmgs)
      } catch (error) {
        console.warn('⚠️  Copy to Google Drive failed — build NOT copied to Drive:', error)
      }
    }
    return []
  },
  mac: {
    ...baseConfig.mac,
    target: [
      {
        target: 'dmg',
        arch: ['arm64']
      }
    ]
  }
}
