export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="h-4 w-32 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="h-10 w-64 bg-white/5 rounded mb-4 animate-pulse" />
      <div className="h-4 w-96 bg-white/5 rounded mb-10 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
