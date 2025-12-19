import { Badge } from '@/components/ui/badge'

type PagePlaceholderProps = {
  title: string
  description: string
  badge: string
}

export function PagePlaceholder({
  title,
  description,
  badge,
}: PagePlaceholderProps) {
  return (
    <section className="space-y-3">
      <Badge variant="outline">{badge}</Badge>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </section>
  )
}
