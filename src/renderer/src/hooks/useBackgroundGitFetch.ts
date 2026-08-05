import { useEffect } from 'react'
import { runBackgroundGitFetchTick } from '@/lib/background-git-fetch'

const TICK_INTERVAL_MS = 30_000

/**
 * Drive the periodic fetch that keeps sidebar ahead/behind counts truthful.
 * Ticks often and cheaply; `runBackgroundGitFetchTick` decides per repo whether
 * the configured interval has actually elapsed.
 */
export function useBackgroundGitFetch(): void {
  useEffect(() => {
    let disposed = false

    const tick = (): void => {
      if (disposed) {
        return
      }
      void runBackgroundGitFetchTick({
        now: Date.now(),
        isWindowFocused: document.hasFocus()
      })
    }

    // Why: refocusing is exactly when stale counts get looked at, so tick then
    // rather than waiting out the remainder of the interval.
    const onFocus = (): void => tick()
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(tick, TICK_INTERVAL_MS)
    tick()

    return () => {
      disposed = true
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [])
}
