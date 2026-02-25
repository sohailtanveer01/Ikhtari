import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

// Fetch user's certification status
export function useCertification(userId?: string) {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: ["marriage-course-certification", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("marriage_course_certifications")
        .select("*")
        .eq("user_id", targetUserId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!targetUserId,
  });
}

// Toggle badge visibility
export function useToggleBadgeVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (showBadge: boolean) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Get or create certification record
      const { data: existing } = await supabase
        .from("marriage_course_certifications")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from("marriage_course_certifications")
          .update({ show_badge: showBadge })
          .eq("user_id", user.user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create record if doesn't exist
        const { data, error } = await supabase
          .from("marriage_course_certifications")
          .insert({
            user_id: user.user.id,
            show_badge: showBadge,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-course-certification"] });
    },
  });
}


