import { cn } from '~/lib/utils'
import { SEVERITY_LABEL, STATUS_LABEL, TYPE_LABEL, type ItemType, type Severity, type Status } from '~/lib/constants'

const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'

const statusTone: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200',
  needs_info: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  triaged: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  in_progress: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200',
  shipped: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  declined: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  duplicate: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
}
const sevTone: Record<Severity, string> = {
  low: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  medium: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
}

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn(base, statusTone[status as Status] ?? statusTone.new)}>{STATUS_LABEL[status as Status] ?? status}</span>
)
export const SeverityBadge = ({ severity }: { severity: string }) => (
  <span className={cn(base, sevTone[severity as Severity])}>{SEVERITY_LABEL[severity as Severity] ?? severity}</span>
)
export const TypeBadge = ({ type }: { type: string }) => (
  <span className={cn(base, 'border border-border text-muted-foreground')}>{TYPE_LABEL[type as ItemType] ?? type}</span>
)
