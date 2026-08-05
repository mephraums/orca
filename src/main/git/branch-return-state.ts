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

async function readIsUpstreamGone(exec: BranchStateExec, branch: string): Promise<boolean> {
  let upstream = ''
  try {
    const { stdout } = await exec(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`])
    upstream = stdout.trim()
  } catch {
    // Why: no upstream configured at all is not the merged-PR signal.
    return false
  }
  if (!upstream) {
    return false
  }
  try {
    await exec(['rev-parse', '--verify', '--quiet', `refs/remotes/${upstream}`])
    return false
  } catch {
    // Why: upstream is configured but its remote-tracking ref is gone — the
    // branch was merged and the remote branch deleted.
    return true
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
      isUpstreamGone: false,
      unmergedCommits: 0
    }
  }

  const [unmerged, isUpstreamGone] = await Promise.all([
    countUnmergedCommits(exec, currentBranch, defaultCompareRef ?? defaultBranch),
    readIsUpstreamGone(exec, currentBranch)
  ])

  return {
    currentBranch,
    defaultBranch,
    defaultCompareRef,
    isDirty,
    // Why: an unreadable count must not read as "safe to delete".
    isMergedIntoDefault: unmerged === 0,
    isUpstreamGone,
    unmergedCommits: unmerged ?? 0
  }
}
