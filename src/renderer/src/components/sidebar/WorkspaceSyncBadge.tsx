import type { JSX } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { WorkspaceSyncIndicator } from '../../../../shared/workspace-sync-indicator'

/**
 * Ahead/behind position against the upstream. Behind is the louder half: it is
 * the state that silently breaks work, so it carries the amber tone.
 */
export function WorkspaceSyncBadge({
  indicator,
  className
}: {
  indicator: WorkspaceSyncIndicator
  className?: string
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={indicator.label}
          className={cn(
            'inline-flex h-[16px] shrink-0 items-center gap-1 rounded px-1 text-[10px] font-medium leading-none tabular-nums',
            'text-muted-foreground',
            className
          )}
        >
          {indicator.ahead > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <ArrowUp className="size-2.5" />
              {indicator.ahead}
            </span>
          ) : null}
          {indicator.behind > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <ArrowDown className="size-2.5" />
              {indicator.behind}
            </span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {indicator.label}
      </TooltipContent>
    </Tooltip>
  )
}
