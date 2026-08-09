import { resolveDefaultBaseRefViaExec } from './repo'
import type { BranchReturnState } from '../../shared/branch-return-state'

export type { BranchReturnState }

/** Minimal git runner so local and SSH hosts share one implementation. */
export type BranchStateExec = (argv: string[]) => Promise<{ stdout: string }>

async function readCurrentBranch(exec: BranchStateExec): Promise<string | null> {
  try {
    const { stdout } = await exec(['rev-parse', '--abbrev-ref', 'HEAD'])
    const branch = stdout.trim()
    // Why: detached HEAD reports literal "HEAD"; there is no branch to act on.
    return branch && branch !== 'HEAD' ? branch : null
  } catch {
    return null
  }
}

async function readIsDirty(exec: BranchStateExec): Promise<boolean> {
  try {
    const { stdout } = await exec(['status', '--porcelain'])
    return stdout.trim().length > 0
  } catch {
    // Why: fail closed — an unreadable status must not enable a destructive action.
    return true
  }
}

/** Commits on `branch` that `base` does not already contain. */
async function countUnmergedCommits(
  exec: BranchStateExec,
  branch: string,
  base: string
): Promise<number | null> {
  try {
    const { stdout } = await exec(['rev-list', '--count', `${base}..${branch}`])
    const count = Number.parseInt(stdout.trim(), 10)
    return Number.isFinite(count) ? count : null
  } catch {
    return null
  }
}

/**
 * Whether the branch's whole change already sits in `base` as one commit of a
 * different shape — what "Squash and merge" and rebase merges produce.
 *
 * Ancestry can't see those: the squash commit is a new object that never has the
 * branch in its history, so `rev-list base..branch` keeps reporting the original
 * commits forever. The check synthesises the branch's combined diff as a commit
 * on top of the merge base and asks `git cherry` whether `base` already contains
 * an identical patch. `commit-tree` writes one unreferenced object that git
 * prunes; nothing in the repo is modified.
 *
 * `git cherry` prints `- <sha>` when the patch is already upstream and `+ <sha>`
 * when it is not.
 */
async function readIsSquashMergedIntoDefault(
  exec: BranchStateExec,
  branch: string,
  base: string
): Promise<boolean> {
  try {
    const [{ stdout: mergeBase }, { stdout: tree }] = await Promise.all([
      exec(['merge-base', base, branch]),
      exec(['rev-parse', `${branch}^{tree}`])
    ])
    if (!mergeBase.trim() || !tree.trim()) {
      return false
    }
    const { stdout: squashed } = await exec([
      'commit-tree',
      tree.trim(),
      '-p',
      mergeBase.trim(),
      '-m',
      'orca squash-merge probe'
    ])
    if (!squashed.trim()) {
      return false
    }
    const { stdout: cherry } = await exec(['cherry', base, squashed.trim()])
    return cherry.trim().startsWith('-')
  } catch {
    // Why: an unreadable probe must not read as "safe to force delete".
    return false
  }
}

/**
 * `resolveDefaultBaseRefViaExec` yields a base ref like `origin/main`. Checking
 * that out would detach HEAD, so split it into the local branch to switch to and
 * the ref to measure "merged" against — the remote one is the truth after a PR
 * lands, since local main is usually behind until the next pull.
 */
async function resolveDefaultBranchRefs(
  exec: BranchStateExec
): Promise<{ defaultBranch: string | null; defaultCompareRef: string | null }> {
  const baseRef = await resolveDefaultBaseRefViaExec(exec).catch(() => null)
  if (!baseRef) {
    return { defaultBranch: null, defaultCompareRef: null }
  }
  const localName = baseRef.includes('/') ? baseRef.slice(baseRef.indexOf('/') + 1) : baseRef
  try {
    await exec(['rev-parse', '--verify', '--quiet', `refs/heads/${localName}`])
    return { defaultBranch: localName, defaultCompareRef: baseRef }
  } catch {
    // Why: no local branch yet — `git checkout <name>` still DWIMs a tracking
    // branch from the remote, so offer the local name and compare remotely.
    return { defaultBranch: localName, defaultCompareRef: baseRef }
  }
}

export async function getBranchReturnStateViaExec(
  exec: BranchStateExec
): Promise<BranchReturnState> {
  const [currentBranch, isDirty, defaultRefs] = await Promise.all([
    readCurrentBranch(exec),
    readIsDirty(exec),
    resolveDefaultBranchRefs(exec)
  ])
  const { defaultBranch, defaultCompareRef } = defaultRefs

  if (!currentBranch || !defaultBranch || currentBranch === defaultBranch) {
    return {
      currentBranch,
      defaultBranch,
      defaultCompareRef,
      isDirty,
      isMergedIntoDefault: false,
      isSquashMergedIntoDefault: false,
      unmergedCommits: 0
    }
  }

  const compareRef = defaultCompareRef ?? defaultBranch
  const unmerged = await countUnmergedCommits(exec, currentBranch, compareRef)
  // Why: the squash probe costs three more git calls, so only run it once
  // ancestry has already come up short.
  const isSquashMergedIntoDefault =
    unmerged === 0 ? false : await readIsSquashMergedIntoDefault(exec, currentBranch, compareRef)

  return {
    currentBranch,
    defaultBranch,
    defaultCompareRef,
    isDirty,
    // Why: an unreadable count must not read as "safe to delete".
    isMergedIntoDefault: unmerged === 0,
    isSquashMergedIntoDefault,
    unmergedCommits: unmerged ?? 0
  }
}
