import { useCallback } from 'react'
import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { Repo } from '../../../../shared/repo-types'
import type { Worktree } from '../../../../shared/worktree/types'
import { isGitRepoKind } from '../../../../shared/repo-kind'

// Why (personal fork): act on the background-fetched ahead/behind counts straight from the card.
export function WorktreeContextMenuGitSyncItems({
  worktree,
  repo,
  folderWorkspaceId,
  isDeleting
}: {
  worktree: Worktree
  repo: Repo | null | undefined
  folderWorkspaceId: string | null | undefined
  isDeleting: boolean
}) {
  const pullBranch = useAppStore((s) => s.pullBranch)
  const fetchBranch = useAppStore((s) => s.fetchBranch)
  // Why: only mounted while the menu is open, so this subscription can't churn closed rows.
  const isRemoteOperationActive = useAppStore((s) => s.isRemoteOperationActive)
  const connectionId = repo?.connectionId ?? undefined

  // Why: pullBranch/fetchBranch already toast their failures; swallow the rethrow
  // so a failed remote op doesn't surface as an unhandled rejection.
  const handlePullBranch = useCallback(() => {
    void pullBranch(worktree.id, worktree.path, connectionId, worktree.pushTarget).catch(
      () => undefined
    )
  }, [pullBranch, connectionId, worktree.id, worktree.path, worktree.pushTarget])

  const handleFetchBranch = useCallback(() => {
    void fetchBranch(worktree.id, worktree.path, connectionId, worktree.pushTarget).catch(
      () => undefined
    )
  }, [fetchBranch, connectionId, worktree.id, worktree.path, worktree.pushTarget])

  if (!repo || !isGitRepoKind(repo) || folderWorkspaceId) {
    return null
  }
  const disabled = isDeleting || isRemoteOperationActive
  return (
    <>
      <DropdownMenuSeparator />
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuItem onSelect={handlePullBranch} disabled={disabled}>
            <ArrowDownToLine className="size-3.5" />
            {translate('auto.components.sidebar.WorktreeContextMenu.gitPull', 'Pull')}
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="max-w-[200px] text-pretty">
          {translate(
            'auto.components.sidebar.WorktreeContextMenu.gitPullTooltip',
            'Pull the latest commits from the remote into this branch.'
          )}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuItem onSelect={handleFetchBranch} disabled={disabled}>
            <RefreshCw className="size-3.5" />
            {translate('auto.components.sidebar.WorktreeContextMenu.gitFetch', 'Fetch')}
          </DropdownMenuItem>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="max-w-[200px] text-pretty">
          {translate(
            'auto.components.sidebar.WorktreeContextMenu.gitFetchTooltip',
            'Fetch from the remote without merging and refresh the ahead/behind counts.'
          )}
        </TooltipContent>
      </Tooltip>
    </>
  )
}
