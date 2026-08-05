import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BACKGROUND_GIT_FETCH_INTERVAL_MINUTES,
  backgroundGitFetchIntervalMs,
  resolveBackgroundGitFetchSettings,
  shouldFetchRepoNow,
  type RepoFetchDecisionInput
} from './background-git-fetch-schedule'

function decision(overrides: Partial<RepoFetchDecisionInput> = {}): RepoFetchDecisionInput {
  return {
    lastAttemptedAt: null,
    now: 1_000_000,
    intervalMs: 300_000,
    isWindowFocused: true,
    isInFlight: false,
    enabled: true,
    isReachable: true,
    ...overrides
  }
}

describe('resolveBackgroundGitFetchSettings', () => {
  it('defaults to enabled on the standard interval', () => {
    expect(resolveBackgroundGitFetchSettings(undefined)).toEqual({
      enabled: true,
      intervalMinutes: DEFAULT_BACKGROUND_GIT_FETCH_INTERVAL_MINUTES
    })
  })

  it('honors an explicit opt-out', () => {
    expect(resolveBackgroundGitFetchSettings({ enabled: false }).enabled).toBe(false)
  })

  it('clamps absurd intervals instead of hammering or never firing', () => {
    expect(resolveBackgroundGitFetchSettings({ intervalMinutes: 0 }).intervalMinutes).toBe(1)
    expect(resolveBackgroundGitFetchSettings({ intervalMinutes: 10_000 }).intervalMinutes).toBe(120)
    expect(resolveBackgroundGitFetchSettings({ intervalMinutes: Number.NaN }).intervalMinutes).toBe(
      DEFAULT_BACKGROUND_GIT_FETCH_INTERVAL_MINUTES
    )
  })

  it('converts to milliseconds', () => {
    expect(backgroundGitFetchIntervalMs({ enabled: true, intervalMinutes: 5 })).toBe(300_000)
  })
})

describe('shouldFetchRepoNow', () => {
  it('fetches a repo that has never been fetched', () => {
    expect(shouldFetchRepoNow(decision())).toBe(true)
  })

  it('waits until the interval elapses', () => {
    expect(shouldFetchRepoNow(decision({ lastAttemptedAt: 800_000 }))).toBe(false)
    expect(shouldFetchRepoNow(decision({ lastAttemptedAt: 700_000 }))).toBe(true)
  })

  it('never fetches while the window is unfocused', () => {
    expect(shouldFetchRepoNow(decision({ isWindowFocused: false }))).toBe(false)
  })

  it('never overlaps an in-flight fetch', () => {
    expect(shouldFetchRepoNow(decision({ isInFlight: true }))).toBe(false)
  })

  it('respects the opt-out', () => {
    expect(shouldFetchRepoNow(decision({ enabled: false }))).toBe(false)
  })

  it('skips unreachable hosts so a disconnected SSH repo does not throw each tick', () => {
    expect(shouldFetchRepoNow(decision({ isReachable: false }))).toBe(false)
  })

  it('retries after a failed attempt only once the interval passes', () => {
    // Why: lastAttemptedAt is stamped on failure too, so a broken remote backs off.
    expect(shouldFetchRepoNow(decision({ lastAttemptedAt: 999_000 }))).toBe(false)
  })
})
