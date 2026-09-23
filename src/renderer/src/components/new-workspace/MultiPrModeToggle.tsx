import React, { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import { translate } from '@/i18n/i18n'

/** "Select multiple" switch that swaps the composer's name field for a PR checklist. */
export function MultiPrModeToggle({
  checked,
  onCheckedChange
}: {
  checked: boolean
  onCheckedChange?: (next: boolean) => void
}): React.JSX.Element {
  const id = useId()
  return (
    <div className="group flex shrink-0 items-center gap-2 text-xs">
      <Switch id={id} checked={checked} onCheckedChange={(next) => onCheckedChange?.(next)} />
      <label
        htmlFor={id}
        className="cursor-pointer text-muted-foreground transition-colors group-hover:text-foreground"
      >
        {translate('auto.components.NewWorkspaceComposerCard.multiPrToggle', 'Select multiple')}
      </label>
    </div>
  )
}
