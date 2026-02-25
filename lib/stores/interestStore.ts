import { create } from "zustand";
import { supabase } from "../supabase";

interface InterestState {
  currentAnswers: Map<string, string>;
  isSubmitting: boolean;

  // Actions
  setAnswer: (questionId: string, answer: string) => void;
  clearAnswers: () => void;
  submitInterest: (recipientId: string, answers: Array<{ question_id: string; answer_text: string }>) => Promise<{ success: boolean; interest_request_id?: string; error?: string }>;
  respondToInterest: (interestRequestId: string, action: "accept" | "decline" | "answer_back", answers?: Array<{ question_id: string; answer_text: string }>) => Promise<{ success: boolean; match_id?: string; error?: string }>;
}

export const useInterestStore = create<InterestState>((set, get) => ({
  currentAnswers: new Map(),
  isSubmitting: false,

  setAnswer: (questionId, answer) =>
    set((s) => {
      const newMap = new Map(s.currentAnswers);
      newMap.set(questionId, answer);
      return { currentAnswers: newMap };
    }),

  clearAnswers: () => set({ currentAnswers: new Map() }),

  submitInterest: async (recipientId, answers) => {
    set({ isSubmitting: true });
    try {
      const { data, error } = await supabase.functions.invoke("submit-interest", {
        body: { recipient_id: recipientId, answers },
      });

      if (error) {
        set({ isSubmitting: false });
        return { success: false, error: error.message };
      }

      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      if (parsedData?.error) {
        set({ isSubmitting: false });
        return { success: false, error: parsedData.error };
      }

      set({ isSubmitting: false, currentAnswers: new Map() });
      return { success: true, interest_request_id: parsedData?.interest_request_id };
    } catch (e: any) {
      set({ isSubmitting: false });
      return { success: false, error: e.message };
    }
  },

  respondToInterest: async (interestRequestId, action, answers) => {
    set({ isSubmitting: true });
    try {
      const body: any = { interest_request_id: interestRequestId, action };
      if (answers) body.answers = answers;

      const { data, error } = await supabase.functions.invoke("respond-to-interest", {
        body,
      });

      if (error) {
        set({ isSubmitting: false });
        return { success: false, error: error.message };
      }

      const parsedData = typeof data === "string" ? JSON.parse(data) : data;

      if (parsedData?.error) {
        set({ isSubmitting: false });
        return { success: false, error: parsedData.error };
      }

      set({ isSubmitting: false, currentAnswers: new Map() });
      return { success: true, match_id: parsedData?.match_id };
    } catch (e: any) {
      set({ isSubmitting: false });
      return { success: false, error: e.message };
    }
  },
}));
