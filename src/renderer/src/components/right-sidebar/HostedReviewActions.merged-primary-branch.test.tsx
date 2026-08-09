// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PRInfo, Repo, Worktree } from '../../../../shared/types'
import type { BranchReturnState } from '../../../../shared/branch-return-state'
import type { HostedReviewActionInfo } from './use-hosted-review-actions'

const getRuntimeGitBranchReturnState = vi.fn()
const fetchRuntimeGit = vi.fn().mockResolvedValue(undefined)
const checkoutRuntimeGitBranch = vi.fn().mockResolvedValue(undefined)
const deleteRuntimeGitBranch = vi.fn().mockResolvedValue(undefined)
const runWorktreeDelete = vi.fn()

vi.mock('@/runtime/runtime-git-client', () => ({
  getRuntimeGitBranchReturnState: (...args: unknown[]) => getRuntimeGitBranchReturnState(...args),
  fetchRuntimeGit: (...args: unknown[]) => fetchRuntimeGit(...args),
  checkoutRuntimeGitBranch: (...args: unknown[]) => checkoutRuntimeGitBranch(...args),
  deleteRuntimeGitBranch: (...args: unknown[]) => deleteRuntimeGitBranch(...args)
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      deleteStateByWorktreeId: {},
      settings: { activeRuntimeEnvironmentId: null }
    })
}))

vi.mock('../sidebar/delete-worktree-flow', () => ({
  runWorktreeDelete: (...args: unknown[]) => runWorktreeDelete(...args)
}))

vi.mock('./use-hosted-review-actions', () => ({
  useHostedReviewActions: () => ({
    merging: false,
    stateUpdating: null,
    actionError: null,
    handleMerge: vi.fn(),
    handleAutoMerge: vi.fn(),
    handleCloseReview: vi.fn(),
    handleReopenReview: vi.fn()
  })
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}))

const { default: HostedReviewActions } = await import('./HostedReviewActions')

const repo = {
  id: 'repo-1',
  path: '/repo',
  connectionId: null
} as unknown as Repo

function worktree(overrides: Partial<Worktree> = {}): Worktree {
  return {
    id: 'repo-1::/repo',
    repoId: 'repo-1',
    path: '/repo',
    branch: 'feat/x',
    isMainWorktree: true,
    ...overrides
  } as unknown as Worktree
}

function branchState(overrides: Partial<BranchReturnState> = {}): BranchReturnState {
  return {
    currentBranch: 'feat/x',
    defaultBranch: 'master',
    defaultCompareRef: 'origin/master',
    isDirty: false,
    isMergedIntoDefault: true,
    isSquashMergedIntoDefault: false,
    unmergedCommits: 0,
    ...overrides
  }
}

const mergedReview = {
  provider: 'github',
  number: 360,
  state: 'merged',
  status: 'success',
  mergeable: 'MERGEABLE'
} as unknown as HostedReviewActionInfo

function renderMergedPanel(args: { worktree?: Worktree; githubPR?: PRInfo | null } = {}): void {
  render(
    <HostedReviewActions
      review={mergedReview}
      githubPR={args.githubPR ?? ({ headRefName: 'feat/x' } as unknown as PRInfo)}
      repo={repo}
      worktree={args.worktree ?? worktree()}
      onRefreshReview={async () => {}}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('merged review actions on the primary workspace', () => {
  it('replaces Delete Workspace with branch cleanup', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState())
    renderMergedPanel()
    expect(
      await screen.findByRole('button', {
        name: /Delete 'feat\/x' & return to master/
      })
    ).toBeTruthy()
    expect(screen.queryByText('Delete Workspace')).toBeNull()
  })

  it('fetches once and re-reads when the branch still looks unmerged', async () => {
    getRuntimeGitBranchReturnState
      .mockResolvedValueOnce(branchState({ isMergedIntoDefault: false, unmergedCommits: 2 }))
      .mockResolvedValue(branchState())
    renderMergedPanel()
    const deleteButton = await screen.findByRole('button', {
      name: /Delete 'feat\/x' & return to master/
    })
    expect(fetchRuntimeGit).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect((deleteButton as HTMLButtonElement).disabled).toBe(false))
  })

  it('switches back, then deletes without forcing when ancestry proves the merge', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState())
    renderMergedPanel()
    fireEvent.click(
      await screen.findByRole('button', { name: /Delete 'feat\/x' & return to master/ })
    )
    await vi.waitFor(() => expect(deleteRuntimeGitBranch).toHaveBeenCalled())
    expect(checkoutRuntimeGitBranch).toHaveBeenCalledWith(expect.anything(), 'master')
    expect(deleteRuntimeGitBranch).toHaveBeenCalledWith(expect.anything(), 'feat/x', {
      force: false
    })
  })

  it('forces the delete for a squash-merged branch git still calls unmerged', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(
      branchState({
        isMergedIntoDefault: false,
        isSquashMergedIntoDefault: true,
        unmergedCommits: 2
      })
    )
    renderMergedPanel()
    fireEvent.click(
      await screen.findByRole('button', { name: /Delete 'feat\/x' & return to master/ })
    )
    await vi.waitFor(() => expect(deleteRuntimeGitBranch).toHaveBeenCalled())
    expect(deleteRuntimeGitBranch).toHaveBeenCalledWith(expect.anything(), 'feat/x', {
      force: true
    })
  })

  it('keeps Delete Workspace for non-primary workspaces', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState())
    renderMergedPanel({ worktree: worktree({ isMainWorktree: false }) })
    expect(await screen.findByText('Delete Workspace')).toBeTruthy()
    expect(getRuntimeGitBranchReturnState).not.toHaveBeenCalled()
  })

  it('stays out of the way when the checkout moved off the PR branch', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState({ currentBranch: 'other' }))
    renderMergedPanel({
      githubPR: { headRefName: 'feat/x' } as unknown as PRInfo
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText("Delete 'other' & return to master")).toBeNull()
    expect(screen.queryByText('Delete Workspace')).toBeNull()
  })
})
