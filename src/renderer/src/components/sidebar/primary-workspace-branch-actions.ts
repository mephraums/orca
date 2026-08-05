import type { BranchReturnState } from '../../../../shared/branch-return-state'

export type PrimaryWorkspaceBranchAction = {
  enabled: boolean
  /** Why the action is unavailable; shown as the menu item tooltip. */
  disabledReason: string | null
}

export type PrimaryWorkspaceBranchActions = {
  /** False when there is nothing to return from — hide the whole group. */
  visible: boolean
  returnToDefault: PrimaryWorkspaceBranchAction
  deleteBranchAndReturn: PrimaryWorkspaceBranchAction
}

const HIDDEN: PrimaryWorkspaceBranchActions = {
  visible: false,
  returnToDefault: { enabled: false, disabledReason: null },
  deleteBranchAndReturn: { enabled: false, disabledReason: null }
}

function pluralizeCommits(count: number): string {
  return count === 1 ? '1 unmerged commit' : `${count} unmerged commits`
}

/**
 * Decide what the primary checkout's branch actions offer. Deleting is allowed
 * only when the branch is fully merged into the default branch, so the common
 * "agent opened a PR and it landed" cleanup is one click while unmerged work
 * can never be dropped from a menu.
 */
export function resolvePrimaryWorkspaceBranchActions(
  state: BranchReturnState | null
): PrimaryWorkspaceBranchActions {
  if (!state) {
    return HIDDEN
  }
  const { currentBranch, defaultBranch } = state
  // Why: nothing to offer on a detached HEAD, an unknown default, or when the
  // primary is already sitting on the default branch.
  if (!currentBranch || !defaultBranch || currentBranch === defaultBranch) {
    return HIDDEN
  }

  if (state.isDirty) {
    const dirtyReason = 'Commit or stash your changes first.'
    return {
      visible: true,
      returnToDefault: { enabled: false, disabledReason: dirtyReason },
      deleteBranchAndReturn: { enabled: false, disabledReason: dirtyReason }
    }
  }

  const safeToDelete = state.isMergedIntoDefault
  return {
    visible: true,
    returnToDefault: { enabled: true, disabledReason: null },
    deleteBranchAndReturn: safeToDelete
      ? { enabled: true, disabledReason: null }
      : {
          enabled: false,
          disabledReason: `'${currentBranch}' has ${pluralizeCommits(
            state.unmergedCommits
          )} not in ${defaultBranch}.`
        }
  }
}

/** Menu label, so the destructive action always names what it deletes. */
export function describeDeleteBranchAndReturn(state: BranchReturnState | null): string {
  const branch = state?.currentBranch
  return branch
    ? `Delete '${branch}' & return to ${state?.defaultBranch}`
    : 'Delete branch & return'
}

export function describeReturnToDefault(state: BranchReturnState | null): string {
  const defaultBranch = state?.defaultBranch
  return defaultBranch ? `Return to ${defaultBranch}` : 'Return to default branch'
}
