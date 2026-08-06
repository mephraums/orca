import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GlobalSettings, Repo, Worktree, WorktreeCardProperty } from '../../../../shared/types'
import type { GitUpstreamStatus } from '../../../../shared/git-status-types'

const fetchHostedReviewForBranch = vi.fn()
const fetchIssue = vi.fn()
const fetchLinearIssue = vi.fn()
const openModal = vi.fn()
const updateWorktreeMeta = vi.fn()

let worktreeCardProperties: WorktreeCardProperty[] = []
let settings: Partial<GlobalSettings> | null = null
let remoteStatusesByWorktree: Record<string, GitUpstreamStatus> = {}
const WORKTREE_CARD_IMPORT_TIMEOUT_MS = 15_000

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      deleteStateByWorktreeId: {},
      fetchHostedReviewForBranch,
      fetchIssue,
      fetchLinearIssue,
      gitConflictOperationByWorktree: {},
      hostedReviewCache: {},
      issueCache: {},
      linearIssueCache: {},
      openModal,
      projectGroups: [],
      remoteBranchConflictByWorktreeId: {},
      remoteStatusesByWorktree,
      settings,
      sshConnectionStates: new Map(),
      sshTargetLabels: new Map(),
      updateWorktreeMeta,
      workspacePortScan: null,
      worktreeCardProperties
    })
}))

vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorktree: vi.fn()
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('./use-worktree-activity-status', () => ({
  useWorktreeActivityStatus: () => 'idle'
}))

vi.mock('./CacheTimer', () => ({
  default: () => null,
  usePromptCacheCountdownStartedAt: () => null
}))

vi.mock('./WorktreeCardAgents', () => ({
  default: () => null
}))

vi.mock('./SshDisconnectedDialog', () => ({
  SshDisconnectedDialog: () => null
}))

vi.mock('./WorktreeContextMenu', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
  CLOSE_ALL_CONTEXT_MENUS_EVENT: 'orca:test-close-context-menus',
  WORKTREE_NATIVE_CONTEXT_MENU_ATTR: 'data-worktree-native-context-menu',
  WORKTREE_CONTEXT_MENU_SCOPE_ATTR: 'data-orca-context-menu-scope'
}))

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 'repo-1',
    path: '/repo',
    displayName: 'orca',
    badgeColor: '#999999',
    addedAt: 1,
    ...overrides
  }
}

function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
  return {
    id: 'repo-1::/repo/worktrees/feature',
    repoId: 'repo-1',
    path: '/repo/worktrees/feature',
    displayName: 'Feature tree',
    branch: 'feature/sync',
    head: 'abc123',
    isBare: false,
    isMainWorktree: false,
    comment: '',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    ...overrides
  }
}

describe('WorktreeCard sync badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    worktreeCardProperties = []
    settings = null
    remoteStatusesByWorktree = {}
  })

  it(
    // Regression: the badge lives in the meta row, but the row's presence check
    // omitted syncIndicator — in the new card style nothing else populates the
    // row, so ahead/behind counts were permanently hidden.
    'renders ahead/behind under the new card style even when nothing else fills the meta row',
    async () => {
      settings = { compactWorktreeCards: false, experimentalNewWorktreeCardStyle: true }
      worktreeCardProperties = ['status']
      const worktree = makeWorktree()
      remoteStatusesByWorktree = {
        [worktree.id]: { hasUpstream: true, ahead: 2, behind: 3, upstreamName: 'origin/main' }
      }
      const { default: WorktreeCard } = await import('./WorktreeCard')

      const markup = renderToStaticMarkup(
        <WorktreeCard worktree={worktree} repo={makeRepo()} isActive={false} />
      )

      expect(markup).toContain('data-worktree-card-meta-row=""')
      expect(markup).toContain('2 ahead, 3 behind origin/main')
    },
    WORKTREE_CARD_IMPORT_TIMEOUT_MS
  )

  it(
    'renders ahead/behind in compact card mode',
    async () => {
      settings = { compactWorktreeCards: true, experimentalNewWorktreeCardStyle: false }
      const worktree = makeWorktree()
      remoteStatusesByWorktree = {
        [worktree.id]: { hasUpstream: true, ahead: 0, behind: 5, upstreamName: 'origin/main' }
      }
      const { default: WorktreeCard } = await import('./WorktreeCard')

      const markup = renderToStaticMarkup(
        <WorktreeCard worktree={worktree} repo={makeRepo()} isActive={false} />
      )

      expect(markup).toContain('5 behind origin/main')
    },
    WORKTREE_CARD_IMPORT_TIMEOUT_MS
  )

  it(
    'keeps the meta row hidden in the new card style when the branch is exactly in sync',
    async () => {
      settings = { compactWorktreeCards: false, experimentalNewWorktreeCardStyle: true }
      worktreeCardProperties = ['status']
      const worktree = makeWorktree()
      remoteStatusesByWorktree = {
        [worktree.id]: { hasUpstream: true, ahead: 0, behind: 0, upstreamName: 'origin/main' }
      }
      const { default: WorktreeCard } = await import('./WorktreeCard')

      const markup = renderToStaticMarkup(
        <WorktreeCard worktree={worktree} repo={makeRepo()} isActive={false} />
      )

      expect(markup).not.toContain('data-worktree-card-meta-row=""')
    },
    WORKTREE_CARD_IMPORT_TIMEOUT_MS
  )
})
