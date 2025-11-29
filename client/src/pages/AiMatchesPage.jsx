import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SeekerCard from "../components/SeekerCard";
import MatchCard from "../components/MatchCard";
import useMatchStore from "../store/useMatchStore";
import useLoadingStore from "../store/useLoadingStore";

export default function AiMatchesPage() {
  const { profileId: profileIdFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seeker, setSeeker] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
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
  }, [resolvedId, API_BASE, cacheProfile, cacheRerank, clearRerank, start, stop, refreshTick]);

  const goBackToMatches = () => {
    if (resolvedId) {
      navigate(`/matches/${resolvedId}`);
    } else {
      navigate("/upload");
    }
  };

  const handleRefresh = () => {
    if (!resolvedId) return;
    fetchedRef.current[resolvedId] = false;
    clearRerank(resolvedId);
    setResults([]);
    setError("");
    setRefreshTick((t) => t + 1);
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
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white cursor-pointer shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Refresh results
          </button>
          <button
            type="button"
            onClick={goBackToMatches}
            className="w-full md:w-auto text-center px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold bg-white cursor-pointer shadow-sm hover:bg-gray-50"
          >
            See semantic matches only!
          </button>
        </div>
      </div>

      {seeker && <SeekerCard seeker={seeker} />}

      {loading && (
        <div className="text-center text-sm text-gray-600">Analysis in progress...</div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && !error && results.length === 0 && (
        <p className="text-gray-600">No matches to analyse yet.</p>
      )}

      <div className={`grid gap-5 ${blurClass}`}>
        {results.map((match) => (
          <MatchCard
            key={match.profile_id}
            match={match}
            componentLabels={componentLabels}
            formatReason={formatReason}
          />
        ))}
      </div>
    </div>
  );
}
