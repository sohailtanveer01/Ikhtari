import React, { createContext, useContext, useMemo, useState } from "react";

type OnboardingData = {
  firstName: string;
  lastName: string;
  height: string;
  maritalStatus: string;
  hasChildren: boolean | null;
  gender: string;
  dob: string; // ISO like "1998-06-14"
  sect: string; // sunni, shia, sufi, other, prefer not to say
  bornMuslim: boolean | null; // yes or no
  religiousPractice: string; // actively practicing, moderately practicing, not practicing
  alcoholHabit: string; // drinks, doesn't drink, sometimes
  smokingHabit: string; // smokes, doesn't smoke, sometimes
  hobbies: string[]; // array of selected hobbies
  education: string;
  profession: string;
  religion: string;
  bio: string;
  photos: string[]; // Supabase public URLs
  location: { lat: number; lon: number } | null;
  city: string;
  country: string;
  ethnicity: string;
  nationality: string;
  prompts: Array<{ id: string; question: string; answer: string }>; // User prompts and answers
  intentQuestions: Array<{ question_text: string; is_from_library: boolean; library_question_id?: string; display_order: number }>;
  preferences: {
    ageMin: number;
    ageMax: number;
    nationalities: string[];
    ethnicities: string[];
    sects: string[];
    alcoholPreferences: string[];
    smokingPreferences: string[];
    bornMuslim: "yes" | "no" | "both" | null;
  };
};

const defaultData: OnboardingData = {
  firstName: "",
  lastName: "",
  height: "",
  maritalStatus: "",
  hasChildren: null,
  gender: "",
  dob: "",
  sect: "",
  bornMuslim: null,
  religiousPractice: "",
  alcoholHabit: "",
  smokingHabit: "",
  hobbies: [],
  education: "",
  profession: "",
  religion: "",
  bio: "",
  photos: [],
  location: null,
  city: "",
  country: "",
  ethnicity: "",
  nationality: "",
  prompts: [],
  intentQuestions: [],
  preferences: {
    ageMin: 18,
    ageMax: 50,
    nationalities: [],
    ethnicities: [],
    sects: [],
    alcoholPreferences: [],
    smokingPreferences: [],
    bornMuslim: null,
  },
};

const Ctx = createContext<{
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
} | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const value = useMemo(() => ({ data, setData }), [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
