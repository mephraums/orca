/**
 * What the primary checkout can do about the branch it is currently sitting on.
 * Drives the "return to default branch" actions: the primary worktree is often
 * left on a merged feature branch after an agent opens and lands a PR.
 */
export type BranchReturnState = {
  currentBranch: string | null
  /** Local branch to check out, e.g. `main` — never a remote-tracking ref. */
  defaultBranch: string | null
  /** Ref the merged check ran against, e.g. `origin/main`. Remote truth when available. */
  defaultCompareRef: string | null
  /** Uncommitted changes present; checkout would clobber or refuse. */
  isDirty: boolean
  /** Every commit on the branch is already reachable from the default branch. */
  isMergedIntoDefault: boolean
  /** Upstream was configured and has since been deleted — the merged-PR signal. */
  isUpstreamGone: boolean
  /** Commits on the branch that the default branch does not contain. */
  unmergedCommits: number
}
