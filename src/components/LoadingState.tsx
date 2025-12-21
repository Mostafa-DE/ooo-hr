import { cn } from '@/lib/utils'

type LoadingStateProps = {
  title?: string
  description?: string
  variant?: 'page' | 'inline'
  className?: string
}

export function LoadingState({
  title = 'Loading',
  description = 'Please wait a moment.',
  variant = 'page',
  className,
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-muted-foreground/30" />
          <span className="absolute inset-0 rounded-full border-2 border-primary/70 border-t-transparent animate-spin" />
        </span>
        <span>{title}</span>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'min-h-[60vh] w-full items-center justify-center text-center sm:text-left',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border bg-card/60 px-8 py-10 shadow-sm">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
          <div className="absolute inset-[3px] rounded-[20px] bg-card" />
          <div className="absolute inset-3 rounded-2xl border border-primary/25" />
          <div className="absolute inset-3 rounded-2xl border-[3px] border-primary/70 border-t-transparent animate-spin" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-base text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  )
}
