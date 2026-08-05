// Why: local fork builds only ever get installed on this Apple Silicon machine,
// so the x64 slice and the auto-update zips are pure build time — auto-update is
// disabled in this fork (see FORK_AUTO_UPDATE_DISABLED in src/main/updater.ts),
// and nothing consumes the mac zips. Kept as a separate config so the shared one
// stays byte-identical to upstream and never conflicts on merge; `build:mac:all`
// still produces every artifact when a real cross-arch build is needed.
const baseConfig = require('./electron-builder.config.cjs')

module.exports = {
  ...baseConfig,
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
