import { productCatalog } from "@/data/product-catalog";
import type {
  AssessmentInput,
  DiagnosisIssue,
  DiagnosisResult,
  DiagnosisSubScore,
  InputQuality,
  MatchedProduct,
  ProductCatalogItem,
  ScoreImprovement,
  ScoreKey
} from "@/types/assessment";

type Confidence = "low" | "moderate" | "high";
type DetailDepth = "short" | "medium" | "deep";

interface ScoreState {
  score: number;
  reasons: string[];
}

interface DiagnoseContext {
  scores: Record<ScoreKey, ScoreState>;
  issueTags: Set<string>;
  productSignals: Set<string>;
  reasoning: Set<string>;
  cautionFlags: Set<string>;
}

interface QualityAssessment {
  confidence: Confidence;
  confidenceLabel: string;
  inputQuality: InputQuality;
  inputQualityLabel: string;
  inputQualityNote: string;
  moreDetailPrompt: string | null;
  depth: DetailDepth;
}

const subScoreLabels: Record<ScoreKey, string> = {
  comfort: "Comfort / ergonomics",
  focus: "Focus / visual clarity",
  lighting: "Lighting / visual quality",
  fit: "Space & fit"
};

const neutralScores: Record<ScoreKey, number> = {
  comfort: 81,
  focus: 79,
  lighting: 78,
  fit: 78
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addScoreEffect(context: DiagnoseContext, key: ScoreKey, delta: number, reason: string): void {
  context.scores[key].score = clamp(context.scores[key].score + delta, 18, 98);
  context.scores[key].reasons.push(reason);
}

function addIssueTag(context: DiagnoseContext, ...tags: string[]): void {
  tags.forEach((tag) => context.issueTags.add(tag));
}

function addReasoning(context: DiagnoseContext, ...lines: string[]): void {
  lines.forEach((line) => context.reasoning.add(line));
}

function addCaution(context: DiagnoseContext, ...lines: string[]): void {
  lines.forEach((line) => context.cautionFlags.add(line));
}

function signalProducts(context: DiagnoseContext, ...names: string[]): void {
  names.forEach((name) => context.productSignals.add(name));
}

function buildInitialContext(): DiagnoseContext {
  return {
    scores: {
      comfort: { score: neutralScores.comfort, reasons: [] },
      focus: { score: neutralScores.focus, reasons: [] },
      lighting: { score: neutralScores.lighting, reasons: [] },
      fit: { score: neutralScores.fit, reasons: [] }
    },
    issueTags: new Set<string>(),
    productSignals: new Set<string>(),
    reasoning: new Set<string>(),
    cautionFlags: new Set<string>()
  };
}

function getDetailKeywordCount(detail: string): number {
  const matches = detail.match(/\b(neck|back|wrist|shoulder|strain|pain|glare|shadow|dim|light|lighting|cable|clutter|focus|space|small|storage|monitor|laptop|keyboard|mouse|desk|calls|meetings|editing|design)\b/gi);
  return matches ? unique(matches.map((item) => item.toLowerCase())).length : 0;
}

function assessInputQuality(input: AssessmentInput): QualityAssessment {
  const detail = input.extraDetail.trim();
  const keywordCount = getDetailKeywordCount(detail);
  let richness = 0;

  if (input.frictionSignals.length === 2 && !input.frictionSignals.includes("Nothing obvious, just feels off")) richness += 1;
  if (input.workStyle && input.workStyle !== "Prefer not to say") richness += 1;
  if (detail.length >= 45) richness += 1;
  if (detail.length >= 95) richness += 1;
  if (keywordCount >= 3) richness += 1;
  if (/\b(small|tight|limited|calls|meeting|editing|design|pain|strain|glare|window|storage|afternoon|evening)\b/i.test(detail)) richness += 1;

  if (detail.length === 0 && input.workStyle === "Prefer not to say") {
    return {
      confidence: "low",
      confidenceLabel: "Low confidence",
      inputQuality: "light",
      inputQualityLabel: "Light diagnosis",
      inputQualityNote: "Based on core assessment answers only. Add a bit more detail about your setup or work style for a sharper diagnosis.",
      moreDetailPrompt: "Tell us how you use the desk, what feels strained, or what the space is fighting against.",
      depth: "short"
    };
  }

  if (richness <= 2) {
    return {
      confidence: "low",
      confidenceLabel: "Low confidence",
      inputQuality: "light",
      inputQualityLabel: "Light diagnosis",
      inputQualityNote: "The main pattern is visible, but this is still a light diagnosis. A little more setup detail would make the breakdown sharper.",
      moreDetailPrompt: detail.length === 0
        ? "Add a short note about desk size, discomfort, storage limits, or how your workday changes."
        : "One more detail about what changes through the day would improve the diagnosis.",
      depth: "short"
    };
  }

  if (richness <= 4) {
    return {
      confidence: "moderate",
      confidenceLabel: "Moderate confidence",
      inputQuality: "moderate",
      inputQualityLabel: "Moderate detail",
      inputQualityNote: "The main constraints are clear. More setup detail would make the priorities and product fit more precise.",
      moreDetailPrompt: detail.length === 0 ? "A short note on discomfort, desk limits, or lighting changes would sharpen this." : null,
      depth: "medium"
    };
  }

  return {
    confidence: "high",
    confidenceLabel: "High confidence",
    inputQuality: "rich",
    inputQualityLabel: "Rich diagnosis",
    inputQualityNote: "This diagnosis is based on strong setup detail, so the priorities can be more specific.",
    moreDetailPrompt: null,
    depth: "deep"
  };
}

function buildWeights(input: AssessmentInput, context: DiagnoseContext): Record<ScoreKey, number> {
  const weights: Record<ScoreKey, number> = {
    comfort: 0.33,
    focus: 0.26,
    lighting: 0.19,
    fit: 0.22
  };

  switch (input.timeExposure) {
    case "Under 2 hours":
      weights.comfort -= 0.08;
      weights.lighting -= 0.03;
      weights.focus += 0.04;
      weights.fit += 0.07;
      break;
    case "2-4 hours":
      weights.comfort -= 0.02;
      weights.fit += 0.02;
      break;
    case "4-8 hours":
      weights.comfort += 0.08;
      weights.lighting += 0.04;
      weights.fit -= 0.05;
      addReasoning(context, "Longer desk hours increased the weight on comfort and lighting.");
      break;
    case "8+ hours":
      weights.comfort += 0.14;
      weights.lighting += 0.06;
      weights.focus += 0.01;
      weights.fit -= 0.08;
      addReasoning(context, "Very long desk hours made comfort the strongest scoring factor.");
      addReasoning(context, "Long desk exposure also raised the cost of weak lighting.");
      break;
  }

  switch (input.workStyle) {
    case "Deep focus / knowledge work":
      weights.focus += 0.05;
      weights.lighting += 0.02;
      addReasoning(context, "Deep focus work increased the weight on visual clarity.");
      break;
    case "Meetings and admin":
      weights.comfort += 0.03;
      weights.focus += 0.02;
      break;
    case "Creative / visual work":
      weights.lighting += 0.06;
      weights.focus += 0.03;
      addReasoning(context, "Creative or visual work increased the weight on lighting quality.");
      break;
    default:
      break;
  }

  input.frictionSignals.forEach((signal) => {
    switch (signal) {
      case "Discomfort / strain":
        weights.comfort += 0.11;
        addReasoning(context, "Discomfort signal increased the weight on comfort first.");
        break;
      case "Low light / poor visibility":
        weights.lighting += 0.09;
        weights.focus += 0.03;
        addReasoning(context, "Poor visibility increased the weight on lighting and focus.");
        break;
      case "Clutter / visual noise":
        weights.focus += 0.08;
        weights.fit += 0.03;
        addReasoning(context, "Visual noise increased the weight on focus and usable space.");
        break;
      case "Space feels limited":
        weights.fit += 0.1;
        weights.focus += 0.03;
        addReasoning(context, "Limited space increased the weight on fit and focus.");
        break;
      case "Hard to focus":
        weights.focus += 0.1;
        weights.lighting += 0.02;
        addReasoning(context, "Focus trouble increased the weight on visual clarity.");
        break;
      case "Setup feels flat / unfinished":
        weights.fit += 0.03;
        weights.focus += 0.02;
        break;
      default:
        addCaution(context, "There was less direct friction detail to work from, so the diagnosis stays more cautious.");
        break;
    }
  });

  switch (input.whatMattersMost) {
    case "Comfort":
      weights.comfort += 0.05;
      break;
    case "Focus":
      weights.focus += 0.05;
      break;
    case "Cleaner look":
      weights.focus += 0.03;
      weights.fit += 0.02;
      break;
    case "Better use of space":
      weights.fit += 0.06;
      break;
    case "More premium feel":
      weights.focus += 0.02;
      weights.fit += 0.02;
      addCaution(context, "Finish and premium feel were treated as secondary to any basic comfort, lighting, or space problems.");
      break;
    default:
      break;
  }

  if (input.deskDensity === "Busy") {
    weights.focus += 0.04;
    weights.fit += 0.04;
    addReasoning(context, "A busy desk increased the weight on focus and usable space.");
  }

  if (input.deskDensity === "Overloaded") {
    weights.focus += 0.06;
    weights.fit += 0.08;
    addReasoning(context, "An overloaded desk sharply increased the weight on space and focus.");
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  return {
    comfort: weights.comfort / total,
    focus: weights.focus / total,
    lighting: weights.lighting / total,
    fit: weights.fit / total
  };
}

function applySetupSignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.setupType) {
    case "Laptop only":
      addScoreEffect(context, "comfort", -16, "A laptop-only setup usually leaves the screen too low.");
      addScoreEffect(context, "fit", -4, "The working position is being constrained by the setup itself.");
      addIssueTag(context, "Posture strain");
      signalProducts(context, "Laptop Stand");
      addReasoning(context, "Laptop-only setup lowered the comfort score.");
      if (input.timeExposure === "4-8 hours" || input.timeExposure === "8+ hours") {
        addScoreEffect(context, "comfort", -14, "Long hours from a low laptop screen build up strain quickly.");
        addReasoning(context, "Laptop-only setup plus long hours created a strong ergonomics penalty.");
      }
      if (input.frictionSignals.includes("Discomfort / strain")) {
        addScoreEffect(context, "comfort", -10, "Existing discomfort makes the low screen position more urgent.");
        addReasoning(context, "Laptop use, long hours, and discomfort combined into a clear comfort priority.");
      }
      break;
    case "Laptop + external monitor":
      addScoreEffect(context, "comfort", 2, "An external monitor gives you more control than a laptop alone.");
      addScoreEffect(context, "focus", 2, "The setup has a clearer visual anchor than a laptop-only arrangement.");
      signalProducts(context, "Monitor Stand");
      break;
    case "Single external monitor":
      addScoreEffect(context, "comfort", 5, "A single monitor is easier to place well.");
      addScoreEffect(context, "focus", 3, "One main display keeps the setup easier to read.");
      signalProducts(context, "Monitor Stand");
      break;
    case "Dual monitor":
      addScoreEffect(context, "fit", -12, "Two screens increase surface pressure quickly.");
      addScoreEffect(context, "focus", -5, "Dual displays can add visual spread and cable load.");
      addIssueTag(context, "Space pressure");
      signalProducts(context, "Monitor Stand");
      addReasoning(context, "Dual monitors reduced the space and focus scores.");
      if (input.deskSize === "Very small" || input.deskSize === "Small") {
        addScoreEffect(context, "fit", -12, "Dual displays and limited desk space are competing for the same surface.");
        addReasoning(context, "Dual monitors in a smaller space added a strong fit penalty.");
      }
      break;
    case "Other / mixed":
      addCaution(context, "The mixed setup type leaves a little more ambiguity in the ergonomics read.");
      break;
  }
}

function applyFrictionSignals(input: AssessmentInput, context: DiagnoseContext): void {
  input.frictionSignals.forEach((signal) => {
    switch (signal) {
      case "Discomfort / strain":
        addScoreEffect(context, "comfort", -22, "The setup is already creating physical drag.");
        addScoreEffect(context, "fit", -5, "Screen and input position are likely part of the problem.");
        addIssueTag(context, "Posture strain");
        signalProducts(context, "Laptop Stand", "Monitor Stand");
        break;
      case "Low light / poor visibility":
        addScoreEffect(context, "lighting", -24, "The work area is not lit well enough.");
        addScoreEffect(context, "focus", -9, "Poor light makes concentration harder to hold.");
        addIssueTag(context, "Low light");
        signalProducts(context, "Monitor Light Bar");
        break;
      case "Clutter / visual noise":
        addScoreEffect(context, "focus", -18, "Too much is competing for attention.");
        addScoreEffect(context, "fit", -8, "The surface is carrying more visible load than it should.");
        addIssueTag(context, "Visual clutter");
        signalProducts(context, "Cable Management Kit", "Wool Desk Mat");
        break;
      case "Space feels limited":
        addScoreEffect(context, "fit", -22, "The desk is short on clear working room.");
        addScoreEffect(context, "focus", -6, "Space pressure makes the setup harder to read.");
        addIssueTag(context, "Space pressure");
        signalProducts(context, "Monitor Stand");
        break;
      case "Hard to focus":
        addScoreEffect(context, "focus", -20, "The setup is interrupting concentration.");
        addScoreEffect(context, "lighting", -4, "Visual quality may also be part of the drag.");
        addIssueTag(context, "Focus drag");
        signalProducts(context, "Cable Management Kit", "Monitor Light Bar");
        break;
      case "Setup feels flat / unfinished":
        addScoreEffect(context, "fit", -7, "The setup lacks enough structure to feel deliberate.");
        addScoreEffect(context, "focus", -3, "A flat setup often looks less settled than it could.");
        addIssueTag(context, "Low finish");
        signalProducts(context, "Wool Desk Mat");
        break;
      default:
        addCaution(context, "There was no single obvious friction signal, so the result stays more careful about cause and effect.");
        break;
    }
  });
}

function applyDensitySignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.deskDensity) {
    case "Minimal":
      addScoreEffect(context, "focus", 4, "A lighter desk usually supports clearer thinking.");
      addScoreEffect(context, "fit", 3, "Low density leaves more usable room for work.");
      break;
    case "Busy":
      addScoreEffect(context, "focus", -11, "A busy surface creates extra visual drag.");
      addScoreEffect(context, "fit", -10, "The desk is carrying more than it needs to.");
      addIssueTag(context, "Visual clutter");
      addReasoning(context, "High desk density reduced both focus and fit.");
      break;
    case "Overloaded":
      addScoreEffect(context, "focus", -16, "An overloaded surface makes it hard to settle into work.");
      addScoreEffect(context, "fit", -18, "Too much of the desk is no longer usable for work itself.");
      addIssueTag(context, "Visual clutter", "Space pressure");
      addReasoning(context, "An overloaded desk sharply reduced usable space.");
      break;
    default:
      break;
  }
}

function applyLightingSignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.lightingQuality) {
    case "Bright and even":
      addScoreEffect(context, "lighting", 8, "The task area has a strong lighting base.");
      addScoreEffect(context, "focus", 4, "Stable light supports easier visual focus.");
      break;
    case "Mostly okay":
      addScoreEffect(context, "lighting", -5, "The desk is workable, but light quality is not especially strong.");
      addScoreEffect(context, "focus", -2, "Average light adds a little friction over time.");
      break;
    case "Dim / shadowy":
      addScoreEffect(context, "lighting", -20, "The work area is too dim for steady use.");
      addScoreEffect(context, "focus", -9, "Shadowy light makes visual work feel heavier.");
      addIssueTag(context, "Low light");
      signalProducts(context, "Monitor Light Bar");
      addReasoning(context, "Dim lighting reduced both lighting and focus.");
      break;
    case "Changes throughout the day":
      addScoreEffect(context, "lighting", -13, "Lighting quality shifts through the day.");
      addScoreEffect(context, "focus", -6, "Changing light makes the setup less reliable to work from.");
      addIssueTag(context, "Light inconsistency");
      signalProducts(context, "Monitor Light Bar");
      addReasoning(context, "Changing light reduced reliability in the lighting score.");
      break;
  }
}

function applyDeskSizeSignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.deskSize) {
    case "Very small":
      addScoreEffect(context, "fit", -12, "A very small desk leaves little room for layout mistakes.");
      addScoreEffect(context, "focus", -4, "Small surfaces feel busy faster.");
      addIssueTag(context, "Space pressure");
      break;
    case "Small":
      addScoreEffect(context, "fit", -7, "A small desk needs tighter control over what stays out.");
      addScoreEffect(context, "focus", -2, "Clear layout matters more when space is limited.");
      break;
    case "Large":
      addScoreEffect(context, "fit", 4, "A larger desk gives you more room to structure the setup well.");
      break;
    default:
      break;
  }
}

function analyseFreeText(input: AssessmentInput, context: DiagnoseContext): void {
  const detail = input.extraDetail.trim();
  if (!detail) return;

  if (/\b(neck|back|wrist|shoulder|strain|ache|pain|tight)\b/i.test(detail)) {
    addScoreEffect(context, "comfort", -11, "Your notes reinforce that comfort is taking a real hit.");
    addIssueTag(context, "Posture strain");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
    addReasoning(context, "Your notes added more weight to the comfort diagnosis.");
  }

  if (/\b(light|lighting|glare|shadow|dark|dim|window|afternoon|evening)\b/i.test(detail)) {
    addScoreEffect(context, "lighting", -9, "Your notes point to a lighting issue beyond the basic signal.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }

  if (/\b(clutter|cable|wire|mess|busy|noise)\b/i.test(detail)) {
    addScoreEffect(context, "focus", -7, "Your notes reinforce visual drag on the desk.");
    addScoreEffect(context, "fit", -4, "Loose items are also affecting usable space.");
    addIssueTag(context, "Visual clutter");
    signalProducts(context, "Cable Management Kit");
  }

  if (/\b(storage|drawer|shelf|paper|equipment|printer|speaker)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -6, "The desk is carrying storage pressure as well as work.");
    addIssueTag(context, "Space pressure");
  }

  if (/\b(call|meeting|video|camera)\b/i.test(detail)) {
    addScoreEffect(context, "comfort", -3, "Frequent calls raise the cost of a poorly placed screen.");
    addScoreEffect(context, "focus", -2, "Meeting-heavy use makes layout friction more noticeable.");
  }

  if (/\b(edit|design|creative|colour|color)\b/i.test(detail)) {
    addScoreEffect(context, "lighting", -4, "Visual work makes lighting quality more important.");
    addReasoning(context, "Your notes suggest the desk supports visual work, which raises the lighting standard.");
  }
}

function buildSubScores(context: DiagnoseContext): DiagnosisSubScore[] {
  return (Object.keys(context.scores) as ScoreKey[]).map((key) => ({
    key,
    label: subScoreLabels[key],
    score: Math.round(context.scores[key].score),
    summary: unique(context.scores[key].reasons)[0] ?? `${subScoreLabels[key]} needs more attention.`
  }));
}

function buildOverallScore(subScores: DiagnosisSubScore[], weights: Record<ScoreKey, number>): number {
  return Math.round(
    clamp(
      subScores.reduce((sum, subScore) => sum + subScore.score * weights[subScore.key], 0),
      24,
      96
    )
  );
}

function getConstraintOrder(subScores: DiagnosisSubScore[], weights: Record<ScoreKey, number>): ScoreKey[] {
  return subScores
    .slice()
    .sort((left, right) => ((100 - right.score) * weights[right.key]) - ((100 - left.score) * weights[left.key]))
    .map((item) => item.key);
}

function scoreToConstraint(key: ScoreKey): string {
  return subScoreLabels[key];
}

function shouldDeprioritiseFinish(input: AssessmentInput, subScores: DiagnosisSubScore[]): boolean {
  if (input.whatMattersMost !== "More premium feel") {
    return false;
  }

  const comfort = subScores.find((item) => item.key === "comfort")?.score ?? 80;
  const lighting = subScores.find((item) => item.key === "lighting")?.score ?? 80;
  const fit = subScores.find((item) => item.key === "fit")?.score ?? 80;
  return comfort < 68 || lighting < 66 || fit < 62;
}

function issueTitleForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext, confidence: Confidence): string {
  switch (key) {
    case "comfort":
      if (input.setupType === "Laptop only") return confidence === "low" ? "Your screen height is likely part of the problem" : "Your screen position is dragging comfort down";
      return confidence === "low" ? "Comfort looks like one of the main pressure points" : "Your setup is creating physical drag";
    case "focus":
      return context.issueTags.has("Visual clutter") ? "Too much is competing for attention" : "The desk is making focus harder than it should be";
    case "lighting":
      return confidence === "low" ? "Lighting looks weaker than it should be" : "The work area is not visually reliable";
    case "fit":
      return context.issueTags.has("Space pressure") ? "Space is being squeezed too hard" : "The desk is not using its space well";
  }
}

function issueSummaryForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext, confidence: Confidence): string {
  switch (key) {
    case "comfort":
      if (input.setupType === "Laptop only") {
        return confidence === "low"
          ? "Working down into a laptop screen is likely building strain over time."
          : "Working down into a laptop screen is likely building neck and shoulder strain over time.";
      }
      return confidence === "low"
        ? "Screen and input position look more tiring than they should be."
        : "Screen and input position are making longer sessions more tiring than they should be.";
    case "focus":
      return context.issueTags.has("Visual clutter")
        ? "Too many visible objects or cables are making the desk harder to read at a glance."
        : confidence === "low"
          ? "The setup appears to be adding low-grade friction to focus."
          : "The setup is adding low-grade friction that keeps breaking concentration.";
    case "lighting":
      return confidence === "low"
        ? "The task area does not look visually reliable enough for steady work."
        : "The task area does not have stable, clean light for steady work.";
    case "fit":
      return context.issueTags.has("Space pressure")
        ? "Work tools, screens, and overflow items are competing for the same surface."
        : "The desk needs clearer boundaries between work space and everything else.";
  }
}

function issueImpactForKey(key: ScoreKey, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return "This makes longer sessions more tiring than they need to be.";
    case "focus":
      return context.issueTags.has("Visual clutter")
        ? "This chips away at focus without you noticing." : "This makes it harder to settle into work.";
    case "lighting":
      return "This makes visual work feel heavier, especially later in the day.";
    case "fit":
      return context.issueTags.has("Space pressure")
        ? "This leaves less room to work comfortably." : "This makes the setup feel busier than it needs to.";
  }
}

function buildIssues(
  input: AssessmentInput,
  subScores: DiagnosisSubScore[],
  context: DiagnoseContext,
  quality: QualityAssessment
): DiagnosisIssue[] {
  const limit = quality.depth === "short" ? 2 : quality.depth === "medium" ? 3 : 4;
  return subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .slice(0, limit)
    .map((subScore) => ({
      id: subScore.key,
      label: issueTitleForKey(subScore.key, input, context, quality.confidence),
      severity: clamp(100 - subScore.score, 28, 95),
      confidence: quality.confidence === "high" ? 0.9 : quality.confidence === "moderate" ? 0.8 : 0.66,
      summary: issueSummaryForKey(subScore.key, input, context, quality.confidence),
      impact: issueImpactForKey(subScore.key, context)
    }));
}

function buildDiagnosisTags(input: AssessmentInput, context: DiagnoseContext, constraints: ScoreKey[], quality: QualityAssessment): string[] {
  const tags = [...context.issueTags];
  if (constraints[0] === "comfort") tags.push("Comfort first");
  if (constraints[0] === "lighting") tags.push("Light drag");
  if (constraints[0] === "fit") tags.push("Space pressure");
  if (input.timeExposure === "8+ hours") tags.push("High exposure");
  if (quality.inputQuality === "light") tags.push("Core signals only");
  return unique(tags).slice(0, 4);
}

function buildSummary(
  input: AssessmentInput,
  primary: ScoreKey,
  secondary: ScoreKey | undefined,
  firstFix: string,
  quality: QualityAssessment
): string {
  const cautious = quality.confidence === "low";
  const mainLine = primary === "comfort"
    ? cautious
      ? "Comfort looks like the main thing holding this setup back."
      : "Your setup is mainly being held back by screen position and physical comfort."
    : primary === "focus"
      ? cautious
        ? "Focus looks like the main pressure point here."
        : "Your setup is mainly being held back by visual noise and broken focus."
      : primary === "lighting"
        ? cautious
          ? "Lighting looks weaker than it should be for the way this desk is used."
          : "Your setup is mainly being held back by lighting quality."
        : cautious
          ? "Space pressure looks like the main problem here."
          : "Your setup is mainly being held back by space pressure and fit.";

  const secondaryLine = secondary && quality.depth !== "short"
    ? `The next issue is ${scoreToConstraint(secondary).toLowerCase()}.`
    : "";

  const actionLine = quality.depth === "short"
    ? `Start with ${firstFix.toLowerCase()}.`
    : `Start with ${firstFix.toLowerCase()} before adding anything cosmetic.`;

  const cautionLine = quality.inputQuality === "light"
    ? "This read is based on the core assessment only, so it stays careful about anything beyond the strongest pattern."
    : "";

  const goalLine = input.whatMattersMost === "More premium feel" && quality.depth !== "short"
    ? "A cleaner, more premium finish will land better once the basic setup is working properly."
    : "";

  return [mainLine, secondaryLine, actionLine, cautionLine, goalLine].filter(Boolean).join(" ");
}

function buildWhyThisMatters(issues: DiagnosisIssue[], depth: DetailDepth): string[] {
  const limit = depth === "short" ? 2 : depth === "medium" ? 3 : 4;
  return issues.map((issue) => issue.impact).slice(0, limit);
}

function actionLine(action: string, effect: string, scoreLabel: string): string {
  return `${action} -> ${effect} -> improves ${scoreLabel} score`;
}

function buildFixFirst(
  input: AssessmentInput,
  constraints: ScoreKey[],
  quality: QualityAssessment,
  finishDeferred: boolean
): string[] {
  const items: string[] = [];

  constraints.forEach((key) => {
    switch (key) {
      case "comfort":
        items.push(actionLine(
          input.setupType === "Laptop only" ? "Raise the laptop screen" : "Raise the main screen",
          "reduces neck and shoulder strain",
          "comfort"
        ));
        items.push(actionLine(
          "Bring keyboard and mouse into an easier reach",
          "lets your shoulders stay more relaxed",
          "comfort"
        ));
        break;
      case "focus":
        items.push(actionLine(
          "Clear the main work zone",
          "cuts visual drag",
          "focus"
        ));
        items.push(actionLine(
          "Hide loose cables and low-use items",
          "makes the desk easier to read at a glance",
          "focus"
        ));
        break;
      case "lighting":
        items.push(actionLine(
          "Add direct task light",
          "makes the work area easier on the eyes",
          "lighting"
        ));
        items.push(actionLine(
          "Reduce screen glare or shadow",
          "improves visual comfort through the day",
          "lighting"
        ));
        break;
      case "fit":
        items.push(actionLine(
          "Move low-use items off the desk",
          "gives you back working room",
          "space & fit"
        ));
        items.push(actionLine(
          "Keep one clear work zone",
          "stops the surface feeling overloaded",
          "space & fit"
        ));
        break;
    }
  });

  if (finishDeferred) {
    items.push(actionLine(
      "Leave finish upgrades until the basics feel better",
      "stops aesthetics from masking core friction",
      "overall"
    ));
  }

  if (input.upgradeIntent === "Free improvements first") {
    items.push(actionLine(
      "Test the layout changes for a few days",
      "shows what still needs fixing before you buy anything",
      "overall"
    ));
  }

  return unique(items).slice(0, quality.depth === "short" ? 2 : quality.depth === "medium" ? 3 : 4);
}

function buildScoreImprovements(
  constraints: ScoreKey[],
  input: AssessmentInput,
  quality: QualityAssessment,
  context: DiagnoseContext,
  finishDeferred: boolean
): ScoreImprovement[] {
  const lines: ScoreImprovement[] = [];

  constraints.forEach((key) => {
    switch (key) {
      case "comfort":
        lines.push({
          action: input.setupType === "Laptop only" ? "Raise the laptop screen" : "Raise the main screen",
          effect: quality.confidence === "low" ? "reduces likely posture strain" : "reduces neck strain over time",
          scoreLabel: "comfort"
        });
        break;
      case "focus":
        lines.push({
          action: context.issueTags.has("Visual clutter") ? "Reduce visible clutter" : "Simplify what stays on the desk",
          effect: "makes concentration easier to hold",
          scoreLabel: "focus"
        });
        break;
      case "lighting":
        lines.push({
          action: "Stabilise the task light",
          effect: "improves visual ease through the day",
          scoreLabel: "lighting"
        });
        break;
      case "fit":
        lines.push({
          action: "Free up permanent desk space",
          effect: "gives the setup more usable room",
          scoreLabel: "space & fit"
        });
        break;
    }
  });

  if (finishDeferred && quality.depth !== "short") {
    lines.push({
      action: "Solve the core layout problems before styling the desk",
      effect: "stops premium touches from hiding the real issue",
      scoreLabel: "overall"
    });
  }

  return lines.slice(0, quality.depth === "short" ? 2 : quality.depth === "medium" ? 3 : 4);
}

function categoryForProduct(product: ProductCatalogItem): ScoreKey | null {
  switch (product.category) {
    case "ergonomics":
      return "comfort";
    case "lighting":
      return "lighting";
    case "organization":
      return "focus";
    case "surface":
    case "wellbeing":
      return "fit";
    default:
      return null;
  }
}

function buildProductReasons(
  product: ProductCatalogItem,
  input: AssessmentInput,
  constraints: ScoreKey[],
  context: DiagnoseContext,
  finishDeferred: boolean
): string[] {
  const reasons: string[] = [];
  const topTwo = constraints.slice(0, 2);

  if (context.productSignals.has(product.name)) reasons.push(product.benefits[0]);
  if (topTwo.includes("comfort") && product.category === "ergonomics") reasons.push("Directly supports the comfort problem.");
  if (topTwo.includes("lighting") && product.category === "lighting") reasons.push("Targets the lighting issue without adding desk pressure.");
  if (topTwo.includes("focus") && product.category === "organization") reasons.push("Reduces visual drag quickly.");
  if (topTwo.includes("fit") && (product.name === "Monitor Stand" || product.category === "surface")) reasons.push("Helps the desk use space more cleanly.");
  if (finishDeferred && product.styleFit === "premium") reasons.push("Only worth it once the basic setup is working properly.");
  if (input.upgradeIntent === "Free improvements first") reasons.push("Only worth considering after the free fixes are in place.");

  return unique(reasons).slice(0, 2);
}

function scoreProducts(
  input: AssessmentInput,
  constraints: ScoreKey[],
  subScores: DiagnosisSubScore[],
  context: DiagnoseContext,
  quality: QualityAssessment,
  finishDeferred: boolean
): MatchedProduct[] {
  const limit = quality.depth === "short" ? 1 : quality.depth === "medium" ? 2 : 3;
  const threshold = quality.depth === "short" ? 62 : 50;

  return productCatalog
    .map((product) => {
      const relatedKey = categoryForProduct(product);
      const relatedScore = relatedKey ? subScores.find((item) => item.key === relatedKey)?.score ?? 78 : 78;
      let fitScore = 40;

      if (context.productSignals.has(product.name)) fitScore += 26;
      if (constraints[0] === relatedKey) fitScore += 18;
      if (constraints[1] === relatedKey) fitScore += 9;
      if (relatedScore < 60) fitScore += 12;
      if ((input.deskSize === "Very small" || input.deskSize === "Small") && product.spaceImpact === "high") fitScore -= 16;
      if (input.upgradeIntent === "Free improvements first") fitScore -= 8;
      if (quality.inputQuality === "light") fitScore -= 8;
      if (finishDeferred && product.styleFit === "premium") fitScore -= 20;
      if (product.name === "LumoMist Diffuser" && (constraints[0] === "comfort" || constraints[0] === "lighting" || constraints[0] === "fit")) fitScore -= 18;
      if (input.whatMattersMost === "More premium feel" && !finishDeferred && product.styleFit === "premium") fitScore += 10;

      return {
        name: product.name,
        fitScore: clamp(Math.round(fitScore), 0, 100),
        reasons: buildProductReasons(product, input, constraints, context, finishDeferred)
      };
    })
    .filter((product) => product.fitScore >= threshold)
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, limit);
}

function buildPaidUpgrades(
  products: MatchedProduct[],
  constraints: ScoreKey[],
  input: AssessmentInput,
  quality: QualityAssessment
): string[] {
  if (quality.inputQuality === "light") {
    return [];
  }

  if (input.upgradeIntent === "Free improvements first") {
    return products.slice(0, 1).map((product) => {
      const reason = product.reasons[0]?.replace(/\.$/, "") ?? "solves a clear problem here";
      return `${product.name} -> ${reason.toLowerCase()} -> improves ${constraints[0] === "fit" ? "space & fit" : constraints[0]} score`;
    });
  }

  return products.slice(0, quality.depth === "deep" ? 3 : 2).map((product) => {
    const reason = product.reasons[0]?.replace(/\.$/, "") ?? "solves a clear problem here";
    return `${product.name} -> ${reason.toLowerCase()} -> supports ${constraints[0] === "fit" ? "space & fit" : constraints[0]} score`;
  });
}

function buildNextQuestions(input: AssessmentInput, quality: QualityAssessment): string[] {
  const questions: string[] = [];

  if (!input.extraDetail.trim()) {
    questions.push("What changes through the day: your posture, your light, or your available space?");
  }
  if (input.setupType === "Laptop only") {
    questions.push("Do you use an external keyboard and mouse during longer sessions?");
  }
  if (input.lightingQuality === "Changes throughout the day") {
    questions.push("When does the desk feel worst: morning, afternoon, or evening?");
  }
  if (input.workStyle === "Prefer not to say") {
    questions.push("What kind of work pushes this desk hardest: focused work, calls, or visual tasks?");
  }
  questions.push("Which items truly need to stay on the desk all day?");

  return questions.slice(0, quality.depth === "short" ? 2 : 3);
}

export function diagnoseWorkspace(input: AssessmentInput): DiagnosisResult {
  const context = buildInitialContext();
  const quality = assessInputQuality(input);
  const weights = buildWeights(input, context);

  applySetupSignals(input, context);
  applyFrictionSignals(input, context);
  applyDensitySignals(input, context);
  applyLightingSignals(input, context);
  applyDeskSizeSignals(input, context);
  analyseFreeText(input, context);

  const subScores = buildSubScores(context);
  const finishDeferred = shouldDeprioritiseFinish(input, subScores);

  if (finishDeferred) {
    addReasoning(context, "Premium or cosmetic goals were kept behind the core functional problems.");
  }

  if (quality.inputQuality === "light") {
    addCaution(context, "More detail on how you work would make the diagnosis more specific.");
  }

  const overallScore = buildOverallScore(subScores, weights);
  const constraintOrder = getConstraintOrder(subScores, weights);
  const primary = constraintOrder[0];
  const secondary = constraintOrder[1];
  const issues = buildIssues(input, subScores, context, quality);
  const fixFirst = buildFixFirst(input, constraintOrder, quality, finishDeferred);
  const scoreImprovements = buildScoreImprovements(constraintOrder, input, quality, context, finishDeferred);
  const matchedProducts = scoreProducts(input, constraintOrder, subScores, context, quality, finishDeferred);
  const paidUpgrades = buildPaidUpgrades(matchedProducts, constraintOrder, input, quality);
  const reasoning = unique([...context.reasoning, ...context.cautionFlags]).slice(0, quality.depth === "short" ? 2 : quality.depth === "medium" ? 4 : 5);
  const diagnosisTags = buildDiagnosisTags(input, context, constraintOrder, quality);

  return {
    score: overallScore,
    confidence: quality.confidence,
    confidenceLabel: quality.confidenceLabel,
    inputQuality: quality.inputQuality,
    inputQualityLabel: quality.inputQualityLabel,
    inputQualityNote: quality.inputQualityNote,
    moreDetailPrompt: quality.moreDetailPrompt,
    summary: buildSummary(input, primary, secondary, fixFirst[0] ?? "fixing the main constraint", quality),
    profile: unique([
      input.setupType,
      input.timeExposure,
      input.workStyle,
      input.deskDensity,
      input.lightingQuality,
      input.deskSize,
      input.whatMattersMost,
      input.upgradeIntent,
      ...input.frictionSignals
    ].filter(Boolean) as string[]),
    diagnosisTags,
    primaryConstraint: scoreToConstraint(primary),
    secondaryConstraint: secondary ? scoreToConstraint(secondary) : null,
    subScores,
    mainIssues: issues,
    reasoning,
    whyThisMatters: buildWhyThisMatters(issues, quality.depth),
    freeFixes: { title: "Fix this first", items: fixFirst },
    paidUpgrades: { title: "Upgrades worth considering", items: paidUpgrades },
    scoreImprovements,
    matchedProducts,
    nextQuestions: buildNextQuestions(input, quality)
  };
}
