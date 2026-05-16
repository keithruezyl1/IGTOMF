export function TitleSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-soft rounded w-2/3" />
      <div className="h-4 bg-soft rounded w-5/6" />
    </div>
  );
}

export function IngredientsSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-5 bg-soft rounded w-1/3 mb-3" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-4 bg-soft rounded"
          style={{ width: `${65 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  );
}

export function StepsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 bg-soft rounded w-1/4 mb-3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-soft flex-shrink-0" />
          <div
            className="flex-1 h-4 bg-soft rounded"
            style={{ width: `${75 + (i % 4) * 5}%` }}
          />
        </div>
      ))}
    </div>
  );
}
