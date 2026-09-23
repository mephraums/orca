import { Trash2, Undo2 } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Worktree } from '../../../../shared/worktree/types'
import { usePrimaryWorkspaceBranchCleanup } from './use-primary-workspace-branch-cleanup'

/**
 * Why (personal fork): the primary checkout can't be git-worktree-removed, so its
 * destructive slot offers branch cleanup instead — an agent that opened and landed
 * a PR leaves it parked on a merged branch. Remove Project stays on the project header menu.
 */
export function WorktreeContextMenuPrimaryBranchItems({
  worktree,
  connectionId,
  enabled
}: {
  worktree: Worktree
  connectionId: string | null
  enabled: boolean
}) {
  const {
    actions,
    returnLabel,
    deleteLabel,
    forceNote,
    running,
    returnToDefault,
    deleteBranchAndReturn
  } = usePrimaryWorkspaceBranchCleanup({
    enabled,
    worktreeId: worktree.id,
    worktreePath: worktree.path,
    connectionId
  })
  if (!enabled || !actions.visible) {
    return null
  }
  const deleteTooltip = actions.deleteBranchAndReturn.disabledReason ?? forceNote
  return (
    <>
      <DropdownMenuSeparator />
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <DropdownMenuItem
              onSelect={returnToDefault}
              disabled={running || !actions.returnToDefault.enabled}
            >
              <Undo2 className="size-3.5" />
              {returnLabel}
            </DropdownMenuItem>
          </div>
        </TooltipTrigger>
        {actions.returnToDefault.disabledReason ? (
          <TooltipContent side="right" sideOffset={8} className="max-w-[220px] text-pretty">
            {actions.returnToDefault.disabledReason}
          </TooltipContent>
        ) : null}
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <DropdownMenuItem
              variant="destructive"
              onSelect={deleteBranchAndReturn}
              disabled={running || !actions.deleteBranchAndReturn.enabled}
            >
              <Trash2 className="size-3.5" />
              {deleteLabel}
            </DropdownMenuItem>
          </div>
        </TooltipTrigger>
        {deleteTooltip ? (
          <TooltipContent side="right" sideOffset={8} className="max-w-[220px] text-pretty">
            {deleteTooltip}
          </TooltipContent>
        ) : null}
      </Tooltip>
    </>
  )
}
