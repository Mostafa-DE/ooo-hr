import { Badge } from '@/components/ui/badge'

type ConfigErrorPageProps = {
  missingKeys: readonly string[]
}

export function ConfigErrorPage({ missingKeys }: ConfigErrorPageProps) {
  return (
    <section className="space-y-4">
      <Badge variant="outline">Config</Badge>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Firebase config missing</h1>
        <p className="text-muted-foreground">
          Add the following Vite environment variables and restart the dev server.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
        <ul className="space-y-1">
          {missingKeys.map((key) => (
            <li key={key} className="font-mono">
              {key}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
