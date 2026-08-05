import { getLaunchableWorkItemDraftContent } from '@/lib/linked-work-item-context'
import { getPrWorkspacePromptTemplateForRepo } from '@/lib/pr-workspace-prompt-template'
import type { LaunchableWorkItem } from '@/lib/launch-work-item-direct-types'

export async function getDirectWorkItemDraftContent(
  item: LaunchableWorkItem,
  _repoConnectionId: string | null,
  repoId?: string | null
): Promise<string> {
  return getLaunchableWorkItemDraftContent(item, {
    prPromptTemplate: getPrWorkspacePromptTemplateForRepo(repoId ?? item.repoId)
  })
}
