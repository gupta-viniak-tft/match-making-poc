import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useMatchStore from "../store/useMatchStore";
import useLoadingStore from "../store/useLoadingStore";

export default function RerankMatchesPage() {
  const { profileId: profileIdFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seeker, setSeeker] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const resolvedId = profileIdFromPath || searchParams.get("profileId") || localStorage.getItem("lastProfileId");
  const {
    profiles: cachedProfiles,
    reranks: cachedReranks,
    setProfile: cacheProfile,
    setRerank: cacheRerank,
    clearRerank,
  } = useMatchStore();
  const { start, stop } = useLoadingStore();
  const fetchedRef = useRef({});

  useEffect(() => {
    // Clear local view on profile change before fetching new data
    setSeeker(null);
    setResults([]);
    setError("");
    fetchedRef.current[resolvedId] = false;
  }, [resolvedId]);

  const componentLabels = {
    pref_to_self: "How well they fit what you want",
    self_to_pref: "How well you fit what they want",
    distance: "Location proximity",
  };
  const blurClass = loading ? "filter blur-sm pointer-events-none select-none" : "";

  const formatReason = (match) => {
    if (match.reason) return match.reason;
    const comps = match.components || {};
    const strong = Object.entries(comps)
      .filter(([k, v]) => componentLabels[k] && v >= 0.5)
      .map(([k]) => componentLabels[k] || k);
    if (strong.length === 0) return "Compatibility driven by a mix of signals.";
    return `Good alignment on: ${strong.join(", ")}.`;
  };

  useEffect(() => {
    if (!resolvedId) {
      setError("Missing profile id. Please upload your profile first.");
      return;
    }
    if (cachedProfiles[resolvedId]) {
      setSeeker(cachedProfiles[resolvedId]);
    }
    if (cachedReranks[resolvedId]) {
      setResults(cachedReranks[resolvedId]);
    }
  }, [resolvedId, cachedProfiles, cachedReranks]);

  useEffect(() => {
    if (!resolvedId) return;
    if (cachedProfiles[resolvedId] && cachedReranks[resolvedId]) {
      fetchedRef.current[resolvedId] = true;
      return;
    }
    if (fetchedRef.current[resolvedId]) return;
    fetchedRef.current[resolvedId] = true;
    const fetchProfileAndRerank = async () => {
      setLoading(true);
      start();
      setError("");
      setResults([]); // clear local view
      clearRerank(resolvedId); // clear cache for this id
      try {
        const [profileRes, rerankRes] = await Promise.all([
          fetch(`${API_BASE}/profile/${resolvedId}`),
          fetch(`${API_BASE}/profile/matches/ai/${resolvedId}`),
        ]);

        if (!profileRes.ok) {
          const msg = await profileRes.text();
          throw new Error(msg || "Failed to fetch your profile");
        }
        if (!rerankRes.ok) {
          const msg = await rerankRes.text();
          throw new Error(msg || "Failed to fetch reranked matches");
        }

        const profileData = await profileRes.json();
        const rerankData = await rerankRes.json();

        setSeeker(profileData);
        setResults(rerankData);
        cacheProfile(resolvedId, profileData);
        cacheRerank(resolvedId, rerankData);
      } catch (err) {
        setError(err.message || "Something went wrong fetching reranked matches.");
        fetchedRef.current[resolvedId] = false;
      } finally {
        setLoading(false);
        stop();
      }
    };

    fetchProfileAndRerank();
  }, [resolvedId, API_BASE, cacheProfile, cacheRerank, clearRerank, start, stop]);

  const goBackToMatches = () => {
    if (resolvedId) {
      navigate(`/matches/${resolvedId}`);
    } else {
      navigate("/upload");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 space-y-6 pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-blue-700 font-semibold">AI Based Analysis And Matching</h2>
          <p className="text-sm text-gray-600">
            Curated by AI with detailed alignment on preferences, self, and location.
          </p>
        </div>
        <button
          type="button"
          onClick={goBackToMatches}
          className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white cursor-pointer shadow-sm hover:bg-gray-50"
        >
          See semantic matches only!
        </button>
      </div>

      {seeker && (
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
      )}

      {loading && (
        <div className="text-center text-sm text-gray-600">Analysis in progress...</div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="text-gray-600">No matches to analyse yet.</p>
      )}

      <div className={`grid gap-5 ${blurClass}`}>
        {results.map((match) => (
          <div
            key={match.profile_id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
          >
            <div className="flex items-start justify-between gap-4 space-y-2 ">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900">
                  {match.canonical?.name || `Profile ${match.profile_id}`}
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
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
              <p className="text-sm text-gray-800 font-semibold tracking-wide mb-1">Overall Compatibility</p>
              <p className="text-sm text-gray-800">{formatReason(match)}</p>
            </div>

            {(match.who_am_i || match.looking_for) && (
              <div className="mt-3 space-y-2 w-full">
                {match.who_am_i && (
                  <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
                    <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                      <span className="text-sm font-semibold text-gray-800">{`How ${match.canonical?.name?.split(' ')[0]} describes themself?`}</span>
                      <span className="text-gray-700 text-lg leading-none">⌄</span>
                    </summary>
                    <p className="bg-white px-3 py-3 text-sm text-gray-800">{match.who_am_i}</p>
                  </details>
                )}
                {match.looking_for && (
                  <details className="text-sm text-gray-800 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
                    <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                      <span className="text-sm font-semibold text-gray-800">{`What ${match.canonical?.name?.split(' ')[0]} is looking for?`}</span>
                      <span className="text-blue-700 text-lg leading-none">⌄</span>
                    </summary>
                    <p className="bg-white px-3 py-3 text-sm text-gray-800">{match.looking_for}</p>
                  </details>
                )}
              </div>
            )}

            <div className="mt-3 space-y-2">
              {match.components && (
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
                    const showLocationOpen =
                      key === "distance" && Boolean(match.location_open);
                    return (
                      <div key={key} className="rounded-xl border border-gray-100 p-3 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">{label}</span>
                            {showLocationOpen && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                                Open to any location
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
              )}
            </div>


          </div>
        ))}
      </div>
    </div>
  );
}
