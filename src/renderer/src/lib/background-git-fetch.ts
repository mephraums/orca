import { fetchRuntimeGit, getRuntimeGitUpstreamStatus } from '@/runtime/runtime-git-client'
import { useAppStore } from '@/store'
import {
  backgroundGitFetchIntervalMs,
  resolveBackgroundGitFetchSettings,
  shouldFetchRepoNow
} from '../../../shared/background-git-fetch-schedule'
import type { Repo, Worktree } from '../../../shared/types'

/** Last attempt per repo id, successful or not, so failures back off too. */
const lastAttemptByRepoId = new Map<string, number>()
const inFlightRepoIds = new Set<string>()

export function resetBackgroundGitFetchStateForTests(): void {
  lastAttemptByRepoId.clear()
  inFlightRepoIds.clear()
}

/**
 * A disconnected SSH host throws on every git call, so skip those repos instead
 * of burning a tick and surfacing errors nobody asked for.
 */
function isRepoReachable(
  repo: Repo,
  sshConnectionStates: Map<string, { status: string }>
): boolean {
  if (!repo.connectionId) {
    return true
  }
  return sshConnectionStates.get(repo.connectionId)?.status === 'connected'
}

/**
 * Fetch once per repo, then refresh upstream status for each of its workspaces.
 * One fetch covers every worktree of a repo — they share an object store — so
 * this is per-repo, not per-workspace.
 */
async function refreshRepo(repo: Repo, worktrees: Worktree[]): Promise<void> {
  const state = useAppStore.getState()
  const settings = state.settings
  const primary = worktrees.find((worktree) => worktree.isMainWorktree) ?? worktrees[0]
  if (!primary) {
    return
  }
  const context = {
    settings,
    worktreeId: primary.id,
    worktreePath: primary.path,
    ...(repo.connectionId ? { connectionId: repo.connectionId } : {})
  }
  await fetchRuntimeGit(context)

  const setUpstreamStatus = useAppStore.getState().setUpstreamStatus
  // Why: sequential — a repo with many workspaces would otherwise open a burst of
  // concurrent git processes against the same object store on every tick.
  for (const worktree of worktrees) {
    try {
      const status = await getRuntimeGitUpstreamStatus({
        settings,
        worktreeId: worktree.id,
        worktreePath: worktree.path,
        ...(repo.connectionId ? { connectionId: repo.connectionId } : {})
      })
      setUpstreamStatus(worktree.id, status)
    } catch {
      // Why: one unreadable workspace must not abandon the rest of the repo.
    }
  }
}

/**
 * Run one scheduling tick across all repos. Safe to call more often than the
 * interval — `shouldFetchRepoNow` gates each repo independently.
 */
export async function runBackgroundGitFetchTick(options: {
  now: number
  isWindowFocused: boolean
}): Promise<void> {
  const state = useAppStore.getState()
  const settings = resolveBackgroundGitFetchSettings(state.settings?.backgroundGitFetch)
  if (!settings.enabled) {
    return
  }
  const intervalMs = backgroundGitFetchIntervalMs(settings)
  const worktreesByRepoId = new Map<string, Worktree[]>()
  for (const worktree of state.allWorktrees()) {
    const existing = worktreesByRepoId.get(worktree.repoId)
    if (existing) {
      existing.push(worktree)
    } else {
      worktreesByRepoId.set(worktree.repoId, [worktree])
    }
  }

  const due = state.repos.filter((repo) =>
    shouldFetchRepoNow({
      lastAttemptedAt: lastAttemptByRepoId.get(repo.id) ?? null,
      now: options.now,
      intervalMs,
      isWindowFocused: options.isWindowFocused,
      isInFlight: inFlightRepoIds.has(repo.id),
      enabled: settings.enabled,
      isReachable: isRepoReachable(repo, state.sshConnectionStates)
    })
  )

  await Promise.all(
    due.map(async (repo) => {
      const worktrees = worktreesByRepoId.get(repo.id) ?? []
      if (worktrees.length === 0) {
        return
      }
      inFlightRepoIds.add(repo.id)
      lastAttemptByRepoId.set(repo.id, options.now)
      try {
        await refreshRepo(repo, worktrees)
      } catch {
        // Why: a failed fetch is already backed off by the stamped attempt time.
      } finally {
        inFlightRepoIds.delete(repo.id)
      }
    })
  )
}
