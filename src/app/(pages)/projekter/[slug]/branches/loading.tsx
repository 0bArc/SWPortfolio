export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="h-3 w-48 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="h-8 w-40 bg-white/5 rounded mb-10 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass p-3 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
