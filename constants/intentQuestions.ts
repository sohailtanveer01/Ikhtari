export interface IntentQuestionLibraryItem {
  id: string;
  text: string;
  category?: string;
}

export const INTENT_QUESTION_LIBRARY: IntentQuestionLibraryItem[] = [
  // Marriage & Values
  { id: "mv-1", text: "What does a successful Islamic marriage look like to you?", category: "Marriage & Values" },
  { id: "mv-2", text: "What are your non-negotiables in a spouse?", category: "Marriage & Values" },
  { id: "mv-3", text: "How do you envision the roles of husband and wife?", category: "Marriage & Values" },
  { id: "mv-4", text: "What is your timeline for marriage?", category: "Marriage & Values" },
  { id: "mv-5", text: "How important is it that your spouse shares your cultural background?", category: "Marriage & Values" },

  // Deen & Spirituality
  { id: "ds-1", text: "How does Islam shape your daily life?", category: "Deen & Spirituality" },
  { id: "ds-2", text: "What is your relationship with salah and how consistent are you?", category: "Deen & Spirituality" },
  { id: "ds-3", text: "How do you plan to grow spiritually as a couple?", category: "Deen & Spirituality" },
  { id: "ds-4", text: "What Islamic values are most important for you to share with a spouse?", category: "Deen & Spirituality" },
  { id: "ds-5", text: "How do you handle differences in religious practice within a relationship?", category: "Deen & Spirituality" },

  // Family & Lifestyle
  { id: "fl-1", text: "Do you want children? If so, how many and when?", category: "Family & Lifestyle" },
  { id: "fl-2", text: "How involved do you expect extended family to be in your marriage?", category: "Family & Lifestyle" },
  { id: "fl-3", text: "Where do you see yourself living in the next 5 years?", category: "Family & Lifestyle" },
  { id: "fl-4", text: "How do you feel about your spouse working after marriage?", category: "Family & Lifestyle" },
  { id: "fl-5", text: "What does your ideal weekend look like as a married couple?", category: "Family & Lifestyle" },

  // Communication
  { id: "cm-1", text: "How do you handle conflict or disagreements?", category: "Communication" },
  { id: "cm-2", text: "What is your love language?", category: "Communication" },
  { id: "cm-3", text: "How do you express appreciation and affection?", category: "Communication" },
  { id: "cm-4", text: "What is one thing you wish people understood about you?", category: "Communication" },
  { id: "cm-5", text: "How important is emotional vulnerability to you in a relationship?", category: "Communication" },

  // Practical
  { id: "pr-1", text: "How do you approach finances and financial planning?", category: "Practical" },
  { id: "pr-2", text: "What are your career goals and how do they fit with married life?", category: "Practical" },
  { id: "pr-3", text: "How do you prioritize health and fitness?", category: "Practical" },
  { id: "pr-4", text: "What is the biggest lesson you've learned from a past experience?", category: "Practical" },
  { id: "pr-5", text: "What are you most passionate about outside of work?", category: "Practical" },
];

export const INTENT_QUESTION_CATEGORIES = [
  "Marriage & Values",
  "Deen & Spirituality",
  "Family & Lifestyle",
  "Communication",
  "Practical",
];
