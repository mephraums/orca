import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { checkoutRuntimeGitBranch, deleteRuntimeGitBranch } from '@/runtime/runtime-git-client'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { usePrimaryWorkspaceBranchState } from './use-primary-workspace-branch-state'
import {
  describeDeleteBranchAndReturn,
  describeForceDeleteNote,
  describeReturnToDefault,
  resolvePrimaryWorkspaceBranchActions,
  type PrimaryWorkspaceBranchActions
} from './primary-workspace-branch-actions'
import type { BranchReturnState } from '../../../../shared/branch-return-state'

export type PrimaryWorkspaceBranchCleanup = {
  state: BranchReturnState | null
  actions: PrimaryWorkspaceBranchActions
  returnLabel: string
  deleteLabel: string
  /** Set only when deleting has to force; surfaced next to the action. */
  forceNote: string | null
  /** A checkout or delete is in flight; both entry points must stay disabled. */
  running: boolean
  returnToDefault: () => void
  deleteBranchAndReturn: () => void
}

/**
 * Branch cleanup for the primary checkout, shared by the sidebar context menu
 * and the merged-review panel so both offer the same two actions with the same
 * safety gates instead of each growing its own copy.
 */
export function usePrimaryWorkspaceBranchCleanup(args: {
  enabled: boolean
  worktreeId: string
  worktreePath: string
  connectionId?: string | null
  revalidateUnmergedWithFetch?: boolean
}): PrimaryWorkspaceBranchCleanup {
  const settings = useAppStore((s) => s.settings)
  const [running, setRunning] = useState(false)
  const { state, loadFailed, reload } = usePrimaryWorkspaceBranchState(args)
  const actions = useMemo(
    () => resolvePrimaryWorkspaceBranchActions(state, { loadFailed }),
    [state, loadFailed]
  )
  const context = useMemo(
    () => ({
      settings,
      worktreeId: args.worktreeId,
      worktreePath: args.worktreePath,
      ...(args.connectionId ? { connectionId: args.connectionId } : {})
    }),
    [settings, args.worktreeId, args.worktreePath, args.connectionId]
  )

  const returnToDefault = useCallback(() => {
    const branch = state?.defaultBranch
    if (!branch || running) {
      return
    }
    setRunning(true)
    void checkoutRuntimeGitBranch(context, branch)
      .then(() => {
        toast.success(
          translate('auto.components.sidebar.WorktreeContextMenu.switchedToBranch', 'Switched to', {
            branch
          })
        )
        reload()
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : translate(
                'auto.components.sidebar.WorktreeContextMenu.switchBranchFailed',
                'Could not switch branch',
                { branch }
              )
        )
      })
      .finally(() => setRunning(false))
  }, [context, reload, running, state?.defaultBranch])

  const deleteBranchAndReturn = useCallback(() => {
    const branch = state?.currentBranch
    const defaultBranch = state?.defaultBranch
    if (!branch || !defaultBranch || running) {
      return
    }
    setRunning(true)
    // Why: git refuses to delete the branch that is checked out, so switch first.
    void checkoutRuntimeGitBranch(context, defaultBranch)
      .then(() => deleteRuntimeGitBranch(context, branch, { force: actions.deleteNeedsForce }))
      .then(() => {
        toast.success(
          translate(
            'auto.components.sidebar.WorktreeContextMenu.deletedBranchAndSwitched',
            'Deleted branch and switched back',
            { branch, defaultBranch }
          )
        )
        reload()
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : translate(
                'auto.components.sidebar.WorktreeContextMenu.deleteBranchFailed',
                'Could not delete branch',
                { branch }
              )
        )
        reload()
      })
      .finally(() => setRunning(false))
  }, [
    actions.deleteNeedsForce,
    context,
    reload,
    running,
    state?.currentBranch,
    state?.defaultBranch
  ])

  return {
    state,
    actions,
    returnLabel: describeReturnToDefault(state),
    deleteLabel: describeDeleteBranchAndReturn(state),
    forceNote: actions.deleteNeedsForce ? describeForceDeleteNote(state) : null,
    running,
    returnToDefault,
    deleteBranchAndReturn
  }
}
