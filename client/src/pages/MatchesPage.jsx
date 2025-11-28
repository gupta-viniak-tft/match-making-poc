
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

export default function MatchesPage() {
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  useEffect(() => {
    const idFromQuery = searchParams.get("profileId");
    const id = profileId || idFromQuery || localStorage.getItem("lastProfileId");
    if (!id) {
      setError("Missing profile id. Please upload your profile first.");
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/profile/matches/${id}`);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to fetch matches");
        }
        const data = await res.json();
        setMatches(data);
      } catch (err) {
        setError(err.message || "Something went wrong fetching matches.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [profileId, searchParams, API_BASE]);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">
        Your Matches
      </h2>
      {loading && <p className="text-gray-600">Loading matches...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && matches.length === 0 && (
        <p className="text-gray-600">
          Once your profile is processed, we’ll show compatible profiles here.
        </p>
      )}

      <div className="mt-6 grid gap-4">
        {matches.map((match) => (
          <div key={match.profile_id} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
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
              </div>
              <span className="text-sm text-green-600 font-medium">
                {(match.score * 100).toFixed(0)}% compatible
              </span>
            </div>
            {match.looking_for && (
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-semibold text-gray-800">Looking for:</span>{" "}
                {match.looking_for}
              </p>
            )}
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
        ))}
      </div>
    </div>
  );
}
