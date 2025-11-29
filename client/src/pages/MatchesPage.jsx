
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useMatchStore from "../store/useMatchStore";
import useLoadingStore from "../store/useLoadingStore";

export default function MatchesPage() {
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const resolvedId = profileId || searchParams.get("profileId") || localStorage.getItem("lastProfileId");
  const {
    profiles: cachedProfiles,
    matches: cachedMatches,
    setProfile: cacheProfile,
    setMatches: cacheMatches,
    clearMatches,
  } = useMatchStore();
  const { start, stop } = useLoadingStore();
  const fetchedRef = useRef({});

  useEffect(() => {
    // Clear local view on profile change before fetching new data
    setSeeker(null);
    setMatches([]);
    setError("");
    fetchedRef.current[resolvedId] = false;
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) {
      setError("Missing profile id. Please upload your profile first.");
      return;
    }
    if (cachedProfiles[resolvedId]) {
      setSeeker(cachedProfiles[resolvedId]);
    }
    if (cachedMatches[resolvedId]) {
      setMatches(cachedMatches[resolvedId]);
    }
  }, [resolvedId, cachedProfiles, cachedMatches]);

  useEffect(() => {
    if (!resolvedId) return;
    if (cachedProfiles[resolvedId] && cachedMatches[resolvedId]) {
      fetchedRef.current[resolvedId] = true;
      return;
    }
    if (fetchedRef.current[resolvedId]) return;
    fetchedRef.current[resolvedId] = true;
    const fetchProfileAndMatches = async () => {
      setLoading(true);
      start();
      setError("");
      setMatches([]); // clear local view
      clearMatches(resolvedId); // clear cache for this id
      try {
        const [profileRes, matchesRes] = await Promise.all([
          fetch(`${API_BASE}/profile/${resolvedId}`),
          fetch(`${API_BASE}/profile/matches/${resolvedId}`),
        ]);

        if (!profileRes.ok) {
          const msg = await profileRes.text();
          throw new Error(msg || "Failed to fetch your profile");
        }
        if (!matchesRes.ok) {
          const msg = await matchesRes.text();
          throw new Error(msg || "Failed to fetch matches");
        }

        const profileData = await profileRes.json();
        const matchesData = await matchesRes.json();

        setSeeker(profileData);
        setMatches(matchesData);
        cacheProfile(resolvedId, profileData);
        cacheMatches(resolvedId, matchesData);
      } catch (err) {
        setError(err.message || "Something went wrong fetching matches.");
        fetchedRef.current[resolvedId] = false;
      } finally {
        setLoading(false);
        stop();
      }
    };

    fetchProfileAndMatches();
  }, [resolvedId, API_BASE, cacheProfile, cacheMatches, clearMatches, start, stop]);

  const handleRerank = () => {
    if (!resolvedId) {
      setError("Missing profile id. Please upload your profile first.");
      return;
    }
    navigate(`/matches/ai/${resolvedId}`);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 space-y-6 pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-blue-700 font-semibold">Semantic Matches</h2>
          <p className="text-sm text-gray-600">
            Based on your profile and preferences.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRerank}
          disabled={loading || matches.length === 0}
          className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white shadow-sm cursor-pointer hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          View AI Based Analysis!
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
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && matches.length === 0 && (
        <p className="text-gray-600">
          Once your profile is processed, we’ll show compatible profiles here.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:gap-5">
        {matches.map((match) => (
          <div key={match.profile_id} className="bg-white rounded-xl shadow p-4 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">
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
              <span className="text-sm text-green-600 font-medium">
                {(match.score * 100).toFixed(0)}% compatible
              </span>
            </div>

            {(match.who_am_i || match.looking_for) && (
              <div className="mt-3 space-y-2 w-full">
                {match.who_am_i && (
                  <details className="text-sm text-gray-700 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
                    <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                      <span className="text-sm font-semibold text-gray-800">{`How ${match.canonical?.name?.split(' ')[0]} describes themself?`}</span>
                      <span className="text-gray-700 text-lg leading-none">⌄</span>
                    </summary>
                    <p className="bg-white px-3 py-3 text-gray-800">{match.who_am_i}</p>
                  </details>
                )}
                {match.looking_for && (
                  <details className="text-sm text-gray-700 border border-gray-100 rounded-lg shadow-sm overflow-hidden w-full">
                    <summary className="cursor-pointer select-none flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 w-full">
                      <span className="text-sm font-semibold text-gray-800">{`What ${match.canonical?.name?.split(' ')[0]} is looking for?`}</span>
                      <span className="text-gray-700 text-lg leading-none">⌄</span>
                    </summary>
                    <p className="bg-white px-3 py-3 text-gray-800">{match.looking_for}</p>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
