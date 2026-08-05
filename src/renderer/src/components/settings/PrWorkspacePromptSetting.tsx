import { useEffect, useState } from 'react'
import type { GlobalSettings } from '../../../../shared/types'
import {
  DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE,
  PR_WORKSPACE_PROMPT_TOKENS,
  renderPrWorkspacePromptTemplate,
  resolvePrWorkspacePromptTemplate
} from '../../../../shared/pr-workspace-prompt'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { translate } from '@/i18n/i18n'

type PrWorkspacePromptSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void | Promise<void>
  forceVisible?: boolean
}

const PREVIEW_URL = 'https://github.com/acme/orca/pull/7835'
const PREVIEW_TITLE = 'Show setup-needed hosts in workspace run picker'

export function buildPrWorkspacePromptPreview(template: string): string {
  const trimmed = template.trim()
  if (!trimmed) {
    return PREVIEW_URL
  }
  return renderPrWorkspacePromptTemplate(trimmed, {
    prNumber: 7835,
    artifactUrl: PREVIEW_URL,
    prTitle: PREVIEW_TITLE
  })
}

export function PrWorkspacePromptSetting({
  settings,
  updateSettings,
  forceVisible = false
}: PrWorkspacePromptSettingProps): React.JSX.Element {
  const persisted = resolvePrWorkspacePromptTemplate({
    globalTemplate: settings.prWorkspacePromptTemplate
  })
  const [draft, setDraft] = useState(persisted)

  useEffect(() => {
    setDraft(persisted)
  }, [persisted])

  const commit = (): void => {
    if (draft === persisted) {
      return
    }
    void updateSettings({ prWorkspacePromptTemplate: draft.trim() })
  }

  return (
    <SearchableSetting
      title={translate(
        'auto.components.settings.PrWorkspacePromptSetting.title',
        'Pull request workspace prompt'
      )}
      description={translate(
        'auto.components.settings.PrWorkspacePromptSetting.description',
        'Prompt prefilled when a workspace is created from a pull request.'
      )}
      keywords={['pull request', 'pr', 'review', 'prompt', 'template', 'workspace', 'prefill']}
      forceVisible={forceVisible}
      className="space-y-3 py-2"
    >
      <div className="space-y-2">
        <Label htmlFor="pr-workspace-prompt-template">
          {translate('auto.components.settings.PrWorkspacePromptSetting.label', 'Prompt template')}
        </Label>
        <textarea
          id="pr-workspace-prompt-template"
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          spellCheck={false}
          placeholder={DEFAULT_PR_WORKSPACE_PROMPT_TEMPLATE}
          className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap gap-1.5">
          {PR_WORKSPACE_PROMPT_TOKENS.map((token) => (
            <button
              key={token.token}
              type="button"
              title={token.description}
              onClick={() =>
                setDraft(
                  (current) =>
                    `${current}${current && !current.endsWith(' ') ? ' ' : ''}${token.token}`
                )
              }
              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              {token.token}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {translate('auto.components.settings.PrWorkspacePromptSetting.preview', 'Preview:')}{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            {buildPrWorkspacePromptPreview(draft)}
          </code>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {translate(
            'auto.components.settings.PrWorkspacePromptSetting.hint',
            'Leave blank to prefill just the pull request URL. Individual projects can override this in Repository settings.'
          )}
        </p>
      </div>
    </SearchableSetting>
  )
}
