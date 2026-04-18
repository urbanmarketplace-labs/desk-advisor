export type DeviceType =
  | "Laptop only"
  | "Laptop and monitor"
  | "Single external monitor"
  | "Dual monitors";

export type CurrentFeel =
  | "Cluttered"
  | "Uncomfortable"
  | "Too dark"
  | "Too cramped"
  | "Looks flat"
  | "Hard to focus";

export type Problem =
  | "Neck or back discomfort"
  | "Poor lighting"
  | "Not enough space"
  | "Cable clutter"
  | "Hard to focus"
  | "Does not feel premium";

export type Priority =
  | "Better comfort"
  | "Cleaner setup"
  | "Better focus"
  | "More premium look";

export type UpgradeIntent =
  | "Free improvements first"
  | "A few practical upgrades"
  | "A cleaner premium setup"
  | "Not sure yet";

export type BudgetBand = "Under 50" | "50-150" | "150-300" | "300+";

export type DeskSize = "Very small" | "Small" | "Medium" | "Large";

export type WorkStyle =
  | "Deep focus work"
  | "Meetings and admin"
  | "Creative work"
  | "Mixed use";

export type StepKind = "single" | "multi" | "text";

export type ProductCategory =
  | "ergonomics"
  | "lighting"
  | "surface"
  | "organization"
  | "wellbeing";

export interface AssessmentInput {
  deviceType: DeviceType | "";
  currentFeel: CurrentFeel[];
  problems: Problem[];
  priority: Priority | "";
  upgradeIntent: UpgradeIntent | "";
  deskSize: DeskSize | "";
  workStyle: WorkStyle | "";
  budgetBand: BudgetBand | "";
  extraDetail: string;
}

export interface QuestionStep<TValue extends string = string> {
  id: keyof AssessmentInput;
  kind: StepKind;
  title: string;
  description: string;
  placeholder?: string;
  options?: readonly TValue[];
  required: boolean;
}

export interface ProductCatalogItem {
  name: string;
  category: ProductCategory;
  priceBand: BudgetBand | "Premium";
  benefits: string[];
  bestFor: string[];
  avoidIf: string[];
  spaceImpact: "low" | "medium" | "high";
  styleFit: "utility" | "clean" | "premium";
}

export interface DiagnosisIssue {
  id: string;
  label: string;
  severity: number;
  confidence: number;
  causes: string[];
}

export interface RecommendationBucket {
  title: string;
  items: string[];
}

export interface MatchedProduct {
  name: string;
  fitScore: number;
  reasons: string[];
}

export interface DiagnosisResult {
  score: number;
  confidence: "low" | "medium" | "high";
  summary: string;
  profile: string[];
  mainIssues: DiagnosisIssue[];
  freeFixes: RecommendationBucket;
  paidUpgrades: RecommendationBucket;
  whyTheseRecommendations: string[];
  matchedProducts: MatchedProduct[];
  nextQuestions: string[];
}
