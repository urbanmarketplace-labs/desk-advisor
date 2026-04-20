export type TimeExposure = "<2h" | "2-4h" | "4-8h" | "8h+";

export type SetupType =
  | "Laptop only"
  | "Laptop raised"
  | "External monitor"
  | "Multi-monitor";

export type FrictionSignal =
  | "Space feels limited"
  | "Looks cluttered"
  | "Physical discomfort"
  | "Lighting is not good"
  | "Hard to focus"
  | "Nothing obvious";

export type DeskDensity = "Minimal" | "Moderate" | "Busy" | "Overloaded";

export type LightingQuality =
  | "Even and bright"
  | "Usable but inconsistent"
  | "Dim / shadowy"
  | "Changes throughout the day";

export type UpgradeIntent =
  | "Free improvements first"
  | "A few practical upgrades"
  | "Open to bigger changes";

export type DeskSize = "Very small" | "Small" | "Medium" | "Large";

export type StepKind = "single" | "multi" | "text";
export type ScoreKey = "comfort" | "focus" | "lighting" | "fit";

export type ProductCategory =
  | "ergonomics"
  | "lighting"
  | "surface"
  | "organization"
  | "wellbeing";

export interface AssessmentInput {
  timeExposure: TimeExposure | "";
  setupType: SetupType | "";
  frictionSignals: FrictionSignal[];
  deskDensity: DeskDensity | "";
  lightingQuality: LightingQuality | "";
  deskSize: DeskSize | "";
  upgradeIntent: UpgradeIntent | "";
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
  maxSelections?: number;
}

export interface ProductCatalogItem {
  name: string;
  category: ProductCategory;
  priceBand: "Under 50" | "50-150" | "150-300" | "300+" | "Premium";
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
  summary: string;
  impact: string;
}

export interface DiagnosisSubScore {
  key: ScoreKey;
  label: string;
  score: number;
  summary: string;
}

export interface RecommendationBucket {
  title: string;
  items: string[];
}

export interface ScoreImprovement {
  action: string;
  effect: string;
  scoreLabel: string;
}

export interface MatchedProduct {
  name: string;
  fitScore: number;
  reasons: string[];
}

export interface DiagnosisResult {
  score: number;
  confidence: "low" | "moderate" | "high";
  confidenceLabel: string;
  summary: string;
  profile: string[];
  diagnosisTags: string[];
  primaryConstraint: string;
  secondaryConstraint: string | null;
  subScores: DiagnosisSubScore[];
  mainIssues: DiagnosisIssue[];
  reasoning: string[];
  whyThisMatters: string[];
  freeFixes: RecommendationBucket;
  paidUpgrades: RecommendationBucket;
  scoreImprovements: ScoreImprovement[];
  matchedProducts: MatchedProduct[];
  nextQuestions: string[];
}
