import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRuntimeGit, getRuntimeGitBranchReturnState } from '@/runtime/runtime-git-client'
import { useAppStore } from '@/store'
import type { BranchReturnState } from '../../../../shared/branch-return-state'

/**
 * Load the primary checkout's branch state while its context menu is open.
 * Lazy on purpose: this is several git calls, and only the primary row's menu
 * needs it — polling every sidebar row would be far more expensive than useful.
 */
export function usePrimaryWorkspaceBranchState(args: {
  enabled: boolean
  worktreeId: string
  worktreePath: string
  connectionId?: string | null
  /**
   * Fetch once and re-read when the branch still looks unmerged. A PR that just
   * landed leaves the local default ref behind, so the first read reports work
   * that is already on the remote default branch.
   */
  revalidateUnmergedWithFetch?: boolean
}): { state: BranchReturnState | null; loadFailed: boolean; reload: () => void } {
  const { enabled, worktreeId, worktreePath, connectionId, revalidateUnmergedWithFetch } = args
  const settings = useAppStore((s) => s.settings)
  const [state, setState] = useState<BranchReturnState | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  // Why: one fetch per branch, not per menu open — the refresh exists to correct
  // a stale default ref, and repeating it on every render would hammer the remote.
  const revalidatedBranchRef = useRef<string | null>(null)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false
    const context = {
      settings,
      worktreeId,
      worktreePath,
      ...(connectionId ? { connectionId } : {})
    }
    const load = async (): Promise<void> => {
      let next: BranchReturnState
      try {
        next = await getRuntimeGitBranchReturnState(context)
      } catch {
        // Why: report the failure instead of blanking — callers show a disabled
        // action with the reason so a broken read can't read as "nothing to do".
        if (!cancelled) {
          setState(null)
          setLoadFailed(true)
        }
        return
      }
      if (cancelled) {
        return
      }
      setState(next)
      setLoadFailed(false)
      const revalidationKey = `${worktreeId}::${next.currentBranch ?? ''}`
      if (
        !revalidateUnmergedWithFetch ||
        !next.currentBranch ||
        next.isMergedIntoDefault ||
        revalidatedBranchRef.current === revalidationKey
      ) {
        return
      }
      revalidatedBranchRef.current = revalidationKey
      try {
        await fetchRuntimeGit(context)
        const refreshed = await getRuntimeGitBranchReturnState(context)
        if (!cancelled) {
          setState(refreshed)
        }
      } catch {
        // Why: keep the pre-fetch reading; a failed refresh must not blank the UI.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [
    enabled,
    settings,
    worktreeId,
    worktreePath,
    connectionId,
    reloadToken,
    revalidateUnmergedWithFetch
  ])

  return { state, loadFailed, reload }
}
