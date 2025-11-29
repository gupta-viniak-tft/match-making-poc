import useLoadingStore from "../store/useLoadingStore";

export default function GlobalLoader() {
  const counter = useLoadingStore((s) => s.counter);
  if (counter <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      <div className="relative pointer-events-auto">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-200 opacity-60" />
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <div className="absolute inset-4 rounded-full bg-white shadow" />
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-blue-700 drop-shadow">
          loading...!
        </p>
      </div>
    </div>
  );
}
