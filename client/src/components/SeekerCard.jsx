export default function SeekerCard({ seeker }) {
  if (!seeker) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white shadow-sm p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {seeker.canonical?.name || "Your profile"}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-800">
        <div>
          <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Age</p>
          <p className="mt-1">{seeker.canonical?.approx_age ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-blue-700 uppercase tracking-wide font-semibold">Location</p>
          <p className="mt-1">
            {[
              seeker.canonical?.city,
              seeker.canonical?.state,
              seeker.canonical?.country,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-xs text-blue-700">
        {seeker.canonical?.education && (
          <span className="px-2 py-1 bg-blue-50 rounded-full">
            {seeker.canonical.education}
          </span>
        )}
        {seeker.canonical?.profession && (
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
            {seeker.canonical.profession}
          </span>
        )}
        {seeker.canonical?.approx_age && (
          <span className="px-2 py-1 bg-gray-100 rounded-full">
            Age: {seeker.canonical.approx_age}
          </span>
        )}
        {seeker.canonical?.height && (
          <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
            Height: {seeker.canonical.height}
          </span>
        )}
      </div>
      {(seeker.who_am_i || seeker.looking_for) && (
        <div className="mt-3 space-y-2 w-full">
          {seeker.who_am_i && (
            <details className="text-sm text-gray-800 border border-blue-100 rounded-lg shadow-sm overflow-hidden w-full">
              <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-white hover:bg-blue-50 w-full">
                <span className="text-sm font-semibold text-gray-800">Your self</span>
                <span className="text-blue-700 text-lg leading-none">⌄</span>
              </summary>
              <p className="bg-white px-3 py-3 text-sm text-gray-800">{seeker.who_am_i}</p>
            </details>
          )}
          {seeker.looking_for && (
            <details className="text-sm text-gray-800 border border-blue-100 rounded-lg shadow-sm overflow-hidden w-full">
              <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-white hover:bg-blue-50 w-full">
                <span className="text-sm font-semibold text-gray-800">Your preferences</span>
                <span className="text-blue-700 text-lg leading-none">⌄</span>
              </summary>
              <p className="bg-white px-3 py-3 text-sm text-gray-800">{seeker.looking_for}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
