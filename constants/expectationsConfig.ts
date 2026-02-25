export const EXPECTATIONS_CONFIG = {
  financial: {
    title: "Financial Expectations",
    icon: "cash-outline" as const,
    description: "Set your financial expectations for marriage",
    fields: {
      primary_provider: {
        label: "Who should be the primary provider?",
        male_label: "How do you plan to provide financially?",
        female_label: "What do you expect from your husband as a provider?",
        options: [
          { value: "husband", label: "Husband" },
          { value: "shared", label: "Shared equally" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      expected_income_range: {
        label: "What income range do you expect?",
        male_label: "What income range do you aim for?",
        female_label: "What household income range do you expect?",
        options: [
          { value: "low", label: "Modest" },
          { value: "medium", label: "Comfortable" },
          { value: "high", label: "High earning" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      financial_transparency: {
        label: "Should finances be fully transparent?",
        type: "boolean" as const,
        options: [
          { value: "true", label: "Yes, full transparency" },
          { value: "false", label: "Some privacy is fine" },
        ],
      },
      savings_expectations: {
        label: "What are your savings expectations?",
        options: [
          { value: "high", label: "Aggressive saving" },
          { value: "medium", label: "Moderate saving" },
          { value: "low", label: "Minimal saving" },
          { value: "none", label: "No expectations" },
        ],
      },
      wife_working: {
        label: "Should the wife work?",
        male_label: "Are you comfortable with your wife working?",
        female_label: "Do you plan to work after marriage?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "part_time", label: "Part-time" },
          { value: "no", label: "No" },
          { value: "flexible", label: "Flexible" },
        ],
      },
    },
  },
  lifestyle: {
    title: "Lifestyle Expectations",
    icon: "home-outline" as const,
    description: "Define your lifestyle preferences",
    fields: {
      living_arrangement: {
        label: "Preferred living arrangement?",
        male_label: "Where do you plan to live after marriage?",
        female_label: "Where do you expect to live after marriage?",
        options: [
          { value: "separate", label: "Own place" },
          { value: "with_family", label: "With family" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      work_life_balance: {
        label: "Approach to work-life balance?",
        male_label: "What household role dynamic do you prefer?",
        female_label: "What household role dynamic do you prefer?",
        options: [
          { value: "traditional", label: "Traditional roles" },
          { value: "modern", label: "Both work equally" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      social_activities: {
        label: "Social activity level?",
        options: [
          { value: "conservative", label: "Private / minimal" },
          { value: "moderate", label: "Moderate" },
          { value: "active", label: "Very social" },
        ],
      },
      technology_usage: {
        label: "Technology & social media usage?",
        options: [
          { value: "limited", label: "Limited" },
          { value: "moderate", label: "Moderate" },
          { value: "active", label: "Active" },
        ],
      },
      travel_expectations: {
        label: "Travel expectations?",
        options: [
          { value: "frequent", label: "Frequent travel" },
          { value: "occasional", label: "Occasional trips" },
          { value: "rare", label: "Rare travel" },
          { value: "none", label: "Prefer staying home" },
        ],
      },
    },
  },
  mahr: {
    title: "Mahr Expectations",
    icon: "gift-outline" as const,
    description: "Set your mahr preferences",
    male_description: "What mahr are you willing to offer?",
    female_description: "What mahr do you expect to receive?",
    fields: {
      mahr_type: {
        label: "Preferred type of mahr?",
        male_label: "What type of mahr are you willing to give?",
        female_label: "What type of mahr do you expect?",
        options: [
          { value: "cash", label: "Cash / monetary" },
          { value: "property", label: "Property / asset" },
          { value: "education", label: "Education / skill" },
          { value: "symbolic", label: "Symbolic" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      mahr_range: {
        label: "Expected mahr range?",
        male_label: "What mahr range can you offer?",
        female_label: "What mahr range do you expect?",
        options: [
          { value: "symbolic", label: "Symbolic" },
          { value: "modest", label: "Modest" },
          { value: "moderate", label: "Moderate" },
          { value: "substantial", label: "Substantial" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      payment_timeline: {
        label: "Payment timeline?",
        options: [
          { value: "immediate", label: "Immediate (at nikah)" },
          { value: "deferred", label: "Deferred" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      flexibility: {
        label: "How flexible are you on mahr?",
        options: [
          { value: "strict", label: "Firm expectations" },
          { value: "moderate", label: "Somewhat flexible" },
          { value: "very_flexible", label: "Very flexible" },
        ],
      },
    },
  },
  family: {
    title: "Family Expectations",
    icon: "people-outline" as const,
    description: "Define your family involvement preferences",
    fields: {
      family_involvement: {
        label: "Family involvement in marriage?",
        male_label: "How involved should your family be?",
        female_label: "How involved should his family be?",
        options: [
          { value: "high", label: "Very involved" },
          { value: "moderate", label: "Moderate" },
          { value: "low", label: "Minimal" },
          { value: "none", label: "Independent" },
        ],
      },
      living_with_inlaws: {
        label: "Living with in-laws?",
        male_label: "Would you want your wife to live with your family?",
        female_label: "Would you be open to living with his family?",
        options: [
          { value: "yes", label: "Yes, happily" },
          { value: "temporary", label: "Temporarily" },
          { value: "no", label: "Prefer not" },
          { value: "flexible", label: "Flexible" },
        ],
      },
      family_visits: {
        label: "How often to visit family?",
        options: [
          { value: "frequent", label: "Weekly+" },
          { value: "moderate", label: "Monthly" },
          { value: "occasional", label: "Few times a year" },
          { value: "rare", label: "Rarely" },
        ],
      },
      cultural_priorities: {
        label: "Cultural vs. Islamic priorities?",
        options: [
          { value: "islamic_first", label: "Islamic values first" },
          { value: "balanced", label: "Balanced" },
          { value: "cultural_first", label: "Cultural traditions first" },
        ],
      },
    },
  },
  religious: {
    title: "Religious Expectations",
    icon: "moon-outline" as const,
    description: "Set your religious expectations for the marriage",
    fields: {
      prayer_together: {
        label: "Praying together as a couple?",
        options: [
          { value: "always", label: "Always" },
          { value: "often", label: "Often" },
          { value: "sometimes", label: "Sometimes" },
          { value: "prefer_not", label: "Prefer not" },
        ],
      },
      religious_education_children: {
        label: "Religious education for children?",
        options: [
          { value: "essential", label: "Essential" },
          { value: "important", label: "Important" },
          { value: "preferred", label: "Preferred but flexible" },
        ],
      },
      religious_activities: {
        label: "Involvement in religious activities?",
        options: [
          { value: "very_active", label: "Very active" },
          { value: "active", label: "Active" },
          { value: "moderate", label: "Moderate" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      madhhab_compatibility: {
        label: "How important is madhhab compatibility?",
        options: [
          { value: "essential", label: "Essential" },
          { value: "important", label: "Important" },
          { value: "preferred", label: "Preferred" },
          { value: "flexible", label: "Flexible" },
        ],
      },
    },
  },
  husband_obligations: {
    title: "Husband's Obligations",
    icon: "shield-checkmark-outline" as const,
    description: "Commitments expected from the husband",
    male_title: "Your Obligations as a Husband",
    male_description: "Select the obligations you commit to:",
    female_title: "What You Expect From Your Husband",
    female_description: "Select what you expect him to commit to:",
    fields: {
      provision: { label: "Financial provision for the family" },
      protection: { label: "Protection and safety of the family" },
      emotional_support: { label: "Emotional support and care" },
      fair_treatment: { label: "Fair and equal treatment" },
      kindness: { label: "Kindness and good character" },
      consultation: { label: "Consultation in decisions (shura)" },
      financial_responsibility: { label: "Responsible financial management" },
      religious_leadership: { label: "Religious guidance and leadership" },
    },
  },
  wife_obligations: {
    title: "Wife's Obligations",
    icon: "heart-outline" as const,
    description: "Commitments expected from the wife",
    male_title: "What You Expect From Your Wife",
    male_description: "Select what you expect her to commit to:",
    female_title: "Your Obligations as a Wife",
    female_description: "Select the obligations you commit to:",
    fields: {
      cooperation: { label: "Cooperation in building the home" },
      respect: { label: "Mutual respect" },
      trust: { label: "Trust and loyalty" },
      emotional_stability: { label: "Emotional support and stability" },
      household_management: { label: "Household management" },
      support_husband: { label: "Supporting the husband" },
      privacy: { label: "Guarding family privacy" },
      religious_observance: { label: "Religious observance" },
    },
  },
} as const;

// Step order for the form
export const EXPECTATIONS_STEPS = [
  "financial",
  "lifestyle",
  "mahr",
  "family",
  "religious",
  "obligations",
  "notes",
] as const;

export type ExpectationsStep = (typeof EXPECTATIONS_STEPS)[number];
