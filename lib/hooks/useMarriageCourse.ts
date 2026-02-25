import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

// Fetch all active course modules
export function useCourseModules() {
  return useQuery({
    queryKey: ["marriage-course-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marriage_course_modules")
        .select("*")
        .eq("is_active", true)
        .order("module_number", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch user's progress for all modules
export function useUserProgress() {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  return useQuery({
    queryKey: ["marriage-course-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("marriage_course_user_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// Fetch a specific module with its quiz questions
export function useModule(moduleId: string) {
  return useQuery({
    queryKey: ["marriage-course-module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marriage_course_modules")
        .select("*")
        .eq("id", moduleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

// Fetch quiz questions for a module
export function useModuleQuiz(moduleId: string) {
  return useQuery({
    queryKey: ["marriage-course-quiz", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marriage_course_quiz_questions")
        .select("*")
        .eq("module_id", moduleId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });
}

// Fetch user's progress for a specific module
export function useModuleProgress(moduleId: string) {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  return useQuery({
    queryKey: ["marriage-course-module-progress", moduleId, user?.id],
    queryFn: async () => {
      if (!user?.id || !moduleId) return null;

      const { data, error } = await supabase
        .from("marriage_course_user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return data || null;
    },
    enabled: !!user?.id && !!moduleId,
  });
}

// Mark video as watched
export function useMarkVideoWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      progressPercent = 100,
    }: {
      moduleId: string;
      progressPercent?: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marriage_course_user_progress")
        .upsert(
          {
            user_id: user.user.id,
            module_id: moduleId,
            video_watched: true,
            video_watched_at: new Date().toISOString(),
            video_progress_percent: progressPercent,
          },
          {
            onConflict: "user_id,module_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-module-progress"] });
    },
  });
}

// Mark a module as complete (after expectations are saved)
export function useCompleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ moduleId }: { moduleId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("marriage_course_user_progress")
        .upsert(
          {
            user_id: user.user.id,
            module_id: moduleId,
            module_completed: true,
            module_completed_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,module_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-module-progress"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-certification"] });
    },
  });
}

// Submit quiz answers
export function useSubmitQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      moduleId,
      answers,
    }: {
      moduleId: string;
      answers: Record<string, string>; // questionId -> optionId
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Not authenticated");

      // Fetch quiz questions to calculate score
      const { data: questions, error: questionsError } = await supabase
        .from("marriage_course_quiz_questions")
        .select("*")
        .eq("module_id", moduleId)
        .order("display_order", { ascending: true });

      if (questionsError) throw questionsError;

      // Calculate score
      let correctCount = 0;
      const totalQuestions = questions?.length || 0;

      questions?.forEach((question) => {
        const selectedOptionId = answers[question.id];
        if (selectedOptionId) {
          const options = question.options as Array<{
            id: string;
            text: string;
            is_correct: boolean;
          }>;
          const selectedOption = options.find((opt) => opt.id === selectedOptionId);
          if (selectedOption?.is_correct) {
            correctCount++;
          }
        }
      });

      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const passed = score >= 80; // 80% threshold

      // Update progress
      const updateData: any = {
        user_id: user.user.id,
        module_id: moduleId,
        quiz_attempts: 1,
        quiz_score: score,
        last_quiz_answers: answers,
      };

      // Get existing progress to increment attempts
      const { data: existingProgress } = await supabase
        .from("marriage_course_user_progress")
        .select("quiz_attempts")
        .eq("user_id", user.user.id)
        .eq("module_id", moduleId)
        .single();

      if (existingProgress) {
        updateData.quiz_attempts = (existingProgress.quiz_attempts || 0) + 1;
      }

      if (passed) {
        updateData.quiz_passed = true;
        updateData.quiz_passed_at = new Date().toISOString();
      }

      // Check if module is completed (video watched + quiz passed)
      const { data: currentProgress } = await supabase
        .from("marriage_course_user_progress")
        .select("video_watched")
        .eq("user_id", user.user.id)
        .eq("module_id", moduleId)
        .single();

      if (currentProgress?.video_watched && passed) {
        updateData.module_completed = true;
        updateData.module_completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("marriage_course_user_progress")
        .upsert(updateData, {
          onConflict: "user_id,module_id",
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        score,
        passed,
        correctCount,
        totalQuestions,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marriage-course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-module-progress"] });
      queryClient.invalidateQueries({ queryKey: ["marriage-course-certification"] });
    },
  });
}


