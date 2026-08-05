import { useCallback, useEffect, useState } from 'react'
import { getRuntimeGitBranchReturnState } from '@/runtime/runtime-git-client'
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
}): { state: BranchReturnState | null; reload: () => void } {
  const { enabled, worktreeId, worktreePath, connectionId } = args
  const settings = useAppStore((s) => s.settings)
  const [state, setState] = useState<BranchReturnState | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    if (!enabled) {
      return
    }
    let cancelled = false
    void getRuntimeGitBranchReturnState({
      settings,
      worktreeId,
      worktreePath,
      ...(connectionId ? { connectionId } : {})
    })
      .then((next) => {
        if (!cancelled) {
          setState(next)
        }
      })
      .catch(() => {
        // Why: the menu simply hides the branch group when state is unknown.
        if (!cancelled) {
          setState(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled, settings, worktreeId, worktreePath, connectionId, reloadToken])

  return { state, reload }
}
