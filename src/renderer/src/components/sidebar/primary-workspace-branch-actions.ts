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
  /**
   * Ancestry can't prove the branch is merged, but its patch is already in the
   * default branch — `git branch -d` will refuse, so the delete must force.
   */
  deleteNeedsForce: boolean
}

const HIDDEN: PrimaryWorkspaceBranchActions = {
  visible: false,
  returnToDefault: { enabled: false, disabledReason: null },
  deleteBranchAndReturn: { enabled: false, disabledReason: null },
  deleteNeedsForce: false
}

const LOAD_FAILED_REASON = 'Could not read this branch. Check that the repository is reachable.'

function pluralizeCommits(count: number): string {
  return count === 1 ? '1 unmerged commit' : `${count} unmerged commits`
}

function bothDisabled(reason: string): PrimaryWorkspaceBranchActions {
  return {
    visible: true,
    returnToDefault: { enabled: false, disabledReason: reason },
    deleteBranchAndReturn: { enabled: false, disabledReason: reason },
    deleteNeedsForce: false
  }
}

/**
 * Decide what the primary checkout's branch actions offer. Deleting is allowed
 * once the default branch holds the work — by ancestry, or by the squash/rebase
 * equivalent — so the common "agent opened a PR and it landed" cleanup is one
 * click while unmerged work can never be dropped from a menu.
 */
export function resolvePrimaryWorkspaceBranchActions(
  state: BranchReturnState | null,
  options: { loadFailed?: boolean } = {}
): PrimaryWorkspaceBranchActions {
  // Why: a failed read is shown as disabled-with-a-reason rather than hidden, so
  // a broken repo can't look identical to "nothing to clean up".
  if (options.loadFailed) {
    return bothDisabled(LOAD_FAILED_REASON)
  }
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
    return bothDisabled('Commit or stash your changes first.')
  }

  const squashMergedOnly = !state.isMergedIntoDefault && state.isSquashMergedIntoDefault
  const safeToDelete = state.isMergedIntoDefault || squashMergedOnly
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
        },
    deleteNeedsForce: squashMergedOnly
  }
}

/** Menu label, so the destructive action always names what it deletes. */
export function describeDeleteBranchAndReturn(state: BranchReturnState | null): string {
  const branch = state?.currentBranch
  return branch
    ? `Delete '${branch}' & return to ${state?.defaultBranch}`
    : 'Delete branch & return'
}

/**
 * Shown on the delete action when only the squash/rebase check cleared it, so a
 * force delete is never silent.
 */
export function describeForceDeleteNote(state: BranchReturnState | null): string {
  const branch = state?.currentBranch ? `'${state.currentBranch}'` : 'This branch'
  const defaultBranch = state?.defaultBranch ?? 'the default branch'
  return `${branch} landed in ${defaultBranch} as a squash or rebase commit, so git still calls it unmerged — deleting uses 'git branch -D'.`
}

export function describeReturnToDefault(state: BranchReturnState | null): string {
  const defaultBranch = state?.defaultBranch
  return defaultBranch ? `Return to ${defaultBranch}` : 'Return to default branch'
}
