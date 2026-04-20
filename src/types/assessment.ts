export type TimeExposure = "Under 2 hours" | "2-4 hours" | "4-8 hours" | "8+ hours";

export type SetupType =
  | "Laptop only"
  | "Laptop + external monitor"
  | "Single external monitor"
  | "Dual monitor"
  | "Other / mixed";

export type FrictionSignal =
  | "Discomfort / strain"
  | "Low light / poor visibility"
  | "Clutter / visual noise"
  | "Space feels limited"
  | "Hard to focus"
  | "Setup feels flat / unfinished"
  | "Nothing obvious, just feels off";

export type DeskDensity = "Minimal" | "Moderate" | "Busy" | "Overloaded";

export type LightingQuality =
  | "Bright and even"
  | "Mostly okay"
  | "Dim / shadowy"
  | "Changes throughout the day";

export type PrioritySignal =
  | "Comfort"
  | "Focus"
  | "Cleaner look"
  | "Better use of space"
  | "More premium feel";

export type WorkStyle =
  | "Deep focus / knowledge work"
  | "Meetings and admin"
  | "Creative / visual work"
  | "Mixed workday"
  | "Prefer not to say";

export type UpgradeIntent =
  | "Free improvements first"
  | "A few practical upgrades"
  | "Open to bigger changes";

export type DeskSize = "Very small" | "Small" | "Medium" | "Large";

export type StepKind = "single" | "multi" | "text";
export type ScoreKey = "comfort" | "focus" | "lighting" | "fit";
export type InputQuality = "light" | "moderate" | "rich";

export type ProductCategory =
  | "ergonomics"
  | "lighting"
  | "surface"
  | "organization"
  | "wellbeing";

export interface AssessmentInput {
  setupType: SetupType | "";
  timeExposure: TimeExposure | "";
  frictionSignals: FrictionSignal[];
  deskDensity: DeskDensity | "";
  lightingQuality: LightingQuality | "";
  whatMattersMost: PrioritySignal | "";
  workStyle: WorkStyle | "";
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
  inputQuality: InputQuality;
  inputQualityLabel: string;
  inputQualityNote: string;
  moreDetailPrompt: string | null;
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
