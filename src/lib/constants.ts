export const ROLES = ['contributor', 'triager', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const ITEM_TYPES = ['bug', 'friction', 'feature', 'question'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITIES)[number]

export const STATUSES = ['new', 'needs_info', 'triaged', 'in_progress', 'shipped', 'declined', 'duplicate'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  needs_info: 'Needs info',
  triaged: 'Triaged',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: "Won't do",
  duplicate: 'Duplicate',
}

export const TYPE_LABEL: Record<ItemType, string> = {
  bug: 'Bug',
  friction: 'Friction',
  feature: 'Feature request',
  question: 'Question',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export const ROLE_LABEL: Record<Role, string> = {
  contributor: 'Contributor',
  triager: 'Triager',
  admin: 'Admin',
}

export const canTriage = (role: string | null | undefined) => role === 'triager' || role === 'admin'
export const isAdmin = (role: string | null | undefined) => role === 'admin'
export const itemRef = (id: number) => `LAN-${id}`
