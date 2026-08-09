import { ChevronDown, CircleDot, LoaderCircle, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PrimaryWorkspaceBranchCleanup } from '../sidebar/use-primary-workspace-branch-cleanup'
import {
  RIGHT_SIDEBAR_MERGE_PRIMARY_BUTTON_CLASS,
  RIGHT_SIDEBAR_PRIMARY_BUTTON_LABEL_CLASS,
  RIGHT_SIDEBAR_SPLIT_ACTION_ROW_CLASS
} from './right-sidebar-primary-action-layout'
import { translate } from '@/i18n/i18n'

export function HostedReviewActionError({
  message
}: {
  message: string | null
}): React.JSX.Element | null {
  return message ? <div className="text-[10px] text-rose-500 break-words">{message}</div> : null
}

export function ClosedReviewActions({
  shortLabel,
  stateUpdating,
  actionError,
  onReopenReview
}: {
  shortLabel: string
  stateUpdating: 'open' | 'closed' | null
  actionError: string | null
  onReopenReview: () => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="cursor-pointer text-[11px] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onReopenReview}
        disabled={stateUpdating !== null}
      >
        {stateUpdating === 'open' ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <CircleDot className="size-3.5" />
        )}
        {stateUpdating === 'open'
          ? translate(
              'auto.components.right.sidebar.HostedReviewActions.6645ac7dd1',
              'Reopening...'
            )
          : translate(
              'auto.components.right.sidebar.HostedReviewActions.3ce211ece6',
              'Reopen {{value0}}',
              { value0: shortLabel }
            )}
      </Button>
      <HostedReviewActionError message={actionError} />
    </div>
  )
}

const MERGED_BRANCH_BUTTON_CLASS =
  'border-destructive/30 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Post-merge actions for the repo's primary checkout. It is the original clone,
 * so it can never be worktree-removed — the useful cleanup once the PR lands is
 * dropping the branch and going back to the default one.
 */
export function MergedPrimaryBranchActions({
  cleanup
}: {
  cleanup: PrimaryWorkspaceBranchCleanup
}): React.JSX.Element {
  const { actions, deleteLabel, forceNote, returnLabel, running } = cleanup
  const deleteDisabled = running || !actions.deleteBranchAndReturn.enabled
  const returnDisabled = running || !actions.returnToDefault.enabled
  return (
    <TooltipProvider delayDuration={300}>
      <div className={RIGHT_SIDEBAR_SPLIT_ACTION_ROW_CLASS}>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Why: a <span> keeps the tooltip reachable while the button is disabled. */}
            <span
              className={cn(
                'inline-flex min-w-0 max-w-full shrink',
                deleteDisabled && 'cursor-not-allowed'
              )}
            >
              <Button
                type="button"
                variant="outline"
                size="xs"
                className={cn(
                  'cursor-pointer rounded-r-none px-3',
                  RIGHT_SIDEBAR_MERGE_PRIMARY_BUTTON_CLASS,
                  MERGED_BRANCH_BUTTON_CLASS
                )}
                onClick={cleanup.deleteBranchAndReturn}
                disabled={deleteDisabled}
              >
                {running ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                <span className={RIGHT_SIDEBAR_PRIMARY_BUTTON_LABEL_CLASS}>{deleteLabel}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4} className="max-w-[240px] text-pretty">
            {actions.deleteBranchAndReturn.disabledReason ?? forceNote ?? deleteLabel}
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className={cn(
                'cursor-pointer shrink-0 rounded-l-none px-1.5',
                MERGED_BRANCH_BUTTON_CLASS
              )}
              disabled={running}
              aria-label={translate(
                'auto.components.right.sidebar.HostedReviewActions.branchCleanupMore',
                'More branch actions'
              )}
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled={returnDisabled} onSelect={cleanup.returnToDefault}>
              <Undo2 className="size-3.5" />
              {returnLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

export function MergedReviewActions({
  isDeletingWorktree,
  onDeleteWorktree
}: {
  isDeletingWorktree: boolean
  onDeleteWorktree: () => void
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      // Why: outline matches the sibling Reopen control; destructive text signals danger
      // without a solid red fill dominating the PR summary panel.
      className="cursor-pointer border-destructive/30 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onDeleteWorktree}
      disabled={isDeletingWorktree}
    >
      {isDeletingWorktree ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      {isDeletingWorktree
        ? translate('auto.components.right.sidebar.HostedReviewActions.eefd50457e', 'Deleting...')
        : translate(
            'auto.components.right.sidebar.HostedReviewActions.e4aca40024',
            'Delete Workspace'
          )}
    </Button>
  )
}
