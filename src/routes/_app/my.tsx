import { Link, createFileRoute } from '@tanstack/react-router'
import { listItems } from '~/server/api'
import { ItemTable } from '~/components/item-table'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/_app/my')({
  loader: () => listItems({ data: {} }),
  // Triagers/admins use /items for the full queue; this page is always "mine".
  component: MySubmissions,
})

function MySubmissions() {
  const rows = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const mine = rows.filter((r) => r.reporterId === user.id)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My submissions</h1>
          <p className="text-sm text-muted-foreground">Track what happened to the feedback you sent.</p>
        </div>
        <Button asChild><Link to="/submit">Submit feedback</Link></Button>
      </div>
      <ItemTable rows={mine} showPeople={false} />
    </div>
  )
}
