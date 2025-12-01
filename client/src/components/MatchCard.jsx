export default function MatchCard({ match, componentLabels, formatReason, showBaseScore = false }) {
  if (!match) return null;

  const name = match.canonical?.name || `Profile ${match.profile_id}`;
  const firstName = name?.split(" ")[0] || "This match";
  const showComponents = componentLabels && match.components;
  const overallReason = typeof formatReason === "function" ? formatReason(match) : null;
  const baseScoreValue = typeof match.base_score === "number" ? match.base_score : null;
  const baseScorePct =
    baseScoreValue !== null
      ? Math.max(0, Math.min(100, Math.round(baseScoreValue * 100)))
      : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900">
            {name}
          </h3>
          <p className="text-xs text-gray-500">
            {[
              match.canonical?.city,
              match.canonical?.state,
              match.canonical?.country,
            ]
              .filter(Boolean)
              .join(", ") || "Location not provided"}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs text-blue-700">
            {match.canonical?.education && (
              <span className="px-2 py-1 bg-blue-50 rounded-full">
                {match.canonical.education}
              </span>
            )}
            {match.canonical?.profession && (
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">
                {match.canonical.profession}
              </span>
            )}
            {match.canonical?.approx_age && (
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                Age: {match.canonical.approx_age}
              </span>
            )}
            {match.canonical?.height && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                Height: {match.canonical.height}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase text-gray-500 font-bold">Overall fit</span>
          <div className="text-xl font-semibold text-blue-700">
            {Math.round((match.score || 0) * 100)}%
          </div>
          {showBaseScore && baseScorePct !== null && (
            <div className="mt-1 text-xs text-gray-500">
              Base semantic match: <span className="font-semibold text-gray-800">{baseScorePct}%</span>
            </div>
          )}
        </div>
      </div>

      {overallReason && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mt-3">
          <p className="text-sm text-gray-800 font-semibold tracking-wide mb-1">Overall Compatibility</p>
          <p className="text-sm text-gray-800">{overallReason}</p>
        </div>
      )}

      {(match.who_am_i || match.looking_for) && (
        <div className="mt-3 space-y-2 w-full">
          {match.who_am_i && (
            <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
              <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                <span className="text-sm font-semibold text-gray-800">{`How ${firstName} describes themself?`}</span>
                <span className="text-gray-700 text-lg leading-none">⌄</span>
              </summary>
              <p className="bg-white px-3 py-3 text-sm text-gray-800">{match.who_am_i}</p>
            </details>
          )}
          {match.looking_for && (
            <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
              <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                <span className="text-sm font-semibold text-gray-800">{`What ${firstName} is looking for?`}</span>
                <span className="text-blue-700 text-lg leading-none">⌄</span>
              </summary>
              <p className="bg-white px-3 py-3 text-sm text-gray-800">{match.looking_for}</p>
            </details>
          )}
        </div>
      )}

      {showComponents && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-3">
            {Object.entries(componentLabels).map(([key, label]) => {
              const val = match.components?.[key] ?? null;
              if (val === null || val === undefined) return null;
              const pct = Math.max(0, Math.min(100, Math.round(val * 100)));
              const reasonMap = {
                pref_to_self: match.pref_to_self_reason,
                self_to_pref: match.self_to_pref_reason,
                distance: match.location_reason,
              };
              const reason = reasonMap[key] || "LLM rationale not provided.";
              const showLocationOpen = key === "distance" && Boolean(match.location_open);
              return (
                <div key={key} className="rounded-xl border border-gray-100 p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">{label}</span>
                            {showLocationOpen && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                                Location flexible
                              </span>
                            )}
                    </div>
                    <span className="text-sm font-semibold text-blue-700">{pct}%</span>
                  </div>
                  <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-blue-500"
                      style={{ width: `${pct}%` }}
                      aria-label={`${label} ${pct}%`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-snug">{reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
