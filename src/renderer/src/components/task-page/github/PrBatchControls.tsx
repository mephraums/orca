import { ArrowRight, GitPullRequestDraft, ListChecks, LoaderCircle } from 'lucide-react'
import type { TaskPageGitHubPrBatchSelection } from '../../use-task-page-github-pr-batch-selection'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const TOGGLE_BASE_CLASS = 'size-8 border-border/60 shadow-xs'
const TOGGLE_ON_CLASS = 'border-foreground/40 bg-muted/70 text-foreground'
const TOGGLE_OFF_CLASS = 'bg-background text-foreground hover:bg-muted/60'

/** PR-tab toolbar toggles (personal fork): hide drafts and multi-select mode. */
export function TaskPageGitHubPrToolbarToggles({
  batch
}: {
  batch: TaskPageGitHubPrBatchSelection
}): React.JSX.Element {
  const { hideDraftPRs, prMultiSelectActive } = batch
  const draftLabel = hideDraftPRs
    ? translate('auto.components.TaskPage.showDraftPrs', 'Show draft PRs')
    : translate('auto.components.TaskPage.hideDraftPrs', 'Hide draft PRs')
  const multiSelectLabel = prMultiSelectActive
    ? translate('auto.components.TaskPage.multiSelectDone', 'Done selecting')
    : translate('auto.components.TaskPage.multiSelectStart', 'Select multiple pull requests')
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={batch.handleToggleHideDraftPRs}
            aria-pressed={hideDraftPRs}
            aria-label={draftLabel}
            className={cn(TOGGLE_BASE_CLASS, hideDraftPRs ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS)}
          >
            <span className="relative inline-flex items-center justify-center">
              <GitPullRequestDraft className="size-4" />
              {hideDraftPRs ? (
                // Why: lucide has no crossed-out draft glyph; a slash overlay reads as "drafts hidden".
                <span
                  aria-hidden="true"
                  className="absolute h-px w-5 -rotate-45 rounded bg-current"
                />
              ) : null}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {draftLabel}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={batch.handleTogglePrMultiSelectMode}
            aria-pressed={prMultiSelectActive}
            aria-label={multiSelectLabel}
            className={cn(
              TOGGLE_BASE_CLASS,
              prMultiSelectActive ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS
            )}
          >
            <ListChecks className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {multiSelectLabel}
        </TooltipContent>
      </Tooltip>
    </>
  )
}

function startLabel(count: number): string {
  if (count === 1) {
    return translate('auto.components.TaskPage.startOneWorkspace', 'Start 1 workspace')
  }
  if (count > 1) {
    return translate(
      'auto.components.TaskPage.startWorkspacesCount',
      'Start {{value0}} workspaces',
      {
        value0: count
      }
    )
  }
  return translate('auto.components.TaskPage.startWorkspaces', 'Start workspaces')
}

/** Selection summary + batch start bar shown while PR multi-select is on. */
export function TaskPageGitHubPrBatchBar({
  batch
}: {
  batch: TaskPageGitHubPrBatchSelection
}): React.JSX.Element | null {
  const { selectedBatchPrs, readyVisiblePrs, batchPrStarting, prMultiSelectShowClearAll } = batch
  if (!batch.prMultiSelectColumnsActive) {
    return null
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
      <span className="text-xs text-muted-foreground">
        {selectedBatchPrs.length > 0
          ? translate('auto.components.TaskPage.multiSelectCount', '{{count}} selected', {
              count: selectedBatchPrs.length
            })
          : translate(
              'auto.components.TaskPage.multiSelectHint',
              'Select pull requests to start workspaces'
            )}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={batch.handleSelectAllReadyPrs}
          disabled={readyVisiblePrs.length === 0 && selectedBatchPrs.length === 0}
        >
          {prMultiSelectShowClearAll
            ? translate('auto.components.TaskPage.multiSelectClear', 'Clear all')
            : translate('auto.components.TaskPage.multiSelectAllReady', 'Select all ready')}
        </Button>
        <Button
          type="button"
          size="xs"
          className="gap-1 font-semibold"
          disabled={selectedBatchPrs.length === 0 || batchPrStarting}
          onClick={() => void batch.handleStartSelectedPrWorkspaces()}
        >
          {batchPrStarting ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <ArrowRight className="size-3" />
          )}
          {startLabel(selectedBatchPrs.length)}
        </Button>
      </div>
    </div>
  )
}
