import { useEffect, useState } from 'react'
import type { GlobalSettings, Repo } from '../../../../shared/types'
import {
  PR_WORKSPACE_PROMPT_TOKENS,
  resolvePrWorkspacePromptTemplate
} from '../../../../shared/pr-workspace-prompt'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { buildPrWorkspacePromptPreview } from './PrWorkspacePromptSetting'
import { translate } from '@/i18n/i18n'

type RepositoryPrWorkspacePromptSectionProps = {
  repo: Repo
  settings: Pick<GlobalSettings, 'prWorkspacePromptTemplate'> | null
  updateRepo: (repoId: string, updates: Pick<Repo, 'prWorkspacePromptTemplate'>) => void
  forceVisible: boolean
}

export function RepositoryPrWorkspacePromptSection({
  repo,
  settings,
  updateRepo,
  forceVisible
}: RepositoryPrWorkspacePromptSectionProps): React.JSX.Element {
  const persisted = repo.prWorkspacePromptTemplate ?? ''
  const [draft, setDraft] = useState(persisted)

  useEffect(() => {
    setDraft(persisted)
  }, [persisted])

  const inheritedTemplate = resolvePrWorkspacePromptTemplate({
    globalTemplate: settings?.prWorkspacePromptTemplate
  })
  const effectiveTemplate = draft.trim() || inheritedTemplate

  const commit = (): void => {
    if (draft.trim() === persisted.trim()) {
      return
    }
    updateRepo(repo.id, { prWorkspacePromptTemplate: draft.trim() })
  }

  return (
    <SearchableSetting
      title={translate(
        'auto.components.settings.RepositoryPrWorkspacePromptSection.title',
        'Pull Request Workspace Prompt'
      )}
      description={translate(
        'auto.components.settings.RepositoryPrWorkspacePromptSection.description',
        'Project override for the prompt prefilled from a pull request.'
      )}
      keywords={[repo.displayName, 'pull request', 'pr', 'review', 'prompt', 'template', 'prefill']}
      className="space-y-3"
      forceVisible={forceVisible}
    >
      <Label className="text-sm font-semibold" htmlFor={`pr-workspace-prompt-${repo.id}`}>
        {translate(
          'auto.components.settings.RepositoryPrWorkspacePromptSection.title',
          'Pull Request Workspace Prompt'
        )}
      </Label>
      <textarea
        id={`pr-workspace-prompt-${repo.id}`}
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        spellCheck={false}
        placeholder={inheritedTemplate}
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
        {translate(
          'auto.components.settings.RepositoryPrWorkspacePromptSection.preview',
          'Preview:'
        )}{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {buildPrWorkspacePromptPreview(effectiveTemplate)}
        </code>
      </p>
      <p className="text-[11px] text-muted-foreground">
        {draft.trim()
          ? translate(
              'auto.components.settings.RepositoryPrWorkspacePromptSection.overridden',
              'Overriding the global template for this project.'
            )
          : translate(
              'auto.components.settings.RepositoryPrWorkspacePromptSection.inherited',
              'Leave blank to inherit the global template from Settings.'
            )}
      </p>
    </SearchableSetting>
  )
}
