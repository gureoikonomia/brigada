export default function IncidentDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-3 w-32 bg-concrete-dark mb-4" />

      <div className="bg-paper border border-line">
        <div className="w-full h-64 bg-concrete-dark" />

        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-3 w-24 bg-concrete-dark" />
            <div className="h-4 w-20 bg-concrete-dark" />
          </div>
          <div className="h-8 w-2/3 bg-concrete-dark mb-3" />
          <div className="h-3 w-1/2 bg-concrete-dark mb-6" />
          <div className="space-y-2 mb-6">
            <div className="h-3 w-full bg-concrete-dark" />
            <div className="h-3 w-full bg-concrete-dark" />
            <div className="h-3 w-2/3 bg-concrete-dark" />
          </div>
          <div className="h-9 w-32 bg-concrete-dark" />
        </div>
      </div>
    </div>
  );
}
