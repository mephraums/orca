import { describe, expect, it } from 'vitest'
import type { GitHubWorkItem } from '../../../shared/types'
import {
  addPrSelections,
  allPrsSelected,
  combineBatchPrWorktreeResults,
  groupPrSelectionByRepo,
  prSelectionKey,
  togglePrSelection
} from './pr-batch-selection'

function pr(repoId: string, number: number): GitHubWorkItem {
  return {
    id: `pr:${number}`,
    type: 'pr',
    number,
    title: `PR ${number}`,
    state: 'open',
    url: `https://example.test/${repoId}/pull/${number}`,
    labels: [],
    updatedAt: '2026-01-01T00:00:00Z',
    author: null,
    repoId
  }
}

describe('prSelectionKey', () => {
  it('qualifies the number with the repo so cross-repo collisions stay distinct', () => {
    expect(prSelectionKey(pr('repo-a', 7))).not.toBe(prSelectionKey(pr('repo-b', 7)))
    expect(prSelectionKey(pr('repo-a', 7))).toBe(prSelectionKey(pr('repo-a', 7)))
  })
})

describe('togglePrSelection', () => {
  it('adds an unselected item and removes a selected one', () => {
    const a = pr('repo-a', 1)
    const b = pr('repo-a', 2)
    const withA = togglePrSelection([], a)
    expect(withA).toEqual([a])
    const withBoth = togglePrSelection(withA, b)
    expect(withBoth).toEqual([a, b])
    expect(togglePrSelection(withBoth, a)).toEqual([b])
  })

  it('matches by selection key, not object identity', () => {
    const selected = togglePrSelection([], pr('repo-a', 1))
    expect(togglePrSelection(selected, pr('repo-a', 1))).toEqual([])
  })
})

describe('addPrSelections', () => {
  it('merges new items without duplicating already-selected ones', () => {
    const existing = [pr('repo-a', 1)]
    const merged = addPrSelections(existing, [pr('repo-a', 1), pr('repo-a', 2), pr('repo-b', 1)])
    expect(merged.map(prSelectionKey)).toEqual(['repo-a:1', 'repo-a:2', 'repo-b:1'])
  })

  it('keeps picks that are not in the visible batch (other pages)', () => {
    const offPage = pr('repo-a', 99)
    const merged = addPrSelections([offPage], [pr('repo-a', 1)])
    expect(merged.map(prSelectionKey)).toEqual(['repo-a:99', 'repo-a:1'])
  })
})

describe('allPrsSelected', () => {
  it('is true only when every listed item is selected and the list is non-empty', () => {
    const items = [pr('repo-a', 1), pr('repo-b', 2)]
    const keys = new Set(items.map(prSelectionKey))
    expect(allPrsSelected(keys, items)).toBe(true)
    expect(allPrsSelected(new Set(['repo-a:1']), items)).toBe(false)
    expect(allPrsSelected(keys, [])).toBe(false)
  })
})

describe('groupPrSelectionByRepo', () => {
  it('groups by repo while preserving selection order within and across groups', () => {
    const groups = groupPrSelectionByRepo([
      pr('repo-a', 1),
      pr('repo-b', 5),
      pr('repo-a', 2),
      pr('repo-b', 6)
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].repoId).toBe('repo-a')
    expect(groups[0].items.map((i) => i.number)).toEqual([1, 2])
    expect(groups[1].repoId).toBe('repo-b')
    expect(groups[1].items.map((i) => i.number)).toEqual([5, 6])
  })

  it('returns no groups for an empty selection', () => {
    expect(groupPrSelectionByRepo([])).toEqual([])
  })
})

describe('combineBatchPrWorktreeResults', () => {
  it('sums per-repo batch outcomes', () => {
    expect(
      combineBatchPrWorktreeResults([
        { created: 2, blocked: 1, failed: 0 },
        { created: 1, blocked: 0, failed: 3 }
      ])
    ).toEqual({ created: 3, blocked: 1, failed: 3 })
  })

  it('is all-zero for no results', () => {
    expect(combineBatchPrWorktreeResults([])).toEqual({ created: 0, blocked: 0, failed: 0 })
  })
})
