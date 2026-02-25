// Pure compatibility scoring functions — no React dependencies.
// Shared between client (profile view) and server (discover feed).

export interface CompatibilityScores {
  overall: number;
  deen: number;
  financial: number;
  lifestyle: number;
  family: number;
  mahr: number;
}

// Ordered option lists per field — position determines "distance"
const OPTION_ORDERS: Record<string, string[]> = {
  // Financial
  primary_provider: ["husband", "shared", "flexible"],
  expected_income_range: ["low", "medium", "high", "flexible"],
  financial_transparency: ["true", "false"],
  savings_expectations: ["high", "medium", "low", "none"],
  // Lifestyle
  living_arrangement: ["separate", "with_family", "flexible"],
  work_life_balance: ["traditional", "modern", "flexible"],
  social_activities: ["conservative", "moderate", "active"],
  technology_usage: ["limited", "moderate", "active"],
  travel_expectations: ["frequent", "occasional", "rare", "none"],
  // Mahr
  mahr_type: ["cash", "property", "education", "symbolic", "flexible"],
  mahr_range: ["symbolic", "modest", "moderate", "substantial", "flexible"],
  payment_timeline: ["immediate", "deferred", "flexible"],
  flexibility: ["strict", "moderate", "very_flexible"],
  // Family
  family_involvement: ["high", "moderate", "low", "none"],
  living_with_inlaws: ["yes", "temporary", "no", "flexible"],
  family_visits: ["frequent", "moderate", "occasional", "rare"],
  cultural_priorities: ["islamic_first", "balanced", "cultural_first"],
  // Religious
  prayer_together: ["always", "often", "sometimes", "prefer_not"],
  religious_education_children: ["essential", "important", "preferred"],
  religious_activities: ["very_active", "active", "moderate", "minimal"],
  madhhab_compatibility: ["essential", "important", "preferred", "flexible"],
};

const FLEXIBLE_VALUES = new Set(["flexible", "very_flexible"]);

function scoreField(mine: string | undefined, theirs: string | undefined, field: string): number | null {
  if (!mine || !theirs) return null;

  const mineStr = String(mine);
  const theirsStr = String(theirs);

  if (mineStr === theirsStr) return 100;
  if (FLEXIBLE_VALUES.has(mineStr) || FLEXIBLE_VALUES.has(theirsStr)) return 80;

  const order = OPTION_ORDERS[field];
  if (!order) return mineStr === theirsStr ? 100 : 50;

  const idxA = order.indexOf(mineStr);
  const idxB = order.indexOf(theirsStr);
  if (idxA === -1 || idxB === -1) return 50;

  const distance = Math.abs(idxA - idxB);
  if (distance === 1) return 60;
  return 20;
}

function scoreCategory(mine: Record<string, any> | null | undefined, theirs: Record<string, any> | null | undefined): number {
  if (!mine || !theirs) return 0;

  const fields = Object.keys(mine);
  let total = 0;
  let count = 0;

  for (const field of fields) {
    const s = scoreField(mine[field], theirs[field], field);
    if (s !== null) {
      total += s;
      count++;
    }
  }

  return count > 0 ? Math.round(total / count) : 0;
}

// Weights: Deen 30%, Financial 20%, Lifestyle 20%, Family 20%, Mahr 10%
const WEIGHTS = {
  deen: 0.3,
  financial: 0.2,
  lifestyle: 0.2,
  family: 0.2,
  mahr: 0.1,
};

export function computeCompatibility(
  myExpectations: Record<string, any> | null,
  theirExpectations: Record<string, any> | null
): CompatibilityScores | null {
  if (!myExpectations || !theirExpectations) return null;

  const deen = scoreCategory(
    myExpectations.religious_expectations,
    theirExpectations.religious_expectations
  );
  const financial = scoreCategory(
    myExpectations.financial_expectations,
    theirExpectations.financial_expectations
  );
  const lifestyle = scoreCategory(
    myExpectations.lifestyle_expectations,
    theirExpectations.lifestyle_expectations
  );
  const family = scoreCategory(
    myExpectations.family_expectations,
    theirExpectations.family_expectations
  );
  const mahr = scoreCategory(
    myExpectations.mahr_expectations,
    theirExpectations.mahr_expectations
  );

  const overall = Math.round(
    deen * WEIGHTS.deen +
    financial * WEIGHTS.financial +
    lifestyle * WEIGHTS.lifestyle +
    family * WEIGHTS.family +
    mahr * WEIGHTS.mahr
  );

  return { overall, deen, financial, lifestyle, family, mahr };
}
