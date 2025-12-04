import { create } from "zustand";
import { persist } from "zustand/middleware";

// Persist profile and match data so reloading or navigating keeps results available.
const useMatchStore = create(
  persist(
    (set) => ({
      profiles: {},
      matches: {},
      reranks: {},
      canonicalMatches: {},
      setProfile: (id, profile) =>
        set((state) => ({
          profiles: { ...state.profiles, [id]: profile },
        })),
      setMatches: (id, data) =>
        set((state) => ({
          matches: { ...state.matches, [id]: data },
        })),
      setRerank: (id, data) =>
        set((state) => ({
          reranks: { ...state.reranks, [id]: data },
        })),
      setCanonicalMatch: (seekerId, candidateId, data) =>
        set((state) => {
          const existing = state.canonicalMatches[seekerId] || {};
          return {
            canonicalMatches: {
              ...state.canonicalMatches,
              [seekerId]: { ...existing, [candidateId]: data },
            },
          };
        }),
      clearMatches: (id) =>
        set((state) => {
          const next = { ...state.matches };
          delete next[id];
          return { matches: next };
        }),
      clearRerank: (id) =>
        set((state) => {
          const next = { ...state.reranks };
          delete next[id];
          return { reranks: next };
        }),
      clearCanonicalMatches: (seekerId) =>
        set((state) => {
          const next = { ...state.canonicalMatches };
          delete next[seekerId];
          return { canonicalMatches: next };
        }),
      clear: () => set({ profiles: {}, matches: {}, reranks: {}, canonicalMatches: {} }),
    }),
    {
      name: "match-maker-store",
      partialize: (state) => ({
        profiles: state.profiles,
        matches: state.matches,
        reranks: state.reranks,
        canonicalMatches: state.canonicalMatches,
      }),
    }
  )
);

export default useMatchStore;
