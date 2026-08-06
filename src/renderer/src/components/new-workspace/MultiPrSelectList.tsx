import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, GitPullRequest, GitPullRequestDraft, LoaderCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import {
  getTaskPageGitHubPRIconTone,
  isTaskPageGitHubDraftPR
} from '@/components/task-page-github-work-item-status'
import { TaskPageGitHubWorkItemStateBadge } from '@/components/task-page-github-work-item-status-badge'
import { prSelectionKey } from '@/lib/pr-batch-selection'
import type { GitHubWorkItem } from '../../../../shared/types'

const RESULT_LIMIT = 30
const QUERY_DEBOUNCE_MS = 300

export default function MultiPrSelectList({
  repoId,
  repoPath,
  selectedKeys,
  onToggle,
  onReplaceSelection
}: {
  repoId: string
  repoPath: string
  selectedKeys: ReadonlySet<string>
  onToggle: (item: GitHubWorkItem) => void
  onReplaceSelection: (items: GitHubWorkItem[]) => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [items, setItems] = useState<GitHubWorkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Why: a slow fetch that resolves after a newer one must not overwrite fresher results.
  const requestSeqRef = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), QUERY_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!repoId || !repoPath) {
      setItems([])
      return
    }
    const seq = requestSeqRef.current + 1
    requestSeqRef.current = seq
    setLoading(true)
    setError(null)
    void useAppStore
      .getState()
      .fetchWorkItems(repoId, repoPath, RESULT_LIMIT, debouncedQuery)
      .then((fetched) => {
        if (requestSeqRef.current !== seq) {
          return
        }
        setItems(fetched.filter((item) => item.type === 'pr'))
      })
      .catch((err: unknown) => {
        if (requestSeqRef.current !== seq) {
          return
        }
        setItems([])
        setError(err instanceof Error ? err.message : 'Failed to load pull requests.')
      })
      .finally(() => {
        if (requestSeqRef.current === seq) {
          setLoading(false)
        }
      })
  }, [repoId, repoPath, debouncedQuery])

  const readyItems = useMemo(() => items.filter((item) => !isTaskPageGitHubDraftPR(item)), [items])
  const allReadySelected =
    readyItems.length > 0 && readyItems.every((item) => selectedKeys.has(prSelectionKey(item)))

  return (
    <div className="space-y-2">
      <div className="relative">
        {loading ? (
          <LoaderCircle className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={translate(
            'auto.components.new.workspace.MultiPrSelectList.search',
            'Search pull requests...'
          )}
          className="h-9 pl-8 text-sm"
        />
      </div>

      {readyItems.length > 0 ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[11px] text-muted-foreground">
            {selectedKeys.size > 0
              ? translate(
                  'auto.components.new.workspace.MultiPrSelectList.selectedCount',
                  '{{count}} selected',
                  { count: selectedKeys.size }
                )
              : translate(
                  'auto.components.new.workspace.MultiPrSelectList.hint',
                  'Select the pull requests to open'
                )}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-6 px-2 text-[11px]"
            onClick={() => onReplaceSelection(allReadySelected ? [] : readyItems)}
          >
            {allReadySelected
              ? translate('auto.components.new.workspace.MultiPrSelectList.clear', 'Clear all')
              : translate(
                  'auto.components.new.workspace.MultiPrSelectList.selectReady',
                  'Select all ready'
                )}
          </Button>
        </div>
      ) : null}

      {/* Why: taller than the single-select popover (which is capped so it can't cover the
          submit footer) — rendered inline, so the footer stays visible below it. */}
      <div className="max-h-64 min-h-24 overflow-y-auto rounded-md border border-input p-1 scrollbar-sleek">
        {loading && items.length === 0 ? (
          <div className="space-y-1 p-1">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-8 animate-pulse rounded bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <div className="px-3 py-6 text-center text-xs text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {translate(
              'auto.components.new.workspace.MultiPrSelectList.empty',
              'No open pull requests found.'
            )}
          </div>
        ) : (
          items.map((item) => {
            const key = prSelectionKey(item)
            const selected = selectedKeys.has(key)
            const PrIcon = isTaskPageGitHubDraftPR(item) ? GitPullRequestDraft : GitPullRequest
            return (
              <button
                key={key}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onToggle(item)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent',
                  selected && 'bg-accent/60'
                )}
              >
                <Check
                  className={cn('size-3.5 shrink-0', selected ? 'opacity-70' : 'opacity-0')}
                  aria-hidden="true"
                />
                <PrIcon
                  className={cn('size-3.5 shrink-0', getTaskPageGitHubPRIconTone(item))}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-foreground">#{item.number}</span> {item.title}
                </span>
                {isTaskPageGitHubDraftPR(item) ? (
                  <TaskPageGitHubWorkItemStateBadge item={item} className="shrink-0" />
                ) : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
