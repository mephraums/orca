import { useAppStore } from '@/store'
import { resolvePrWorkspacePromptTemplate } from '../../../shared/pr-workspace-prompt'
import type { GlobalSettings, Repo } from '../../../shared/types'

/** Effective PR prefill template: per-repo override first, then the global default. */
export function getPrWorkspacePromptTemplate(args: {
  settings?: Pick<GlobalSettings, 'prWorkspacePromptTemplate'> | null
  repo?: Pick<Repo, 'prWorkspacePromptTemplate'> | null
}): string {
  return resolvePrWorkspacePromptTemplate({
    globalTemplate: args.settings?.prWorkspacePromptTemplate,
    repoTemplate: args.repo?.prWorkspacePromptTemplate
  })
}

/** Store-backed lookup for launch paths that only carry a repo id. */
export function getPrWorkspacePromptTemplateForRepo(repoId: string | null | undefined): string {
  const state = useAppStore.getState()
  return getPrWorkspacePromptTemplate({
    settings: state.settings,
    repo: repoId ? (state.repos.find((repo) => repo.id === repoId) ?? null) : null
  })
}
