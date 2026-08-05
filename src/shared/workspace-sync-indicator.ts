import type { GitUpstreamStatus } from './git-status-types'

export type WorkspaceSyncIndicator = {
  ahead: number
  behind: number
  /** Screen-reader and tooltip text, e.g. "2 ahead, 14 behind origin/main". */
  label: string
}

function describeCount(count: number, direction: 'ahead' | 'behind'): string {
  return `${count} ${direction}`
}

/**
 * What the sidebar should show for a workspace's remote position, or `null` when
 * there is nothing worth the pixels: no data yet, no upstream to compare against,
 * or a branch that is exactly in sync.
 *
 * `hasUpstream === false` reports placeholder zeros rather than a real 0/0, so it
 * must be rejected before treating the counts as meaningful.
 */
export function getWorkspaceSyncIndicator(
  status: GitUpstreamStatus | undefined | null
): WorkspaceSyncIndicator | null {
  if (!status?.hasUpstream) {
    return null
  }
  const ahead = Math.max(0, status.ahead)
  const behind = Math.max(0, status.behind)
  if (ahead === 0 && behind === 0) {
    return null
  }
  const parts: string[] = []
  if (ahead > 0) {
    parts.push(describeCount(ahead, 'ahead'))
  }
  if (behind > 0) {
    parts.push(describeCount(behind, 'behind'))
  }
  const upstream = status.upstreamName?.trim()
  const label = upstream ? `${parts.join(', ')} ${upstream}` : parts.join(', ')
  return { ahead, behind, label }
}
