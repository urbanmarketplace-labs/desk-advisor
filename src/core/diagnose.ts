import { productCatalog } from "@/data/product-catalog";
import type {
  AssessmentInput,
  DiagnosisIssue,
  DiagnosisResult,
  DiagnosisSubScore,
  MatchedProduct,
  ProductCatalogItem,
  ScoreKey
} from "@/types/assessment";

type Confidence = "low" | "medium" | "high";

interface ScoreState {
  score: number;
  reasons: string[];
}

interface DiagnoseContext {
  scores: Record<ScoreKey, ScoreState>;
  issueTags: Set<string>;
  preferenceTags: Set<string>;
  productSignals: Set<string>;
  freeFixes: string[];
  paidUpgrades: string[];
  recommendationRationale: string[];
}

const subScoreLabels: Record<ScoreKey, string> = {
  comfort: "Comfort / ergonomics",
  focus: "Focus / visual clarity",
  lighting: "Lighting / visual quality",
  fit: "Fit / space / upgrade suitability"
};

const scoreWeights: Record<ScoreKey, number> = {
  comfort: 0.31,
  focus: 0.27,
  lighting: 0.2,
  fit: 0.22
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

function buildInitialContext(): DiagnoseContext {
  return {
    scores: {
      comfort: { score: 78, reasons: [] },
      focus: { score: 78, reasons: [] },
      lighting: { score: 78, reasons: [] },
      fit: { score: 78, reasons: [] }
    },
    issueTags: new Set<string>(),
    preferenceTags: new Set<string>(),
    productSignals: new Set<string>(),
    freeFixes: [],
    paidUpgrades: [],
    recommendationRationale: []
  };
}

function addIssueTag(context: DiagnoseContext, ...tags: string[]): void {
  tags.forEach((tag) => context.issueTags.add(tag));
}

function addPreferenceTag(context: DiagnoseContext, ...tags: string[]): void {
  tags.forEach((tag) => context.preferenceTags.add(tag));
}

function addFreeFix(context: DiagnoseContext, ...items: string[]): void {
  context.freeFixes.push(...items);
}

function addPaidUpgrade(context: DiagnoseContext, ...items: string[]): void {
  context.paidUpgrades.push(...items);
}

function signalProducts(context: DiagnoseContext, ...names: string[]): void {
  names.forEach((name) => context.productSignals.add(name));
}

function analyseFreeText(input: AssessmentInput, context: DiagnoseContext): void {
  const detail = input.extraDetail.trim();
  if (!detail) return;

  if (/\b(small|compact|cramped|tight)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -9, "The desk sounds space-constrained.");
    addScoreEffect(context, "focus", -4, "Limited surface area is adding visual pressure.");
    addIssueTag(context, "Space pressure");
    addFreeFix(context, "Keep only essential items on the main work surface and move lower-use objects off the desk.");
    signalProducts(context, "Monitor Stand");
  }

  if (/\b(neck|back|posture|wrist|strain|ache)\b/i.test(detail)) {
    addScoreEffect(context, "comfort", -14, "The notes point to sustained ergonomic strain.");
    addScoreEffect(context, "fit", -5, "Poor positioning is affecting how the desk is being used.");
    addIssueTag(context, "Posture strain");
    addFreeFix(context, "Adjust screen height and input position before changing anything decorative.");
    addPaidUpgrade(context, "If posture still feels compromised after adjustments, prioritise a stand before any styling upgrade.");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
  }

  if (/\b(dark|dim|evening|glare|lighting)\b/i.test(detail)) {
    addScoreEffect(context, "lighting", -13, "The workspace description points to weak task lighting.");
    addScoreEffect(context, "focus", -5, "Visual quality is likely dropping as light changes through the day.");
    addIssueTag(context, "Low light");
    addFreeFix(context, "Position the desk to favour directional light on the task area rather than general room glow.");
    signalProducts(context, "Monitor Light Bar");
  }

  if (/\b(clutter|messy|cables|cable|wires|wire)\b/i.test(detail)) {
    addScoreEffect(context, "focus", -12, "Visible clutter is adding friction.");
    addScoreEffect(context, "fit", -6, "Surface space is being consumed by layout noise.");
    addIssueTag(context, "Visual clutter");
    addFreeFix(context, "Reduce visible cables and remove any object that does not support daily work.");
    addPaidUpgrade(context, "Use cable management only after deciding what genuinely needs to stay in view.");
    signalProducts(context, "Cable Management Kit");
  }

  if (/\b(premium|cleaner|calmer|minimal|minimalist)\b/i.test(detail)) {
    addPreferenceTag(context, "Calmer finish");
    addPaidUpgrade(context, "Only add finishing pieces once the desk feels lighter, clearer, and easier to use.");
    signalProducts(context, "Wool Desk Mat");
  }

  if (/\b(storage|shelf|drawer)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -8, "Storage pressure is affecting the working layout.");
    addIssueTag(context, "Storage pressure");
    addFreeFix(context, "Separate working tools from storage items so the surface is not acting as a holding area.");
  }
}

function applyAssessmentSelections(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.deviceType) {
    case "Laptop only":
      addScoreEffect(context, "comfort", -16, "Laptop-only setups often leave the screen too low.");
      addScoreEffect(context, "fit", -6, "The working position is likely compromised by the device layout.");
      addIssueTag(context, "Posture strain");
      addFreeFix(context, "Raise the screen for longer work blocks and avoid treating the laptop angle as the default working height.");
      addPaidUpgrade(context, "A laptop stand is the most justified first hardware change for this setup.");
      signalProducts(context, "Laptop Stand");
      break;
    case "Laptop and monitor":
      addScoreEffect(context, "comfort", -6, "Mixed-screen setups often create uneven viewing height.");
      addScoreEffect(context, "fit", -4, "The layout may be splitting attention across two heights.");
      signalProducts(context, "Laptop Stand", "Monitor Stand");
      break;
    case "Single external monitor":
      addScoreEffect(context, "comfort", 3, "An external screen gives more positioning flexibility.");
      addScoreEffect(context, "focus", 2, "A single-screen layout is easier to keep visually clear.");
      break;
    case "Dual monitors":
      addScoreEffect(context, "focus", 3, "Dual screens can work well when aligned and simplified.");
      addScoreEffect(context, "fit", -7, "Two displays increase surface pressure quickly.");
      addIssueTag(context, "Space pressure");
      signalProducts(context, "Monitor Stand");
      break;
  }

  if (input.currentFeel.includes("Cluttered")) {
    addScoreEffect(context, "focus", -16, "The desk already feels cluttered.");
    addScoreEffect(context, "fit", -7, "Visual clutter usually reflects a layout problem as well.");
    addIssueTag(context, "Visual clutter");
    addFreeFix(context, "Create one clear work zone and remove secondary objects from that area.");
    signalProducts(context, "Cable Management Kit");
  }
  if (input.currentFeel.includes("Uncomfortable")) {
    addScoreEffect(context, "comfort", -18, "The setup already feels uncomfortable in use.");
    addIssueTag(context, "Posture strain");
  }
  if (input.currentFeel.includes("Too dark")) {
    addScoreEffect(context, "lighting", -18, "Lighting is already being felt as a daily constraint.");
    addScoreEffect(context, "focus", -5, "Weak lighting often reduces clarity and focus together.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }
  if (input.currentFeel.includes("Too cramped")) {
    addScoreEffect(context, "fit", -17, "The desk feels cramped.");
    addScoreEffect(context, "focus", -6, "Tight layouts make it harder to keep the desk visually calm.");
    addIssueTag(context, "Space pressure");
  }
  if (input.currentFeel.includes("Looks flat")) {
    addScoreEffect(context, "fit", -4, "The setup lacks enough structure and finish.");
    addPreferenceTag(context, "Calmer finish");
  }
  if (input.currentFeel.includes("Hard to focus")) {
    addScoreEffect(context, "focus", -18, "The desk is not supporting concentration well enough.");
    addIssueTag(context, "Focus drag");
  }

  if (input.problems.includes("Neck or back discomfort")) {
    addScoreEffect(context, "comfort", -22, "Physical discomfort is a clear ergonomic signal.");
    addScoreEffect(context, "fit", -5, "Screen and input placement are likely contributing.");
    addIssueTag(context, "Posture strain");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
  }
  if (input.problems.includes("Poor lighting")) {
    addScoreEffect(context, "lighting", -22, "Lighting quality is actively getting in the way.");
    addScoreEffect(context, "focus", -8, "Poor lighting also affects visual ease.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }
  if (input.problems.includes("Not enough space")) {
    addScoreEffect(context, "fit", -21, "There is not enough usable surface space.");
    addScoreEffect(context, "focus", -5, "Layout pressure is reducing clarity as well.");
    addIssueTag(context, "Space pressure");
    signalProducts(context, "Monitor Stand");
  }
  if (input.problems.includes("Cable clutter")) {
    addScoreEffect(context, "focus", -14, "Visible cables are adding noise to the setup.");
    addScoreEffect(context, "fit", -8, "Cable load is also affecting usable space.");
    addIssueTag(context, "Cable clutter");
    signalProducts(context, "Cable Management Kit");
  }
  if (input.problems.includes("Hard to focus")) {
    addScoreEffect(context, "focus", -16, "The current layout is not supporting focused work.");
    addIssueTag(context, "Focus drag");
  }
  if (input.problems.includes("Does not feel premium")) {
    addScoreEffect(context, "fit", -5, "The desk lacks enough structure and restraint.");
    addPreferenceTag(context, "Calmer finish");
    signalProducts(context, "Wool Desk Mat");
  }

  switch (input.priority) {
    case "Better comfort":
      context.recommendationRationale.push("Comfort is the main decision lens, so posture and daily ease come first.");
      break;
    case "Cleaner setup":
      context.recommendationRationale.push("The recommendation mix favours cleaner structure before aesthetic extras.");
      addPreferenceTag(context, "Calmer finish");
      break;
    case "Better focus":
      context.recommendationRationale.push("Focus work benefits most from visual calm, usable light, and a disciplined layout.");
      break;
    case "More premium look":
      context.recommendationRationale.push("A more premium look is only being recommended where it supports usability rather than adding noise.");
      addPreferenceTag(context, "Calmer finish");
      signalProducts(context, "Wool Desk Mat", "LumoMist Diffuser");
      break;
  }

  switch (input.upgradeIntent) {
    case "Free improvements first":
      context.recommendationRationale.push("The plan stays conservative and free-first before suggesting products.");
      break;
    case "A few practical upgrades":
      context.recommendationRationale.push("Only a small number of practical upgrades are being prioritised.");
      break;
    case "A cleaner premium setup":
      context.recommendationRationale.push("Finishing upgrades are included only where the core setup is ready for them.");
      addPreferenceTag(context, "Calmer finish");
      break;
  }

  switch (input.deskSize) {
    case "Very small":
      addScoreEffect(context, "fit", -12, "Very small desks need stricter discipline around footprint.");
      addScoreEffect(context, "focus", -4, "Compact desks can feel visually busy more quickly.");
      addIssueTag(context, "Space pressure");
      break;
    case "Small":
      addScoreEffect(context, "fit", -8, "Small desks leave less room for layout errors.");
      addScoreEffect(context, "focus", -2, "A smaller surface makes clarity more important.");
      break;
    case "Large":
      addScoreEffect(context, "fit", 4, "A larger desk gives more room to structure the layout properly.");
      break;
  }

  switch (input.workStyle) {
    case "Deep focus work":
      addScoreEffect(context, "focus", -4, "Focused work needs a calmer visual environment.");
      addScoreEffect(context, "lighting", -2, "Longer concentration blocks make lighting quality more important.");
      break;
    case "Creative work":
      addScoreEffect(context, "lighting", -3, "Creative work benefits from stronger visual quality.");
      break;
    case "Mixed use":
      addScoreEffect(context, "fit", -2, "Mixed-use desks need clearer zoning to avoid feeling overloaded.");
      break;
  }

  if (input.budgetBand === "Under 50") {
    context.recommendationRationale.push("Budget is tight, so high-value free changes and lower-cost upgrades are favoured.");
  }
}

function scoreToConstraint(key: ScoreKey): string {
  switch (key) {
    case "comfort": return "Comfort / ergonomics";
    case "focus": return "Focus / visual clarity";
    case "lighting": return "Lighting / visual quality";
    case "fit": return "Fit / space / upgrade suitability";
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

function buildOverallScore(subScores: DiagnosisSubScore[]): number {
  return Math.round(clamp(subScores.reduce((sum, score) => sum + score.score * scoreWeights[score.key], 0), 24, 96));
}

function buildIssues(subScores: DiagnosisSubScore[]): DiagnosisIssue[] {
  return subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .map((subScore) => ({
      id: subScore.key,
      label: scoreToConstraint(subScore.key),
      severity: clamp(100 - subScore.score, 28, 95),
      confidence: subScore.score <= 56 ? 0.88 : subScore.score <= 68 ? 0.8 : 0.7,
      causes: [subScore.summary]
    }));
}

function buildDiagnosisTags(context: DiagnoseContext, subScores: DiagnosisSubScore[], input: AssessmentInput): string[] {
  const tags = [...context.issueTags];
  if ((subScores.find((score) => score.key === "comfort")?.score ?? 100) < 60) tags.push("Ergonomic risk");
  if ((subScores.find((score) => score.key === "lighting")?.score ?? 100) < 60) tags.push("Low light");
  if ((subScores.find((score) => score.key === "fit")?.score ?? 100) < 60) tags.push("Space pressure");
  if (input.priority === "More premium look" || context.preferenceTags.has("Calmer finish")) tags.push("Calmer finish");
  return unique(tags).slice(0, 4);
}

function buildSummary(input: AssessmentInput, score: number, primary: DiagnosisSubScore, secondary: DiagnosisSubScore | undefined, tags: string[]): string {
  const opening = score < 55
    ? "This workspace is carrying more friction than it needs to."
    : score < 72
      ? "The desk has a workable base, but the setup still has avoidable weak points."
      : "The setup is in a good place overall, but the last gains will come from more selective changes.";

  const priorityLens = input.priority === "Better comfort"
    ? "Comfort should lead the next round of changes."
    : input.priority === "Cleaner setup"
      ? "The clearest improvement will come from a calmer, more disciplined layout."
      : input.priority === "Better focus"
        ? "The next step is reducing friction that interrupts concentration."
        : input.priority === "More premium look"
          ? "A more premium finish should follow structure, not replace it."
          : "The next step is a more selective improvement plan.";

  const secondaryText = secondary ? ` ${scoreToConstraint(secondary.key)} is the next issue behind it.` : "";
  const tagText = tags.length > 0 ? ` Signals include ${tags.join(", ").toLowerCase()}.` : "";

  return `${opening} ${scoreToConstraint(primary.key)} is the main constraint.${secondaryText} ${priorityLens}${tagText}`;
}

function buildFixFirst(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const items: string[] = [];
  const [primary, secondary] = subScores.slice().sort((left, right) => left.score - right.score);

  if (primary.key === "comfort") {
    items.push("Set the screen so the top of the viewing area sits closer to eye level during your main work posture.");
    items.push("Keep keyboard and mouse close enough to avoid reaching through the shoulders.");
  }
  if (primary.key === "focus") {
    items.push("Clear the main work zone so only active tools remain visible during the day.");
    items.push("Route cables behind the desk line before adding any new accessories.");
  }
  if (primary.key === "lighting") {
    items.push("Improve task light on the working area before trying to solve the problem with decorative lighting.");
    items.push("Reduce glare by angling the screen and light source so they are not competing.");
  }
  if (primary.key === "fit") {
    items.push("Define one primary work zone and move storage, chargers, and overflow items away from that surface.");
    items.push("Reduce the permanent footprint of the setup before buying anything new.");
  }
  if (secondary?.key === "lighting") items.push("Check the desk in the evening as well as daytime so the recommendation reflects real use.");
  if (secondary?.key === "focus") items.push("Use fewer visible objects so the desk reads clearly at a glance.");
  if (input.upgradeIntent === "Free improvements first") items.push("Run the layout and posture changes for a few days before deciding whether any product is still necessary.");
  items.push(...context.freeFixes);
  return unique(items).slice(0, 4);
}

function buildBestUpgrades(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const items: string[] = [];
  subScores.slice().sort((left, right) => left.score - right.score).forEach((subScore) => {
    if (subScore.key === "comfort" && subScore.score < 72) items.push("Prioritise a stand that corrects screen height before considering lower-impact accessories.");
    if (subScore.key === "lighting" && subScore.score < 72) items.push("A focused task-light upgrade is justified if the desk is still dim after repositioning.");
    if (subScore.key === "fit" && subScore.score < 72) items.push("Choose upgrades that recover usable surface area rather than adding more objects.");
    if (subScore.key === "focus" && subScore.score < 72) items.push("Organisation products only make sense if they reduce visual noise immediately.");
  });
  if (input.priority === "More premium look") items.push("Add finish-led products only once comfort, layout, and lighting feel settled.");
  items.push(...context.paidUpgrades);
  return unique(items).slice(0, 4);
}

function categoryForProduct(product: ProductCatalogItem): ScoreKey | null {
  switch (product.category) {
    case "ergonomics": return "comfort";
    case "lighting": return "lighting";
    case "organization": return "focus";
    case "surface":
    case "wellbeing": return "fit";
    default: return null;
  }
}

function buildProductReasons(product: ProductCatalogItem, input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const reasons: string[] = [];
  const relatedKey = categoryForProduct(product);
  const relatedScore = relatedKey ? subScores.find((score) => score.key === relatedKey)?.score ?? 100 : 100;
  if (context.productSignals.has(product.name)) reasons.push(product.benefits[0]);
  if (relatedKey && relatedScore < 70) reasons.push(product.benefits[1] ?? product.benefits[0]);
  if (input.priority === "More premium look" && product.styleFit !== "utility") reasons.push("Supports a calmer, more considered finish");
  if (input.priority === "Better comfort" && product.category === "ergonomics") reasons.push("Addresses the main comfort constraint");
  if (input.priority === "Cleaner setup" && product.category === "organization") reasons.push("Improves layout discipline without adding visual noise");
  if (input.priority === "Better focus" && (product.category === "lighting" || product.category === "organization")) reasons.push("Helps the desk feel clearer and easier to work from");
  return unique(reasons).slice(0, 3);
}

function scoreProducts(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): MatchedProduct[] {
  return productCatalog.map((product) => {
    const relatedKey = categoryForProduct(product);
    const relatedScore = relatedKey ? subScores.find((score) => score.key === relatedKey)?.score ?? 78 : 78;
    let fitScore = 46;
    if (context.productSignals.has(product.name)) fitScore += 22;
    if (relatedScore < 60) fitScore += 18;
    else if (relatedScore < 72) fitScore += 10;
    if (input.priority === "Better comfort" && product.category === "ergonomics") fitScore += 14;
    if (input.priority === "Cleaner setup" && product.category === "organization") fitScore += 12;
    if (input.priority === "Better focus" && (product.category === "lighting" || product.category === "organization")) fitScore += 12;
    if (input.priority === "More premium look" && product.styleFit !== "utility") fitScore += 10;
    if ((input.deskSize === "Very small" || input.deskSize === "Small") && product.spaceImpact === "high") fitScore -= 18;
    if (input.budgetBand === "Under 50" && !["Under 50", "50-150"].includes(product.priceBand)) fitScore -= 22;
    if (input.upgradeIntent === "Free improvements first") fitScore -= 8;
    return {
      name: product.name,
      fitScore: clamp(Math.round(fitScore), 0, 100),
      reasons: buildProductReasons(product, input, subScores, context)
    };
  }).sort((left, right) => right.fitScore - left.fitScore).slice(0, 3);
}

function buildNextQuestions(input: AssessmentInput, subScores: DiagnosisSubScore[]): string[] {
  const questions: string[] = [];
  if ((subScores.find((score) => score.key === "lighting")?.score ?? 100) < 70) questions.push("How does the desk feel in the evening compared with daylight?");
  if (input.deviceType === "Laptop only" || input.deviceType === "Laptop and monitor") questions.push("Do you use an external keyboard and mouse during longer sessions?");
  if ((subScores.find((score) => score.key === "fit")?.score ?? 100) < 70) questions.push("Which items need to stay on the desk permanently, and which can move off it?");
  questions.push("Would you rather improve this setup gradually or make one stronger round of upgrades?");
  return unique(questions).slice(0, 3);
}

export function diagnoseWorkspace(input: AssessmentInput): DiagnosisResult {
  const context = buildInitialContext();
  applyAssessmentSelections(input, context);
  analyseFreeText(input, context);

  const subScores = buildSubScores(context);
  const overallScore = buildOverallScore(subScores);
  const lowScores = subScores.filter((score) => score.score < 62).length;
  const confidence: Confidence = lowScores >= 2 ? "high" : lowScores === 1 ? "medium" : "low";
  const sorted = subScores.slice().sort((left, right) => left.score - right.score);
  const primary = sorted[0];
  const secondary = sorted[1];
  const diagnosisTags = buildDiagnosisTags(context, subScores, input);

  return {
    score: overallScore,
    confidence,
    summary: buildSummary(input, overallScore, primary, secondary, diagnosisTags),
    profile: unique([
      input.deviceType,
      input.priority,
      input.upgradeIntent,
      input.deskSize,
      input.workStyle,
      input.budgetBand,
      ...input.currentFeel,
      ...input.problems
    ].filter(Boolean) as string[]),
    diagnosisTags,
    primaryConstraint: scoreToConstraint(primary.key),
    secondaryConstraint: secondary ? scoreToConstraint(secondary.key) : null,
    subScores,
    mainIssues: buildIssues(subScores).slice(0, 4),
    freeFixes: { title: "Fix first", items: buildFixFirst(input, subScores, context) },
    paidUpgrades: { title: "Best upgrades", items: buildBestUpgrades(input, subScores, context) },
    whyTheseRecommendations: unique(context.recommendationRationale).slice(0, 4),
    matchedProducts: scoreProducts(input, subScores, context),
    nextQuestions: buildNextQuestions(input, subScores)
  };
}