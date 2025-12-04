import { useMemo } from "react";

export default function MatchCard({
  match,
  componentLabels,
  formatReason,
  showBaseScore = false,
  seekerCanonical = null,
  canonicalMatch = null,
  canonicalLoading = false,
  canonicalError = "",
}) {
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
  const dynamicEntries = Object.entries(match.dynamic_features || {})
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") return null;
      const label = key
        .split("_")
        .map((part) => {
          const text = part.charAt(0).toUpperCase() + part.slice(1);
          return text === "Approx" ? "Age" : text;
        })
        .join(" ");
      return { key, label, value };
    })
    .filter(Boolean);
  const hiddenCanonicalFields = new Set(["name", "city", "country", "state", "religion"]);
  const canonicalKeys = Array.from(
    new Set([
      ...Object.keys(match.canonical || {}),
      ...Object.keys(seekerCanonical || {}),
    ])
  ).filter((key) => !hiddenCanonicalFields.has(key));

  canonicalKeys.sort((a, b) => {
    if (a === "approx_age") return -1;
    if (b === "approx_age") return 1;
    return a.localeCompare(b);
  });

  const canonicalRows = canonicalKeys
    .map((key) => {
      const seekerVal = seekerCanonical?.[key];
      const candidateVal = match.canonical?.[key];
      if (seekerVal == null && candidateVal == null) return null;
      const label = key
        .split("_")
        .map((part) => {
          const text = part.charAt(0).toUpperCase() + part.slice(1);
          return text === "Approx" ? "Age" : text;
        })
        .join(" ");
      return { key, label, seekerVal, candidateVal };
    })
    .filter(Boolean);

  const canonicalScoreMap = useMemo(() => {
    const map = {};
    (canonicalMatch?.fields || []).forEach((item) => {
      if (item?.field) map[item.field] = item;
    });
    return map;
  }, [canonicalMatch]);

  const showCanonicalScores = Boolean(canonicalLoading || canonicalMatch || canonicalError);

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
                  <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden relative">
                    <div
                      className="h-2 bg-blue-500 absolute left-0 top-0"
                      style={{ width: `${pct}%` }}
                      aria-label={`${label} ${pct}%`}
                    />
                    {showLocationOpen && pct < 100 && (
                      <div
                        className="h-2 bg-green-300 absolute top-0"
                        style={{ left: `${pct}%`, width: `${100 - pct}%` }}
                        aria-label="Additional flexibility on location"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-600 leading-snug">{reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {canonicalRows.length > 0 && (
        <div className="mt-3">
          <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
            <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
              <span className="text-sm font-semibold text-gray-800">Basic Details</span>
              <span className="text-blue-700 text-lg leading-none">⌄</span>
            </summary>
            <div className="bg-white px-3 py-3 space-y-3">
              <div className="hidden md:flex flex-wrap gap-3 justify-between items-end border-b border-gray-100 pb-2 text-[11px] uppercase tracking-wide text-gray-500">
                <div className="min-w-[120px]">Field</div>
                <div className="flex-1 min-w-[200px] text-gray-600">You</div>
                <div className="flex-1 min-w-[200px] text-gray-600">{firstName}</div>
                {showCanonicalScores && <div className="min-w-[120px] text-right text-gray-600">Match</div>}
              </div>
              {canonicalRows.map((row) => (
                <div key={row.key} className="border-b last:border-0 border-gray-100 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr_auto] gap-2 md:gap-3 items-start">
                    <div className="text-xs uppercase text-gray-500 tracking-wide">{row.label}</div>
                    <div className="text-xs text-gray-800 font-medium md:min-w-[180px] break-words">{row.seekerVal || "Not provided"}</div>
                    <div className="text-xs text-gray-800 font-medium md:min-w-[180px] break-words">{row.candidateVal || "Not provided"}</div>
                    {showCanonicalScores && (
                      <div className="flex justify-start md:justify-end">
                        {(() => {
                          const scoreInfo = canonicalScoreMap[row.key];
                          const pct =
                            scoreInfo && typeof scoreInfo.score === "number"
                              ? Math.round(Math.max(0, Math.min(1, scoreInfo.score)) * 100)
                              : null;
                          if (pct === null) return null;
                          return (
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] whitespace-nowrap">
                              {pct}% match
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {showCanonicalScores && canonicalScoreMap[row.key]?.reason && (
                    <p className="text-[11px] text-gray-600 leading-snug mt-1">
                      {canonicalScoreMap[row.key].reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {dynamicEntries.length > 0 && (
        <div className="mt-3">
          <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
            <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
              <span className="text-sm font-semibold text-gray-800">Other Information</span>
              <span className="text-blue-700 text-lg leading-none">⌄</span>
            </summary>
            <div className="bg-white px-3 py-3 space-y-2">
              {dynamicEntries.map((item) => (
                <div key={item.key} className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3 border-b last:border-0 border-gray-100 pb-2">
                  <span className="text-xs uppercase text-gray-500 tracking-wide sm:min-w-[140px]">{item.label}</span>
                  <span className="text-xs text-gray-800 font-medium break-words w-full">{String(item.value)}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
