interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
}

export default function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl',
  };

  return (
    <div
      className={`skeleton-shimmer bg-gray-200 dark:bg-gray-800 ${variantClasses[variant]} ${className || ''}`}
      style={{ width, height }}
    />
  );
}

// Skeletons prédéfinis pour les sections courantes
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} variant="card" className="h-24" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3 flex gap-3 border-t border-gray-100 dark:border-gray-800">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}