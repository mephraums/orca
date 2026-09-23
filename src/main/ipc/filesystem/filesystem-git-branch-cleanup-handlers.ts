import { ipcMain } from 'electron'
import type { BranchReturnState } from '../../../shared/branch-return-state'
import { getBranchReturnStateViaExec } from '../../git/branch-return-state'
import { assertValidBranchName, checkoutBranch, deleteLocalBranch } from '../../git/checkout'
import { gitOptionsForWorktree } from '../../git/git-runtime-options'
import { gitExecFileAsync } from '../../git/runner'
import { getSshGitProvider } from '../../providers/ssh-git-dispatch'
import { resolveRegisteredWorktreePath } from '../registered-worktree-roots-cache'
import { getLocalGitOptionsForRegisteredWorktree } from '../local-worktree-runtime-options'
import type { FilesystemHandlerContext } from './filesystem-handler-context'

// Why (personal fork): backs the sidebar "return to default branch" and merged-PR branch cleanup actions.
export function registerFilesystemGitBranchCleanupHandlers(
  context: FilesystemHandlerContext
): void {
  const { store } = context

  ipcMain.handle(
    'git:branchReturnState',
    async (
      _event,
      args: { worktreePath: string; connectionId?: string }
    ): Promise<BranchReturnState> => {
      if (args.connectionId) {
        const provider = getSshGitProvider(args.connectionId)
        if (!provider) {
          throw new Error(`No git provider for connection "${args.connectionId}"`)
        }
        return getBranchReturnStateViaExec((argv) => provider.exec(argv, args.worktreePath))
      }
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const gitOptions = getLocalGitOptionsForRegisteredWorktree(
        store,
        args.worktreePath,
        worktreePath
      )
      return getBranchReturnStateViaExec((argv) =>
        gitExecFileAsync(argv, gitOptionsForWorktree(worktreePath, gitOptions))
      )
    }
  )

  ipcMain.handle(
    'git:checkoutBranch',
    async (
      _event,
      args: { worktreePath: string; branch: string; connectionId?: string }
    ): Promise<void> => {
      if (args.connectionId) {
        const provider = getSshGitProvider(args.connectionId)
        if (!provider) {
          throw new Error(`No git provider for connection "${args.connectionId}"`)
        }
        return provider.checkoutBranch(args.worktreePath, args.branch)
      }
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const gitOptions = getLocalGitOptionsForRegisteredWorktree(
        store,
        args.worktreePath,
        worktreePath
      )
      await checkoutBranch(worktreePath, args.branch, gitOptions)
    }
  )

  ipcMain.handle(
    'git:deleteBranch',
    async (
      _event,
      args: { worktreePath: string; branch: string; connectionId?: string; force?: boolean }
    ): Promise<void> => {
      if (args.connectionId) {
        const provider = getSshGitProvider(args.connectionId)
        if (!provider) {
          throw new Error(`No git provider for connection "${args.connectionId}"`)
        }
        // Why: `-d` refuses unmerged branches, matching the local path's safety.
        assertValidBranchName(args.branch)
        await provider.exec(['branch', args.force ? '-D' : '-d', args.branch], args.worktreePath)
        return
      }
      const worktreePath = await resolveRegisteredWorktreePath(args.worktreePath, store)
      const gitOptions = getLocalGitOptionsForRegisteredWorktree(
        store,
        args.worktreePath,
        worktreePath
      )
      await deleteLocalBranch(worktreePath, args.branch, gitOptions, { force: args.force ?? false })
    }
  )
}
