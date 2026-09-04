// Rank determines access: a user's plan must rank >= the content's
// requiredPlan. See docs §09 for the full tier table.
export const PLAN_RANK = { free: 0, basic: 1, standard: 2, premium: 3 };
