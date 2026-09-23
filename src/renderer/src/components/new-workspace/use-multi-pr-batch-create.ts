import React, { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { prSelectionKey, togglePrSelection } from '@/lib/pr-batch-selection'
import { createWorktreesFromPRs, getBatchPrWorktreeSummary } from '@/lib/create-worktrees-from-prs'
import MultiPrSelectList from './MultiPrSelectList'
import type { GitHubWorkItem } from '../../../../shared/github/work-item-types'
import type { TuiAgent } from '../../../../shared/tui-agent'
import type { WorkspaceSource as WorkspaceCreateTelemetrySource } from '../../../../shared/workspace-source'

type MultiPrBatchCreateArgs = {
  repoId: string
  repoPath: string | null
  enabled: boolean
  agent: TuiAgent | null
  telemetrySource?: WorkspaceCreateTelemetrySource
  onCreated: () => void
}

export type MultiPrBatchCreate = {
  multiPrMode: boolean
  showMultiPrToggle: boolean
  batchCreating: boolean
  selectedCount: number
  onMultiPrModeChange: (next: boolean) => void
  multiPrList: React.ReactNode
  /** Button label override while PRs are selected; null keeps the single-create label. */
  primaryActionLabel: string | null
  createBatch: () => Promise<void>
}

// Why: multi-PR batch state lives outside useComposerState — the composer hook models a
// single linked work item throughout, so a parallel path keeps the single-select flow untouched.
export function useMultiPrBatchCreate({
  repoId,
  repoPath,
  enabled,
  agent,
  telemetrySource,
  onCreated
}: MultiPrBatchCreateArgs): MultiPrBatchCreate {
  const [modeOn, setModeOn] = useState(false)
  const [selectedPrs, setSelectedPrs] = useState<GitHubWorkItem[]>([])
  const [batchCreating, setBatchCreating] = useState(false)
  const multiPrMode = enabled && modeOn
  const selectedKeys = useMemo(
    () => new Set(selectedPrs.map((item) => prSelectionKey(item))),
    [selectedPrs]
  )
  const handleToggle = useCallback((item: GitHubWorkItem): void => {
    setSelectedPrs((prev) => togglePrSelection(prev, item))
  }, [])
  const onMultiPrModeChange = useCallback((next: boolean): void => {
    setModeOn(next)
    if (!next) {
      setSelectedPrs([])
    }
  }, [])

  const createBatch = useCallback(async (): Promise<void> => {
    if (selectedPrs.length === 0 || batchCreating) {
      return
    }
    setBatchCreating(true)
    try {
      const result = await createWorktreesFromPRs({
        items: selectedPrs,
        repoId,
        agent,
        ...(telemetrySource ? { telemetrySource } : {})
      })
      if (result.created > 0) {
        toast.success(getBatchPrWorktreeSummary(result))
        onCreated()
      } else {
        toast.error(getBatchPrWorktreeSummary(result))
      }
    } finally {
      setBatchCreating(false)
    }
  }, [agent, batchCreating, onCreated, repoId, selectedPrs, telemetrySource])

  // Why: only the button reflects the batch count — the dialog title stays stable so it doesn't
  // rewrite itself on every checkbox toggle.
  const primaryActionLabel =
    multiPrMode && selectedPrs.length > 0
      ? selectedPrs.length === 1
        ? translate(
            'auto.components.NewWorkspaceComposerModal.createOneWorktree',
            'Create 1 worktree'
          )
        : translate(
            'auto.components.NewWorkspaceComposerModal.createCountWorktrees',
            'Create {{count}} worktrees',
            { count: selectedPrs.length }
          )
      : null

  const multiPrList =
    multiPrMode && repoPath
      ? React.createElement(MultiPrSelectList, {
          repoId,
          repoPath,
          selectedKeys,
          onToggle: handleToggle,
          onReplaceSelection: setSelectedPrs
        })
      : null

  return {
    multiPrMode,
    showMultiPrToggle: enabled,
    batchCreating,
    selectedCount: selectedPrs.length,
    onMultiPrModeChange,
    multiPrList,
    primaryActionLabel,
    createBatch
  }
}
