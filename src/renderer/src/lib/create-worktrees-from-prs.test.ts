import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitHubWorkItem } from '../../../shared/types'

const mocks = vi.hoisted(() => ({
  launchWorkItemDirect: vi.fn()
}))

vi.mock('@/lib/launch-work-item-direct', () => ({
  launchWorkItemDirect: mocks.launchWorkItemDirect
}))

import { createWorktreesFromPRs, getBatchPrWorktreeSummary } from '@/lib/create-worktrees-from-prs'

function pr(number: number): GitHubWorkItem {
  return {
    id: `pr-${number}`,
    type: 'pr',
    number,
    title: `PR ${number}`,
    state: 'open',
    url: `https://github.com/o/r/pull/${number}`,
    repoId: 'repo-1'
  } as GitHubWorkItem
}

describe('createWorktreesFromPRs', () => {
  beforeEach(() => {
    mocks.launchWorkItemDirect.mockReset()
  })

  it('creates one workspace per selected PR', async () => {
    mocks.launchWorkItemDirect.mockResolvedValue(true)

    const result = await createWorktreesFromPRs({
      items: [pr(1), pr(2), pr(3)],
      repoId: 'repo-1'
    })

    expect(result).toEqual({ created: 3, blocked: 0, failed: 0 })
    expect(mocks.launchWorkItemDirect).toHaveBeenCalledTimes(3)
  })

  it('passes the PR, repo and agent override through to each launch', async () => {
    mocks.launchWorkItemDirect.mockResolvedValue(true)

    await createWorktreesFromPRs({
      items: [pr(7)],
      repoId: 'repo-1',
      agent: 'claude',
      telemetrySource: 'sidebar'
    })

    const args = mocks.launchWorkItemDirect.mock.calls[0]![0]
    expect(args.repoId).toBe('repo-1')
    expect(args.item.number).toBe(7)
    expect(args.agentOverride).toBe('claude')
    expect(args.telemetrySource).toBe('sidebar')
    expect(args.launchSource).toBe('new_workspace_composer')
  })

  it('omits the agent override when no agent is selected', async () => {
    mocks.launchWorkItemDirect.mockResolvedValue(true)

    await createWorktreesFromPRs({ items: [pr(1)], repoId: 'repo-1', agent: null })

    expect(mocks.launchWorkItemDirect.mock.calls[0]![0]).not.toHaveProperty('agentOverride')
  })

  it('keeps going after a failure and reports per-PR outcomes', async () => {
    mocks.launchWorkItemDirect.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const result = await createWorktreesFromPRs({ items: [pr(1), pr(2)], repoId: 'repo-1' })

    expect(result).toEqual({ created: 1, blocked: 0, failed: 1 })
    expect(mocks.launchWorkItemDirect).toHaveBeenCalledTimes(2)
  })

  it('counts a PR that needs setup input as blocked, not failed', async () => {
    mocks.launchWorkItemDirect.mockImplementation(
      async (args: { openModalFallback: () => void }) => {
        args.openModalFallback()
        return false
      }
    )

    const result = await createWorktreesFromPRs({ items: [pr(1)], repoId: 'repo-1' })

    expect(result).toEqual({ created: 0, blocked: 1, failed: 0 })
  })

  it('creates sequentially so collision retries observe prior worktrees', async () => {
    const order: string[] = []
    mocks.launchWorkItemDirect.mockImplementation(async (args: { item: { number: number } }) => {
      order.push(`start-${args.item.number}`)
      await Promise.resolve()
      order.push(`end-${args.item.number}`)
      return true
    })

    await createWorktreesFromPRs({ items: [pr(1), pr(2)], repoId: 'repo-1' })

    expect(order).toEqual(['start-1', 'end-1', 'start-2', 'end-2'])
  })

  it('does nothing when no PRs are selected', async () => {
    const result = await createWorktreesFromPRs({ items: [], repoId: 'repo-1' })

    expect(result).toEqual({ created: 0, blocked: 0, failed: 0 })
    expect(mocks.launchWorkItemDirect).not.toHaveBeenCalled()
  })
})

describe('getBatchPrWorktreeSummary', () => {
  it('pluralizes the created count', () => {
    expect(getBatchPrWorktreeSummary({ created: 1, blocked: 0, failed: 0 })).toBe(
      'Created 1 worktree'
    )
    expect(getBatchPrWorktreeSummary({ created: 4, blocked: 0, failed: 0 })).toBe(
      'Created 4 worktrees'
    )
  })

  it('appends blocked and failed counts only when non-zero', () => {
    expect(getBatchPrWorktreeSummary({ created: 2, blocked: 1, failed: 1 })).toBe(
      'Created 2 worktrees · 1 needed setup input · 1 failed'
    )
  })
})
