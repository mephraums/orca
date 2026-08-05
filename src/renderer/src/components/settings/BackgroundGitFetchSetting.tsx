import type { JSX } from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import { resolveBackgroundGitFetchSettings } from '../../../../shared/background-git-fetch-schedule'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { translate } from '@/i18n/i18n'

const INTERVAL_CHOICES = [1, 5, 15, 30, 60] as const

export function BackgroundGitFetchSetting({
  settings,
  updateSettings,
  forceVisible = false
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  forceVisible?: boolean
}): JSX.Element {
  const resolved = resolveBackgroundGitFetchSettings(settings.backgroundGitFetch)

  return (
    <SearchableSetting
      title={translate(
        'auto.components.settings.BackgroundGitFetchSetting.title',
        'Background fetch'
      )}
      description={translate(
        'auto.components.settings.BackgroundGitFetchSetting.description',
        'Periodically fetch so workspace ahead/behind counts stay accurate.'
      )}
      keywords={['fetch', 'git', 'behind', 'ahead', 'sync', 'remote', 'background', 'sidebar']}
      forceVisible={forceVisible}
      className="space-y-3 py-2"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label>
            {translate(
              'auto.components.settings.BackgroundGitFetchSetting.title',
              'Background fetch'
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.BackgroundGitFetchSetting.help',
              'Without this, behind counts read zero even when the remote has moved. Runs only while the window is focused, and skips disconnected SSH hosts.'
            )}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={resolved.enabled}
          aria-label={translate(
            'auto.components.settings.BackgroundGitFetchSetting.title',
            'Background fetch'
          )}
          onClick={() =>
            void updateSettings({
              backgroundGitFetch: { ...resolved, enabled: !resolved.enabled }
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            resolved.enabled ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              resolved.enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {resolved.enabled ? (
        <div className="flex items-center gap-2">
          <Label htmlFor="background-git-fetch-interval" className="text-xs">
            {translate('auto.components.settings.BackgroundGitFetchSetting.every', 'Every')}
          </Label>
          <select
            id="background-git-fetch-interval"
            value={resolved.intervalMinutes}
            onChange={(event) =>
              void updateSettings({
                backgroundGitFetch: {
                  ...resolved,
                  intervalMinutes: Number.parseInt(event.target.value, 10)
                }
              })
            }
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {INTERVAL_CHOICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 1
                  ? translate(
                      'auto.components.settings.BackgroundGitFetchSetting.oneMinute',
                      '1 minute'
                    )
                  : translate(
                      'auto.components.settings.BackgroundGitFetchSetting.manyMinutes',
                      'minutes',
                      { minutes }
                    )}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </SearchableSetting>
  )
}
