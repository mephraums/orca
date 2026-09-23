import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { GitHubWorkItem } from '../../../shared/github/work-item-types'
import type { GlobalSettings } from '../../../shared/global-settings-types'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { isTaskPageGitHubDraftPR } from '@/components/task-page-github-work-item-status'
import {
  createWorktreesFromPRs,
  getBatchPrWorktreeSummary,
  type BatchPrWorktreeResult
} from '@/lib/create-worktrees-from-prs'
import {
  addPrSelections,
  allPrsSelected,
  combineBatchPrWorktreeResults,
  groupPrSelectionByRepo,
  prSelectionKey,
  togglePrSelection
} from '@/lib/pr-batch-selection'
import {
  GITHUB_TASK_STICKY_TITLE_CELL_CLASS,
  GITHUB_TASK_STICKY_TITLE_HEADER_CLASS
} from './task-page-source-context'

// Why: multi-select adds a leading checkbox to the ID column; the wider column shifts where the sticky title column pins.
export const GITHUB_PR_TASK_MULTI_SELECT_GRID_CLASS =
  'min-w-[1048px] grid-cols-[100px_minmax(360px,2fr)_132px_128px_132px_92px_158px]'

type PrBatchSelectionArgs = {
  taskSource: string
  githubMode: 'items' | 'project'
  activeGithubTaskKind: string
  showPRManagementColumns: boolean
  filteredWorkItems: readonly GitHubWorkItem[]
  hideDraftPRs: boolean
  updateSettings: (updates: Partial<GlobalSettings>) => Promise<unknown>
}

/** Personal-fork Tasks features: PR multi-select → batch start, and the hide-drafts toggle. */
export function useTaskPageGitHubPrBatchSelection({
  taskSource,
  githubMode,
  activeGithubTaskKind,
  showPRManagementColumns,
  filteredWorkItems,
  hideDraftPRs,
  updateSettings
}: PrBatchSelectionArgs) {
  // Why: a transient view mode of the GitHub PR table, not app state.
  const [prMultiSelectActive, setPrMultiSelectActive] = useState(false)
  const [selectedBatchPrs, setSelectedBatchPrs] = useState<GitHubWorkItem[]>([])
  const [batchPrStarting, setBatchPrStarting] = useState(false)
  const selectedBatchPrKeys = useMemo(
    () => new Set(selectedBatchPrs.map((item) => prSelectionKey(item))),
    [selectedBatchPrs]
  )
  const readyVisiblePrs = useMemo(
    () => filteredWorkItems.filter((item) => item.type === 'pr' && !isTaskPageGitHubDraftPR(item)),
    [filteredWorkItems]
  )
  const allVisibleReadyPrsSelected = allPrsSelected(selectedBatchPrKeys, readyVisiblePrs)
  // Why: cross-page picks can outlive the visible page; offer Clear when there is nothing left to add here.
  const prMultiSelectShowClearAll =
    allVisibleReadyPrsSelected || (readyVisiblePrs.length === 0 && selectedBatchPrs.length > 0)

  // Why: leaving the GitHub PR list drops stale picks instead of batch-starting unseen rows later.
  // Adjusted during render (not in an effect) so the stale selection never paints.
  const onGitHubPrList =
    taskSource === 'github' && githubMode === 'items' && activeGithubTaskKind === 'prs'
  const [wasOnGitHubPrList, setWasOnGitHubPrList] = useState(onGitHubPrList)
  if (wasOnGitHubPrList !== onGitHubPrList) {
    setWasOnGitHubPrList(onGitHubPrList)
    if (!onGitHubPrList) {
      setPrMultiSelectActive(false)
      setSelectedBatchPrs([])
    }
  }

  const handleTogglePrMultiSelectMode = useCallback((): void => {
    setPrMultiSelectActive((active) => !active)
    setSelectedBatchPrs([])
  }, [])

  const handleToggleHideDraftPRs = useCallback((): void => {
    void updateSettings({ hideDraftPRsInTaskList: !hideDraftPRs }).catch(() => {
      toast.error(
        translate(
          'auto.components.TaskPage.hideDraftPrsSaveFailed',
          'Failed to save draft PR visibility.'
        )
      )
    })
  }, [hideDraftPRs, updateSettings])

  const handleToggleBatchPr = useCallback((item: GitHubWorkItem): void => {
    setSelectedBatchPrs((prev) => togglePrSelection(prev, item))
  }, [])

  const handleSelectAllReadyPrs = useCallback((): void => {
    setSelectedBatchPrs((prev) =>
      prMultiSelectShowClearAll ? [] : addPrSelections(prev, readyVisiblePrs)
    )
  }, [prMultiSelectShowClearAll, readyVisiblePrs])

  const handleStartSelectedPrWorkspaces = useCallback(async (): Promise<void> => {
    const items = selectedBatchPrs
    if (items.length === 0 || batchPrStarting) {
      return
    }
    useAppStore.getState().recordFeatureInteraction('github-tasks')
    setBatchPrStarting(true)
    try {
      const results: BatchPrWorktreeResult[] = []
      // Why: sequential per repo — the batch primitive is itself sequential to avoid branch-collision and terminal-focus races.
      for (const group of groupPrSelectionByRepo(items)) {
        results.push(
          await createWorktreesFromPRs({
            items: group.items,
            repoId: group.repoId,
            launchSource: 'task_page',
            telemetrySource: 'sidebar'
          })
        )
      }
      const combined = combineBatchPrWorktreeResults(results)
      if (combined.created > 0) {
        toast.success(getBatchPrWorktreeSummary(combined))
        setSelectedBatchPrs([])
        setPrMultiSelectActive(false)
      } else {
        toast.error(getBatchPrWorktreeSummary(combined))
      }
    } finally {
      setBatchPrStarting(false)
    }
  }, [batchPrStarting, selectedBatchPrs])

  const prMultiSelectColumnsActive = showPRManagementColumns && prMultiSelectActive
  const githubTaskStickyTitleHeaderClass = cn(
    GITHUB_TASK_STICKY_TITLE_HEADER_CLASS,
    prMultiSelectColumnsActive && 'left-[120px]'
  )
  const githubTaskStickyTitleCellClass = cn(
    GITHUB_TASK_STICKY_TITLE_CELL_CLASS,
    prMultiSelectColumnsActive && 'left-[120px]'
  )

  return {
    hideDraftPRs,
    prMultiSelectActive,
    prMultiSelectColumnsActive,
    selectedBatchPrs,
    selectedBatchPrKeys,
    batchPrStarting,
    readyVisiblePrs,
    prMultiSelectShowClearAll,
    githubTaskStickyTitleHeaderClass,
    githubTaskStickyTitleCellClass,
    handleTogglePrMultiSelectMode,
    handleToggleHideDraftPRs,
    handleToggleBatchPr,
    handleSelectAllReadyPrs,
    handleStartSelectedPrWorkspaces
  }
}

export type TaskPageGitHubPrBatchSelection = ReturnType<typeof useTaskPageGitHubPrBatchSelection>
