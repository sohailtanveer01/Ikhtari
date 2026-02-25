import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

// Fetch user's expectations and obligations
export function useExpectations(userId?: string) {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: ["marriage-expectations", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("marriage_expectations_obligations")
        .select("*")
        .eq("user_id", targetUserId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!targetUserId,
  });
}

// Save expectations and obligations
export function useSaveExpectations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      expectations,
      isComplete = false,
    }: {
      expectations: {
        financial?: any;
        lifestyle?: any;
        mahr?: any;
        family?: any;
        religious?: any;
        husband_obligations?: any;
        wife_obligations?: any;
        additional_notes?: string;
      };
      isComplete?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Fetch existing row so partial saves don't null out other categories
      const { data: existing } = await supabase
        .from("marriage_expectations_obligations")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      const { data, error } = await supabase
        .from("marriage_expectations_obligations")
        .upsert(
          {
            user_id: user.user.id,
            financial_expectations: expectations.financial || existing?.financial_expectations || null,
            lifestyle_expectations: expectations.lifestyle || existing?.lifestyle_expectations || null,
            mahr_expectations: expectations.mahr || existing?.mahr_expectations || null,
            family_expectations: expectations.family || existing?.family_expectations || null,
            religious_expectations: expectations.religious || existing?.religious_expectations || null,
            husband_obligations: expectations.husband_obligations || existing?.husband_obligations || null,
            wife_obligations: expectations.wife_obligations || existing?.wife_obligations || null,
            additional_notes: expectations.additional_notes ?? existing?.additional_notes ?? null,
            is_complete: isComplete,
            completed_at: isComplete ? new Date().toISOString() : (existing?.completed_at || null),
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-expectations"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-certification"] });
    },
  });
}


