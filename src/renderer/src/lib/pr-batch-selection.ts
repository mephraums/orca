import type { GitHubWorkItem } from '../../../shared/types'
import type { BatchPrWorktreeResult } from '@/lib/create-worktrees-from-prs'

/** Selection identity for a PR row; repo-qualified because merged multi-repo lists reuse PR numbers. */
export function prSelectionKey(item: Pick<GitHubWorkItem, 'repoId' | 'number'>): string {
  return `${item.repoId}:${item.number}`
}

export function togglePrSelection(
  selected: readonly GitHubWorkItem[],
  item: GitHubWorkItem
): GitHubWorkItem[] {
  const key = prSelectionKey(item)
  return selected.some((entry) => prSelectionKey(entry) === key)
    ? selected.filter((entry) => prSelectionKey(entry) !== key)
    : [...selected, item]
}

export function addPrSelections(
  selected: readonly GitHubWorkItem[],
  items: readonly GitHubWorkItem[]
): GitHubWorkItem[] {
  // Why: merge instead of replace — "select all" on one page must not drop picks made on other pages.
  const seen = new Set(selected.map((entry) => prSelectionKey(entry)))
  const merged = [...selected]
  for (const item of items) {
    const key = prSelectionKey(item)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }
  return merged
}

export function allPrsSelected(
  selectedKeys: ReadonlySet<string>,
  items: readonly GitHubWorkItem[]
): boolean {
  return items.length > 0 && items.every((item) => selectedKeys.has(prSelectionKey(item)))
}

export type PrSelectionRepoGroup = {
  repoId: string
  items: GitHubWorkItem[]
}

export function groupPrSelectionByRepo(items: readonly GitHubWorkItem[]): PrSelectionRepoGroup[] {
  // Why: the tasks list merges PRs across repos, but the batch primitive creates worktrees for one repo at a time.
  const groups = new Map<string, GitHubWorkItem[]>()
  for (const item of items) {
    const group = groups.get(item.repoId)
    if (group) {
      group.push(item)
    } else {
      groups.set(item.repoId, [item])
    }
  }
  return [...groups.entries()].map(([repoId, groupItems]) => ({ repoId, items: groupItems }))
}

export function combineBatchPrWorktreeResults(
  results: readonly BatchPrWorktreeResult[]
): BatchPrWorktreeResult {
  const combined: BatchPrWorktreeResult = { created: 0, blocked: 0, failed: 0 }
  for (const result of results) {
    combined.created += result.created
    combined.blocked += result.blocked
    combined.failed += result.failed
  }
  return combined
}
