import { create } from "zustand";
import { supabase } from "../supabase";

interface BadgeState {
  // Counts
  unreadMessages: number;
  newInterests: number;
  pendingCompliments: number;

  // Actions
  setUnreadMessages: (count: number) => void;
  setNewInterests: (count: number) => void;
  setPendingCompliments: (count: number) => void;

  incrementUnread: (by?: number) => void;
  decrementUnread: (by?: number) => void;
  incrementInterests: (by?: number) => void;

  resetUnread: () => void;
  resetInterests: () => void;
  resetAll: () => void;

  // Async actions
  loadAllCounts: () => Promise<void>;
  loadUnreadMessages: () => Promise<void>;
  loadNewInterests: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  // Initial state
  unreadMessages: 0,
  newInterests: 0,
  pendingCompliments: 0,

  // Setters
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  setNewInterests: (count) => set({ newInterests: count }),
  setPendingCompliments: (count) => set({ pendingCompliments: count }),

  // Increment/Decrement
  incrementUnread: (by = 1) => set((s) => ({ unreadMessages: s.unreadMessages + by })),
  decrementUnread: (by = 1) => set((s) => ({ unreadMessages: Math.max(0, s.unreadMessages - by) })),
  incrementInterests: (by = 1) => set((s) => ({ newInterests: s.newInterests + by })),

  // Reset
  resetUnread: () => set({ unreadMessages: 0 }),
  resetInterests: () => set({ newInterests: 0 }),
  resetAll: () => set({ unreadMessages: 0, newInterests: 0, pendingCompliments: 0 }),

  // Async: Load all counts from database
  loadAllCounts: async () => {
    await Promise.all([
      get().loadUnreadMessages(),
      get().loadNewInterests(),
    ]);
  },

  // Load unread messages count
  loadUnreadMessages: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let totalUnread = 0;

      // Get all matches for the user
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`);

      if (matches && matches.length > 0) {
        // Count unread messages (not sent by current user AND read = false)
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("match_id", matches.map((m) => m.id))
          .neq("sender_id", user.id)
          .eq("read", false);

        totalUnread = count || 0;
      }

      // Also count pending compliments (not yet accepted/rejected)
      const { count: complimentCount } = await supabase
        .from("compliments")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("status", "pending");

      set({
        unreadMessages: totalUnread,
        pendingCompliments: complimentCount || 0,
      });
    } catch (e) {
      console.error("Error loading unread messages:", e);
    }
  },

  // Load new interests count (pending interest requests received)
  loadNewInterests: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("interest_requests")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("status", "pending");

      set({ newInterests: count || 0 });
    } catch (e) {
      console.error("Error loading new interests:", e);
    }
  },
}));

// Selector hooks for optimized re-renders
export const useUnreadMessages = () => useBadgeStore((state) => state.unreadMessages);
export const useNewInterests = () => useBadgeStore((state) => state.newInterests);
// Keep backward-compatible alias
export const useNewLikes = useNewInterests;
export const useTotalBadgeCount = () => useBadgeStore((state) => state.unreadMessages + state.pendingCompliments);
