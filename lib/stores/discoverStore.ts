import { create } from "zustand";
import { supabase } from "../supabase";

const PAGE_SIZE = 4;

export interface DiscoverProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  photos?: string[];
  age?: number;
  dob?: string;
  city?: string;
  country?: string;
  profession?: string;
  bio?: string;
  hobbies?: string[];
  is_boosted?: boolean;
  boost_expires_at?: string;
  intent_questions?: Array<{
    id: string;
    question_text: string;
    is_from_library: boolean;
    library_question_id?: string;
    display_order: number;
  }>;
  prompts?: Array<{
    question: string;
    answer: string;
    display_order: number;
  }>;
  [key: string]: any;
}

interface DiscoverState {
  profiles: DiscoverProfile[];
  isLoading: boolean;
  hasMore: boolean;
  isMarkingAsSeen: boolean;
  hasMarkedSeen: boolean;
  sessionSeenIds: string[]; // all IDs seen this session — sent on every request as exclusion list

  loadInitial: () => Promise<void>;
  markAsSeen: () => Promise<void>;
  removeProfile: (profileId: string) => void;
  resetFeed: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  profiles: [],
  isLoading: false,
  hasMore: true,
  isMarkingAsSeen: false,
  hasMarkedSeen: false,
  sessionSeenIds: [],

  loadInitial: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isLoading: false }); return; }

      const { sessionSeenIds } = get();

      const { data, error } = await supabase.functions.invoke("get-discover-feed", {
        body: { limit: PAGE_SIZE, mark_seen_ids: [], exclude_ids: sessionSeenIds },
      });

      if (error) {
        console.error("Error loading discover feed:", error);
        set({ isLoading: false });
        return;
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      set({
        profiles: parsed?.profiles || [],
        hasMore: parsed?.has_more ?? false,
        isLoading: false,
      });
    } catch (e) {
      console.error("Error in loadInitial:", e);
      set({ isLoading: false });
    }
  },

  markAsSeen: async () => {
    const { profiles, sessionSeenIds } = get();
    const currentIds = profiles.map((p) => p.id);
    // Merge current batch into accumulated session seen IDs
    const updatedSeenIds = [...new Set([...sessionSeenIds, ...currentIds])];

    set({ isMarkingAsSeen: true, isLoading: true, sessionSeenIds: updatedSeenIds });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ isMarkingAsSeen: false, isLoading: false }); return; }

      const { data, error } = await supabase.functions.invoke("get-discover-feed", {
        // mark_seen_ids → persisted to DB; exclude_ids → in-memory exclusion (belt & suspenders)
        body: { limit: PAGE_SIZE, mark_seen_ids: currentIds, exclude_ids: updatedSeenIds },
      });

      if (error) {
        console.error("Error marking as seen:", error);
        set({ isMarkingAsSeen: false, isLoading: false });
        return;
      }

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      set({
        profiles: parsed?.profiles || [],
        hasMore: parsed?.has_more ?? false,
        isMarkingAsSeen: false,
        isLoading: false,
        hasMarkedSeen: true,
      });
    } catch (e) {
      console.error("Error in markAsSeen:", e);
      set({ isMarkingAsSeen: false, isLoading: false });
    }
  },

  removeProfile: (profileId) =>
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== profileId) })),

  resetFeed: () =>
    set({
      profiles: [],
      isLoading: false,
      hasMore: true,
      isMarkingAsSeen: false,
      hasMarkedSeen: false,
      sessionSeenIds: [],
    }),
}));

export const useDiscoverProfiles = () => useDiscoverStore((s) => s.profiles);
export const useDiscoverLoading = () => useDiscoverStore((s) => s.isLoading);
export const useDiscoverHasMore = () => useDiscoverStore((s) => s.hasMore);
