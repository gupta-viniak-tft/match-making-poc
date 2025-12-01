
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useMatchStore from "../store/useMatchStore";
import useLoadingStore from "../store/useLoadingStore";
import SeekerCard from "../components/SeekerCard";
import MatchCard from "../components/MatchCard";

export default function MatchesPage() {
  const { profileId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
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
  }, [resolvedId, API_BASE, cacheProfile, cacheMatches, clearMatches, start, stop, refreshTick]);

  const handleRerank = () => {
    if (!resolvedId) {
      setError("Missing profile id. Please upload your profile first.");
      return;
    }
    navigate(`/matches/ai/${resolvedId}`);
  };

  const handleRefresh = () => {
    if (!resolvedId) return;
    fetchedRef.current[resolvedId] = false;
    clearMatches(resolvedId);
    setMatches([]);
    setError("");
    setRefreshTick((t) => t + 1);
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
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white shadow-sm cursor-pointer hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Refresh results
          </button>
          <button
            type="button"
            onClick={handleRerank}
            disabled={loading || matches.length === 0}
            className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white shadow-sm cursor-pointer hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            View AI Based Analysis!
          </button>
        </div>
      </div>

      {seeker && <SeekerCard seeker={seeker} />}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && matches.length === 0 && (
        <p className="text-gray-600">
          Once your profile is processed, we’ll show compatible profiles here.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:gap-5">
        {matches.map((match) => (
          <MatchCard key={match.profile_id} match={match} seekerCanonical={seeker?.canonical} />
        ))}
      </div>
    </div>
  );
}
