export function EventCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card animate-pulse">
      {/* Image placeholder */}
      <div className="h-40 rounded-t-2xl bg-muted" />

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Artist */}
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded bg-muted" />
          <div className="h-3.5 w-28 rounded bg-muted" />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-muted" />
            <div className="h-3.5 w-20 rounded bg-muted" />
          </div>
          {/* Time */}
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-muted" />
            <div className="h-3.5 w-24 rounded bg-muted" />
          </div>
          {/* Venue */}
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-muted" />
            <div className="h-3.5 w-32 rounded bg-muted" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>

        {/* Price + link */}
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeletonGrid({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
