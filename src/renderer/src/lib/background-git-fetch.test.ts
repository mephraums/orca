import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRuntimeGit = vi.fn().mockResolvedValue(undefined)
const getRuntimeGitUpstreamStatus = vi.fn()
const setUpstreamStatus = vi.fn()

vi.mock('@/runtime/runtime-git-client', () => ({
  fetchRuntimeGit: (...args: unknown[]) => fetchRuntimeGit(...args),
  getRuntimeGitUpstreamStatus: (...args: unknown[]) => getRuntimeGitUpstreamStatus(...args)
}))

let storeState: Record<string, unknown> = {}
vi.mock('@/store', () => ({
  useAppStore: { getState: () => storeState }
}))

const { resetBackgroundGitFetchStateForTests, runBackgroundGitFetchTick } =
  await import('./background-git-fetch')

function buildState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    settings: { backgroundGitFetch: { enabled: true, intervalMinutes: 5 } },
    repos: [{ id: 'repo-1', path: '/repo-1', displayName: 'repo-1' }],
    allWorktrees: () => [
      { id: 'repo-1::/repo-1', repoId: 'repo-1', path: '/repo-1', isMainWorktree: true },
      { id: 'repo-1::/wt-a', repoId: 'repo-1', path: '/wt-a', isMainWorktree: false }
    ],
    sshConnectionStates: new Map(),
    setUpstreamStatus,
    ...overrides
  }
}

beforeEach(() => {
  resetBackgroundGitFetchStateForTests()
  fetchRuntimeGit.mockClear().mockResolvedValue(undefined)
  getRuntimeGitUpstreamStatus
    .mockClear()
    .mockResolvedValue({ hasUpstream: true, ahead: 2, behind: 14 })
  setUpstreamStatus.mockClear()
  storeState = buildState()
})

describe('runBackgroundGitFetchTick', () => {
  it('fetches once per repo and refreshes every workspace in it', async () => {
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })

    expect(fetchRuntimeGit).toHaveBeenCalledTimes(1)
    expect(getRuntimeGitUpstreamStatus).toHaveBeenCalledTimes(2)
    expect(setUpstreamStatus).toHaveBeenCalledWith('repo-1::/wt-a', {
      hasUpstream: true,
      ahead: 2,
      behind: 14
    })
  })

  it('does nothing while the window is unfocused', async () => {
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: false })
    expect(fetchRuntimeGit).not.toHaveBeenCalled()
  })

  it('does nothing when disabled', async () => {
    storeState = buildState({
      settings: { backgroundGitFetch: { enabled: false, intervalMinutes: 5 } }
    })
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    expect(fetchRuntimeGit).not.toHaveBeenCalled()
  })

  it('does not refetch before the interval elapses', async () => {
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    await runBackgroundGitFetchTick({ now: 1_100_000, isWindowFocused: true })
    expect(fetchRuntimeGit).toHaveBeenCalledTimes(1)
  })

  it('refetches once the interval elapses', async () => {
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    await runBackgroundGitFetchTick({ now: 1_400_000, isWindowFocused: true })
    expect(fetchRuntimeGit).toHaveBeenCalledTimes(2)
  })

  it('skips repos on a disconnected SSH host', async () => {
    storeState = buildState({
      repos: [{ id: 'repo-1', path: '/repo-1', displayName: 'repo-1', connectionId: 'ssh-1' }],
      sshConnectionStates: new Map([['ssh-1', { status: 'disconnected' }]])
    })
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    expect(fetchRuntimeGit).not.toHaveBeenCalled()
  })

  it('still refreshes remaining workspaces when one status read fails', async () => {
    getRuntimeGitUpstreamStatus
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ hasUpstream: true, ahead: 0, behind: 3 })

    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    expect(setUpstreamStatus).toHaveBeenCalledTimes(1)
    expect(setUpstreamStatus).toHaveBeenCalledWith('repo-1::/wt-a', {
      hasUpstream: true,
      ahead: 0,
      behind: 3
    })
  })

  it('backs off after a failed fetch instead of retrying every tick', async () => {
    fetchRuntimeGit.mockRejectedValueOnce(new Error('network'))
    await runBackgroundGitFetchTick({ now: 1_000_000, isWindowFocused: true })
    await runBackgroundGitFetchTick({ now: 1_100_000, isWindowFocused: true })
    expect(fetchRuntimeGit).toHaveBeenCalledTimes(1)
  })
})
