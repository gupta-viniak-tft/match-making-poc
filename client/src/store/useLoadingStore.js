import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLoadingStore = create(
  persist(
    (set) => ({
      counter: 0,
      start: () => set((state) => ({ counter: state.counter + 1 })),
      stop: () =>
        set((state) => ({ counter: Math.max(0, state.counter - 1) })),
      reset: () => set({ counter: 0 }),
    }),
    {
      name: "match-maker-loading",
      partialize: (state) => ({ counter: state.counter }),
    }
  )
);

export default useLoadingStore;
