export function LieuCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card animate-pulse">
      {/* Photo placeholder */}
      <div className="h-40 rounded-t-2xl bg-muted" />

      {/* Content */}
      <div className="space-y-2.5 p-4">
        {/* Music tags */}
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>

        {/* Title */}
        <div className="h-5 w-3/4 rounded bg-muted" />

        {/* Rating + Price */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-10 rounded bg-muted" />
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded bg-muted" />
          <div className="h-3.5 w-32 rounded bg-muted" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function LieuCardSkeletonGrid({ count = 6 }: { readonly count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <LieuCardSkeleton key={i} />
      ))}
    </div>
  );
}
