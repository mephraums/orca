import { launchWorkItemDirect } from '@/lib/launch-work-item-direct'
import type {
  GitHubWorkItem,
  TuiAgent,
  WorkspaceCreateTelemetrySource
} from '../../../shared/types'

export type BatchPrWorktreeResult = {
  created: number
  blocked: number
  failed: number
}

export type CreateWorktreesFromPRsArgs = {
  items: readonly GitHubWorkItem[]
  repoId: string
  agent?: TuiAgent | null
  telemetrySource?: WorkspaceCreateTelemetrySource
}

/**
 * Create one workspace per selected PR, launching the chosen agent in each.
 *
 * Reuses the single-PR "use this PR now" path (`launchWorkItemDirect`) per item so the
 * batch inherits its PR head/base resolution, hooks trust, agent startup and activation
 * rather than re-implementing them.
 */
export async function createWorktreesFromPRs({
  items,
  repoId,
  agent,
  telemetrySource
}: CreateWorktreesFromPRsArgs): Promise<BatchPrWorktreeResult> {
  let created = 0
  let blocked = 0
  let failed = 0

  // Why: sequential, not Promise.all — createWorktree's name/branch collision retry has to
  // observe the previous worktree, and concurrent agent launches fight over terminal focus.
  for (const item of items) {
    let needsModal = false
    const ok = await launchWorkItemDirect({
      item: { ...item, repoId },
      repoId,
      launchSource: 'new_workspace_composer',
      ...(telemetrySource ? { telemetrySource } : {}),
      ...(agent ? { agentOverride: agent } : {}),
      openModalFallback: () => {
        // Why: a batch can't stop to ask per-PR setup questions; flag it and keep going so
        // one repo needing input doesn't strand the remaining PRs.
        needsModal = true
      }
    })
    if (ok) {
      created += 1
    } else if (needsModal) {
      blocked += 1
    } else {
      failed += 1
    }
  }

  return { created, blocked, failed }
}

export function getBatchPrWorktreeSummary(result: BatchPrWorktreeResult): string {
  const parts = [`Created ${result.created} ${result.created === 1 ? 'worktree' : 'worktrees'}`]
  if (result.blocked > 0) {
    parts.push(`${result.blocked} needed setup input`)
  }
  if (result.failed > 0) {
    parts.push(`${result.failed} failed`)
  }
  return parts.join(' · ')
}
