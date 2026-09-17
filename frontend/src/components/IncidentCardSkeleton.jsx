export default function IncidentCardSkeleton() {
  return (
    <div className="flex bg-paper border border-line animate-pulse">
      <div className="w-28 h-28 flex-shrink-0 bg-concrete-dark" />
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="h-2.5 w-20 bg-concrete-dark" />
            <div className="h-4 w-16 bg-concrete-dark" />
          </div>
          <div className="h-4 w-3/4 bg-concrete-dark mb-2" />
          <div className="h-3 w-1/2 bg-concrete-dark" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="h-2.5 w-16 bg-concrete-dark" />
          <div className="h-7 w-20 bg-concrete-dark" />
        </div>
      </div>
    </div>
  );
}
