import { describe, expect, it } from 'vitest'
import type { BranchReturnState } from '../../../../shared/branch-return-state'
import {
  describeDeleteBranchAndReturn,
  describeReturnToDefault,
  resolvePrimaryWorkspaceBranchActions
} from './primary-workspace-branch-actions'

function state(overrides: Partial<BranchReturnState> = {}): BranchReturnState {
  return {
    currentBranch: 'seo-rankings-report',
    defaultBranch: 'master',
    defaultCompareRef: 'origin/master',
    isDirty: false,
    isMergedIntoDefault: true,
    isUpstreamGone: true,
    unmergedCommits: 0,
    ...overrides
  }
}

describe('resolvePrimaryWorkspaceBranchActions', () => {
  it('offers both actions after a merged PR', () => {
    const actions = resolvePrimaryWorkspaceBranchActions(state())
    expect(actions.visible).toBe(true)
    expect(actions.returnToDefault.enabled).toBe(true)
    expect(actions.deleteBranchAndReturn.enabled).toBe(true)
  })

  it('hides the group when already on the default branch', () => {
    expect(resolvePrimaryWorkspaceBranchActions(state({ currentBranch: 'master' })).visible).toBe(
      false
    )
  })

  it('hides the group on a detached HEAD', () => {
    expect(resolvePrimaryWorkspaceBranchActions(state({ currentBranch: null })).visible).toBe(false)
  })

  it('hides the group when the default branch is unknown', () => {
    expect(resolvePrimaryWorkspaceBranchActions(state({ defaultBranch: null })).visible).toBe(false)
  })

  it('hides the group when no state has loaded yet', () => {
    expect(resolvePrimaryWorkspaceBranchActions(null).visible).toBe(false)
  })

  it('disables both actions when the tree is dirty', () => {
    const actions = resolvePrimaryWorkspaceBranchActions(state({ isDirty: true }))
    expect(actions.visible).toBe(true)
    expect(actions.returnToDefault.enabled).toBe(false)
    expect(actions.deleteBranchAndReturn.enabled).toBe(false)
    expect(actions.returnToDefault.disabledReason).toContain('stash')
  })

  it('allows returning but not deleting when commits are unmerged', () => {
    const actions = resolvePrimaryWorkspaceBranchActions(
      state({ isMergedIntoDefault: false, unmergedCommits: 3 })
    )
    expect(actions.returnToDefault.enabled).toBe(true)
    expect(actions.deleteBranchAndReturn.enabled).toBe(false)
    expect(actions.deleteBranchAndReturn.disabledReason).toBe(
      "'seo-rankings-report' has 3 unmerged commits not in master."
    )
  })

  it('singularizes a lone unmerged commit', () => {
    expect(
      resolvePrimaryWorkspaceBranchActions(
        state({ isMergedIntoDefault: false, unmergedCommits: 1 })
      ).deleteBranchAndReturn.disabledReason
    ).toContain('1 unmerged commit not in master')
  })

  it('still allows deleting a merged branch whose remote is still present', () => {
    expect(
      resolvePrimaryWorkspaceBranchActions(state({ isUpstreamGone: false })).deleteBranchAndReturn
        .enabled
    ).toBe(true)
  })
})

describe('menu labels', () => {
  it('names the branch and target in the destructive label', () => {
    expect(describeDeleteBranchAndReturn(state())).toBe(
      "Delete 'seo-rankings-report' & return to master"
    )
  })

  it('falls back to a generic label without state', () => {
    expect(describeDeleteBranchAndReturn(null)).toBe('Delete branch & return')
    expect(describeReturnToDefault(null)).toBe('Return to default branch')
  })

  it('names the default branch when known', () => {
    expect(describeReturnToDefault(state())).toBe('Return to master')
  })
})
