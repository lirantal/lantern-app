import { Link } from '@tanstack/react-router'
import { Card } from '~/components/ui/card'
import { SeverityBadge, StatusBadge, TypeBadge } from '~/components/badges'
import { itemRef } from '~/lib/constants'
import { fmtDate } from '~/lib/utils'

export type Row = {
  id: number
  title: string
  type: string
  severity: string
  status: string
  productName: string
  reporterName: string
  partnerName: string | null
  ownerName: string | null
  createdAt: Date | string | number
}

export function ItemTable({ rows, showPeople }: { rows: Row[]; showPeople: boolean }) {
  if (!rows.length)
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">Nothing here yet.</Card>
    )
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Severity</th>
            <th className="px-4 py-2">Status</th>
            {showPeople && <th className="px-4 py-2">Reporter / partner</th>}
            {showPeople && <th className="px-4 py-2">Owner</th>}
            <th className="px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/60">
              <td className="max-w-md px-4 py-2.5">
                <Link to="/items/$id" params={{ id: String(r.id) }} className="font-medium hover:underline">
                  <span className="mr-2 text-xs text-muted-foreground">{itemRef(r.id)}</span>
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-2.5">{r.productName}</td>
              <td className="px-4 py-2.5"><TypeBadge type={r.type} /></td>
              <td className="px-4 py-2.5"><SeverityBadge severity={r.severity} /></td>
              <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              {showPeople && (
                <td className="px-4 py-2.5">
                  {r.reporterName}
                  {r.partnerName && <span className="text-muted-foreground"> · {r.partnerName}</span>}
                </td>
              )}
              {showPeople && <td className="px-4 py-2.5">{r.ownerName ?? <span className="text-muted-foreground">Unassigned</span>}</td>}
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
