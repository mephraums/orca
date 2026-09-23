import type { BranchReturnState } from '../../shared/branch-return-state'
import { getBranchReturnStateViaExec } from '../git/branch-return-state'
import { assertValidBranchName, deleteLocalBranch } from '../git/checkout'
import { gitOptionsForWorktree } from '../git/git-runtime-options'
import { gitExecFileAsync } from '../git/runner'
import {
  localGitOptionsForTarget,
  requireRuntimeGitProvider,
  type RuntimeGitCommandHost
} from './runtime-git-command-target'

export class RuntimeGitBranchCleanupCommands {
  constructor(private readonly host: RuntimeGitCommandHost) {}

  async getRuntimeGitBranchReturnState(worktreeSelector: string): Promise<BranchReturnState> {
    const target = await this.host.resolveRuntimeGitTarget(worktreeSelector)
    const provider = requireRuntimeGitProvider(target)
    if (provider) {
      return getBranchReturnStateViaExec((argv) => provider.exec(argv, target.worktree.path))
    }
    return getBranchReturnStateViaExec((argv) =>
      gitExecFileAsync(
        argv,
        gitOptionsForWorktree(target.worktree.path, localGitOptionsForTarget(target))
      )
    )
  }

  async deleteRuntimeGitBranch(
    worktreeSelector: string,
    branch: string,
    force = false
  ): Promise<{ ok: true; branch: string }> {
    const target = await this.host.resolveRuntimeGitTarget(worktreeSelector)
    const provider = requireRuntimeGitProvider(target)
    if (provider) {
      assertValidBranchName(branch)
      await provider.exec(['branch', force ? '-D' : '-d', branch], target.worktree.path)
      return { ok: true, branch }
    }
    await deleteLocalBranch(target.worktree.path, branch, localGitOptionsForTarget(target), {
      force
    })
    return { ok: true, branch }
  }
}
