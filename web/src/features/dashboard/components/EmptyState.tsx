export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 py-12">
      <div className="text-gray-400">No data yet</div>
      <div className="mt-1 text-sm text-gray-400">Send some traces to see metrics</div>
    </div>
  );
}
