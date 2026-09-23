import React from 'react'
import { translate } from '@/i18n/i18n'
import { MultiPrModeToggle } from './MultiPrModeToggle'
import type { NewWorkspaceComposerCardProps } from './new-workspace-composer-card-props'

/** Replaces the name section while multi-PR mode is on; the checklist comes from the modal. */
export function NewWorkspaceComposerMultiPrSection({
  multiPrMode = false,
  onMultiPrModeChange,
  multiPrList
}: Pick<
  NewWorkspaceComposerCardProps,
  'multiPrMode' | 'onMultiPrModeChange' | 'multiPrList'
>): React.JSX.Element {
  return (
    <div className="min-w-0 space-y-1" data-contextual-tour-target="workspace-creation-name">
      <div className="flex items-center justify-between gap-2">
        <label className="min-w-0 truncate text-xs font-medium text-muted-foreground">
          {translate('auto.components.NewWorkspaceComposerCard.multiPrLabel', 'Pull requests')}
        </label>
        <MultiPrModeToggle checked={multiPrMode} onCheckedChange={onMultiPrModeChange} />
      </div>
      {multiPrList}
    </div>
  )
}
