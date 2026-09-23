import type { BranchReturnState } from '../../../shared/branch-return-state'
import { resolveLocalWorktreePath, type RuntimeGitContext } from './runtime-git-client-context'
import { callRuntimeRpc, getActiveRuntimeTarget } from './runtime-rpc-client'
import { toRuntimeWorktreeSelector } from './runtime-worktree-selector'

export async function getRuntimeGitBranchReturnState(
  context: RuntimeGitContext
): Promise<BranchReturnState> {
  const target = getActiveRuntimeTarget(context.settings)
  if (target.kind === 'local' || !context.worktreeId) {
    return window.api.git.branchReturnState({
      worktreePath: resolveLocalWorktreePath(context),
      connectionId: context.connectionId
    })
  }
  return callRuntimeRpc<BranchReturnState>(
    target,
    'git.branchReturnState',
    { worktree: toRuntimeWorktreeSelector(context.worktreeId) },
    { timeoutMs: 15_000 }
  )
}

export async function checkoutRuntimeGitBranch(
  context: RuntimeGitContext,
  branch: string
): Promise<void> {
  const target = getActiveRuntimeTarget(context.settings)
  if (target.kind === 'local' || !context.worktreeId) {
    await window.api.git.checkoutBranch({
      worktreePath: resolveLocalWorktreePath(context),
      branch,
      connectionId: context.connectionId
    })
    return
  }
  await callRuntimeRpc(
    target,
    'git.checkout',
    { worktree: toRuntimeWorktreeSelector(context.worktreeId), branch },
    { timeoutMs: 30_000 }
  )
}

export async function deleteRuntimeGitBranch(
  context: RuntimeGitContext,
  branch: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const force = options.force ?? false
  const target = getActiveRuntimeTarget(context.settings)
  if (target.kind === 'local' || !context.worktreeId) {
    await window.api.git.deleteBranch({
      worktreePath: resolveLocalWorktreePath(context),
      branch,
      connectionId: context.connectionId,
      force
    })
    return
  }
  await callRuntimeRpc(
    target,
    'git.deleteBranch',
    { worktree: toRuntimeWorktreeSelector(context.worktreeId), branch, force },
    { timeoutMs: 30_000 }
  )
}
