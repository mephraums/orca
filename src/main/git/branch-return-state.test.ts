import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getBranchReturnStateViaExec, type BranchStateExec } from './branch-return-state'

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function execIn(cwd: string): BranchStateExec {
  return async (args: string[]) => ({ stdout: git(cwd, args) })
}

function commit(dir: string, file: string, body: string, message: string): void {
  writeFileSync(path.join(dir, file), body)
  git(dir, ['add', '-A'])
  git(dir, ['commit', '-m', message])
}

let tmpDir: string
let origin: string
let clone: string

/**
 * A real remote plus a clone, so the state is read the way the app reads it:
 * against `origin/master` rather than a local branch.
 */
beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'orca-branch-return-state-'))
  origin = path.join(tmpDir, 'origin')
  clone = path.join(tmpDir, 'clone')
  git(tmpDir, ['init', '--bare', '-b', 'master', 'origin'])

  const seed = path.join(tmpDir, 'seed')
  git(tmpDir, ['clone', '--quiet', origin, 'seed'])
  git(seed, ['config', 'user.email', 'test@test.com'])
  git(seed, ['config', 'user.name', 'Test'])
  commit(seed, 'README.md', 'seed\n', 'init')
  git(seed, ['push', '--quiet', 'origin', 'master'])

  git(tmpDir, ['clone', '--quiet', origin, 'clone'])
  git(clone, ['config', 'user.email', 'test@test.com'])
  git(clone, ['config', 'user.name', 'Test'])
  git(clone, ['checkout', '--quiet', '-b', 'feature'])
  commit(clone, 'a.txt', 'one\n', 'feat: one')
  commit(clone, 'b.txt', 'two\n', 'feat: two')
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

/** Land `feature` on origin/master the way the given merge strategy would. */
function landFeature(strategy: 'merge' | 'squash'): void {
  const lander = path.join(tmpDir, 'lander')
  git(tmpDir, ['clone', '--quiet', origin, 'lander'])
  git(lander, ['config', 'user.email', 'test@test.com'])
  git(lander, ['config', 'user.name', 'Test'])
  git(lander, ['fetch', '--quiet', path.join(tmpDir, 'clone'), 'feature'])
  if (strategy === 'merge') {
    git(lander, ['merge', '--no-ff', '-m', 'Merge pull request #1', 'FETCH_HEAD'])
  } else {
    git(lander, ['merge', '--squash', 'FETCH_HEAD'])
    git(lander, ['commit', '-m', 'feat: one and two (#1)'])
  }
  git(lander, ['push', '--quiet', 'origin', 'master'])
  git(clone, ['fetch', '--quiet', 'origin'])
}

describe('getBranchReturnStateViaExec', () => {
  it('reports a merge-commit merge through ancestry', async () => {
    landFeature('merge')
    const state = await getBranchReturnStateViaExec(execIn(clone))
    expect(state.currentBranch).toBe('feature')
    expect(state.defaultBranch).toBe('master')
    expect(state.isMergedIntoDefault).toBe(true)
    expect(state.isSquashMergedIntoDefault).toBe(false)
    expect(state.unmergedCommits).toBe(0)
  })

  it('recognises a squash merge that ancestry cannot see', async () => {
    landFeature('squash')
    const state = await getBranchReturnStateViaExec(execIn(clone))
    // Why: the squash commit is a new object, so the branch's own commits are
    // still absent from master — this is the case `git branch -d` refuses.
    expect(state.isMergedIntoDefault).toBe(false)
    expect(state.unmergedCommits).toBe(2)
    expect(state.isSquashMergedIntoDefault).toBe(true)
  })

  it('recognises a squash merge even after master moves on', async () => {
    landFeature('squash')
    const other = path.join(tmpDir, 'other')
    git(tmpDir, ['clone', '--quiet', origin, 'other'])
    git(other, ['config', 'user.email', 'test@test.com'])
    git(other, ['config', 'user.name', 'Test'])
    commit(other, 'c.txt', 'unrelated\n', 'chore: unrelated')
    git(other, ['push', '--quiet', 'origin', 'master'])
    git(clone, ['fetch', '--quiet', 'origin'])

    const state = await getBranchReturnStateViaExec(execIn(clone))
    expect(state.isSquashMergedIntoDefault).toBe(true)
  })

  it('leaves genuinely unmerged work alone', async () => {
    const state = await getBranchReturnStateViaExec(execIn(clone))
    expect(state.isMergedIntoDefault).toBe(false)
    expect(state.isSquashMergedIntoDefault).toBe(false)
    expect(state.unmergedCommits).toBe(2)
  })

  it('reports a dirty tree', async () => {
    writeFileSync(path.join(clone, 'a.txt'), 'edited\n')
    const state = await getBranchReturnStateViaExec(execIn(clone))
    expect(state.isDirty).toBe(true)
  })

  it('offers nothing while the checkout sits on the default branch', async () => {
    git(clone, ['checkout', '--quiet', 'master'])
    const state = await getBranchReturnStateViaExec(execIn(clone))
    expect(state.currentBranch).toBe('master')
    expect(state.isMergedIntoDefault).toBe(false)
    expect(state.isSquashMergedIntoDefault).toBe(false)
  })
})
