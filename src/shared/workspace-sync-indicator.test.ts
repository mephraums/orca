import { describe, expect, it } from 'vitest'
import type { GitUpstreamStatus } from './git-status-types'
import { getWorkspaceSyncIndicator } from './workspace-sync-indicator'

function status(overrides: Partial<GitUpstreamStatus> = {}): GitUpstreamStatus {
  return { hasUpstream: true, ahead: 0, behind: 0, upstreamName: 'origin/master', ...overrides }
}

describe('getWorkspaceSyncIndicator', () => {
  it('returns null when no status has loaded', () => {
    expect(getWorkspaceSyncIndicator(undefined)).toBeNull()
    expect(getWorkspaceSyncIndicator(null)).toBeNull()
  })

  it('returns null without an upstream, where 0/0 is a placeholder not a signal', () => {
    expect(
      getWorkspaceSyncIndicator(status({ hasUpstream: false, ahead: 3, behind: 4 }))
    ).toBeNull()
  })

  it('returns null when exactly in sync', () => {
    expect(getWorkspaceSyncIndicator(status())).toBeNull()
  })

  it('reports both directions', () => {
    expect(getWorkspaceSyncIndicator(status({ ahead: 2, behind: 14 }))).toEqual({
      ahead: 2,
      behind: 14,
      label: '2 ahead, 14 behind origin/master'
    })
  })

  it('omits the zero side from the label', () => {
    expect(getWorkspaceSyncIndicator(status({ behind: 14 }))?.label).toBe('14 behind origin/master')
    expect(getWorkspaceSyncIndicator(status({ ahead: 2 }))?.label).toBe('2 ahead origin/master')
  })

  it('drops the upstream name when unknown', () => {
    const result = getWorkspaceSyncIndicator(
      status({ ahead: 1, upstreamName: undefined as unknown as string })
    )
    expect(result?.label).toBe('1 ahead')
  })

  it('clamps negative counts', () => {
    expect(getWorkspaceSyncIndicator(status({ ahead: -1, behind: 2 }))?.ahead).toBe(0)
  })
})
