// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Repo, Worktree } from '../../../../shared/types'
import type { BranchReturnState } from '../../../../shared/branch-return-state'

const getRuntimeGitBranchReturnState = vi.fn()

vi.mock('@/runtime/runtime-git-client', () => ({
  getRuntimeGitBranchReturnState: (...args: unknown[]) => getRuntimeGitBranchReturnState(...args),
  checkoutRuntimeGitBranch: vi.fn(),
  deleteRuntimeGitBranch: vi.fn()
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store', () => ({
  useAppStore: Object.assign(
    (selector: (state: unknown) => unknown) =>
      selector({
        updateWorktreeMeta: vi.fn(),
        setWorktreesPinnedAndReveal: vi.fn(),
        workspaceStatuses: [],
        openModal: vi.fn(),
        projectGroups: [],
        createProjectGroup: vi.fn(),
        moveProjectToGroup: vi.fn(),
        deleteFolderWorkspace: vi.fn(),
        setActiveWorktree: vi.fn(),
        deleteStateByWorktreeId: {},
        worktreeLineageById: {},
        workspaceLineageByChildKey: {},
        updateWorktreeLineage: vi.fn(),
        tabsByWorktree: {},
        ptyIdsByTabId: {},
        browserTabsByWorktree: {},
        settings: { activeRuntimeEnvironmentId: null }
      }),
    { getState: () => ({ activeWorktreeId: null }) }
  )
}))

const repo = {
  id: 'repo-1',
  kind: 'git',
  path: '/repo',
  connectionId: null
} as unknown as Repo

vi.mock('@/store/selectors', () => ({
  useAllWorktrees: () => [],
  useRepoById: () => repo,
  useRepoMap: () => new Map([['repo-1', repo]]),
  useWorktreeMap: () => new Map()
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('./WorktreeOpenInMenu', () => ({ WorktreeOpenInSubMenu: () => null }))
vi.mock('./ProjectGroupNameDialog', () => ({
  ProjectGroupNameDialog: () => null
}))
vi.mock('./WorktreeParentPickerPopover', () => ({
  WorktreeParentPickerPopover: () => null
}))
vi.mock('./delete-worktree-flow', () => ({
  runWorktreeDelete: vi.fn(),
  runWorktreeBatchDelete: vi.fn()
}))
vi.mock('./sleep-worktree-flow', () => ({ runSleepWorktrees: vi.fn() }))
vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: vi.fn()
}))

const { default: WorktreeContextMenu } = await import('./WorktreeContextMenu')

function mainWorktree(): Worktree {
  return {
    id: 'repo-1::/repo',
    repoId: 'repo-1',
    path: '/repo',
    branch: 'feat/x',
    isMainWorktree: true,
    isPinned: false,
    isUnread: false,
    displayName: 'repo'
  } as unknown as Worktree
}

function branchState(overrides: Partial<BranchReturnState> = {}): BranchReturnState {
  return {
    currentBranch: 'feat/x',
    defaultBranch: 'main',
    defaultCompareRef: 'origin/main',
    isDirty: false,
    isMergedIntoDefault: true,
    isSquashMergedIntoDefault: false,
    unmergedCommits: 0,
    ...overrides
  }
}

async function openMenu(): Promise<void> {
  render(
    <WorktreeContextMenu worktree={mainWorktree()}>
      <div data-testid="row">row</div>
    </WorktreeContextMenu>
  )
  fireEvent.contextMenu(screen.getByTestId('row'))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('primary workspace branch actions in the context menu', () => {
  it('renders both branch actions once state loads', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState())
    await openMenu()
    expect(await screen.findByText('Return to main')).toBeTruthy()
    expect(await screen.findByText("Delete 'feat/x' & return to main")).toBeTruthy()
  })

  it('requests state for the primary worktree', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState())
    await openMenu()
    await screen.findByText('Return to main')
    expect(getRuntimeGitBranchReturnState).toHaveBeenCalledWith(
      expect.objectContaining({
        worktreeId: 'repo-1::/repo',
        worktreePath: '/repo'
      })
    )
  })

  it('hides the group when the primary is already on the default branch', async () => {
    getRuntimeGitBranchReturnState.mockResolvedValue(branchState({ currentBranch: 'main' }))
    await openMenu()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Return to main')).toBeNull()
  })
})
