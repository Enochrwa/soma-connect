export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
      <div className="h-10 w-1/3 skeleton rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-64 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}