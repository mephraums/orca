// Why: behind-counts are computed against remote-tracking refs, so without a
// periodic fetch they read 0 forever and quietly claim "up to date". This module
// holds the scheduling decisions so the cadence is testable without timers.

export const DEFAULT_BACKGROUND_GIT_FETCH_INTERVAL_MINUTES = 5
const MIN_INTERVAL_MINUTES = 1
const MAX_INTERVAL_MINUTES = 120

export type BackgroundGitFetchSettings = {
  enabled: boolean
  intervalMinutes: number
}

export const DEFAULT_BACKGROUND_GIT_FETCH: BackgroundGitFetchSettings = {
  enabled: true,
  intervalMinutes: DEFAULT_BACKGROUND_GIT_FETCH_INTERVAL_MINUTES
}

export function resolveBackgroundGitFetchSettings(
  configured: Partial<BackgroundGitFetchSettings> | null | undefined
): BackgroundGitFetchSettings {
  const enabled = configured?.enabled ?? DEFAULT_BACKGROUND_GIT_FETCH.enabled
  const raw = configured?.intervalMinutes
  const intervalMinutes =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(raw)))
      : DEFAULT_BACKGROUND_GIT_FETCH.intervalMinutes
  return { enabled, intervalMinutes }
}

export function backgroundGitFetchIntervalMs(settings: BackgroundGitFetchSettings): number {
  return settings.intervalMinutes * 60_000
}

export type RepoFetchDecisionInput = {
  /** When this repo's last fetch attempt finished, successful or not. */
  lastAttemptedAt: number | null
  now: number
  intervalMs: number
  isWindowFocused: boolean
  isInFlight: boolean
  enabled: boolean
  /** SSH repos whose host is disconnected would throw on every tick. */
  isReachable: boolean
}

export function shouldFetchRepoNow(input: RepoFetchDecisionInput): boolean {
  if (!input.enabled || !input.isReachable || input.isInFlight) {
    return false
  }
  // Why: a background fetch behind an unfocused window is pure cost — nobody is
  // reading the counts, and SSH hosts pay a round-trip per repo per tick.
  if (!input.isWindowFocused) {
    return false
  }
  if (input.lastAttemptedAt === null) {
    return true
  }
  return input.now - input.lastAttemptedAt >= input.intervalMs
}
