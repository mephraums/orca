import type { PreloadApi } from '../../../../preload/api-types'
import { toRuntimeWorktreeSelector } from '../../runtime/runtime-worktree-selector'
import { callRuntimeResult } from './web-runtime-calls'
import { resolveRuntimeWorktreeByPath } from './web-runtime-worktree-catalog'

type WebGitBranchCleanupApi = Pick<
  NonNullable<PreloadApi['git']>,
  'branchReturnState' | 'checkoutBranch' | 'deleteBranch'
>

// Why (personal fork): web-client twins of the sidebar/merged-PR branch cleanup IPC.
export function createWebGitBranchCleanupApi(): WebGitBranchCleanupApi {
  return {
    branchReturnState: async ({ worktreePath }) => {
      const worktree = await resolveRuntimeWorktreeByPath(worktreePath)
      return callRuntimeResult('git.branchReturnState', {
        worktree: toRuntimeWorktreeSelector(worktree.id)
      })
    },
    checkoutBranch: async ({ worktreePath, branch }) => {
      const worktree = await resolveRuntimeWorktreeByPath(worktreePath)
      await callRuntimeResult('git.checkout', {
        worktree: toRuntimeWorktreeSelector(worktree.id),
        branch
      })
    },
    deleteBranch: async ({ worktreePath, branch, force }) => {
      const worktree = await resolveRuntimeWorktreeByPath(worktreePath)
      await callRuntimeResult('git.deleteBranch', {
        worktree: toRuntimeWorktreeSelector(worktree.id),
        branch,
        force: force ?? false
      })
    }
  }
}
