import { productCatalog } from "@/data/product-catalog";
import type {
  AssessmentInput,
  DiagnosisIssue,
  DiagnosisResult,
  DiagnosisSubScore,
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
}

const subScoreLabels: Record<ScoreKey, string> = {
  comfort: "Comfort / ergonomics",
  focus: "Focus / visual clarity",
  lighting: "Lighting / visual quality",
  fit: "Space & fit"
};

const neutralScores: Record<ScoreKey, number> = {
  comfort: 82,
  focus: 80,
  lighting: 80,
  fit: 79
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function addScoreEffect(context: DiagnoseContext, key: ScoreKey, delta: number, reason: string): void {
  context.scores[key].score = clamp(context.scores[key].score + delta, 16, 98);
  context.scores[key].reasons.push(reason);
}

function addIssueTag(context: DiagnoseContext, ...tags: string[]): void {
  tags.forEach((tag) => context.issueTags.add(tag));
}

function addReasoning(context: DiagnoseContext, ...lines: string[]): void {
  lines.forEach((line) => context.reasoning.add(line));
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
    reasoning: new Set<string>()
  };
}

function getDetailKeywordCount(detail: string): number {
  const matches = detail.match(/\b(neck|back|wrist|strain|light|lighting|glare|shadow|cable|clutter|space|small|monitor|laptop|focus|desk|storage)\b/gi);
  return matches ? unique(matches.map((item) => item.toLowerCase())).length : 0;
}

function getDataQuality(input: AssessmentInput): { confidence: Confidence; confidenceLabel: string; depth: DetailDepth } {
  let points = 2;
  const detail = input.extraDetail.trim();
  const keywordCount = getDetailKeywordCount(detail);

  if (input.frictionSignals.length === 2 && !input.frictionSignals.includes("Nothing obvious")) points += 1;
  if (detail.length >= 40) points += 1;
  if (keywordCount >= 3) points += 1;
  if (input.lightingQuality !== "Even and bright") points += 1;
  if (input.deskDensity === "Busy" || input.deskDensity === "Overloaded") points += 1;
  if (input.timeExposure === "4-8h" || input.timeExposure === "8h+") points += 1;

  if (points <= 3) {
    return { confidence: "low", confidenceLabel: "Low confidence diagnosis", depth: "short" };
  }
  if (points <= 5) {
    return { confidence: "moderate", confidenceLabel: "Moderate confidence", depth: "medium" };
  }
  return { confidence: "high", confidenceLabel: "High confidence diagnosis", depth: "deep" };
}

function buildWeights(input: AssessmentInput, context: DiagnoseContext): Record<ScoreKey, number> {
  const weights: Record<ScoreKey, number> = {
    comfort: 0.32,
    focus: 0.26,
    lighting: 0.2,
    fit: 0.22
  };

  switch (input.timeExposure) {
    case "<2h":
      weights.comfort -= 0.08;
      weights.lighting -= 0.03;
      weights.focus += 0.04;
      weights.fit += 0.07;
      break;
    case "2-4h":
      weights.comfort -= 0.02;
      weights.fit += 0.02;
      break;
    case "4-8h":
      weights.comfort += 0.08;
      weights.lighting += 0.03;
      weights.fit -= 0.03;
      weights.focus -= 0.02;
      addReasoning(context, "Longer desk hours increased the weight on comfort.");
      break;
    case "8h+":
      weights.comfort += 0.14;
      weights.lighting += 0.05;
      weights.focus += 0.01;
      weights.fit -= 0.06;
      addReasoning(context, "Very long desk hours made comfort the strongest scoring factor.");
      addReasoning(context, "Long desk exposure also increased the weight on lighting quality.");
      break;
  }

  input.frictionSignals.forEach((signal) => {
    switch (signal) {
      case "Space feels limited":
        weights.fit += 0.09;
        weights.focus += 0.03;
        addReasoning(context, "Limited space increased the weight on space and focus.");
        break;
      case "Looks cluttered":
        weights.focus += 0.08;
        weights.fit += 0.03;
        addReasoning(context, "Clutter increased the weight on focus and usable space.");
        break;
      case "Physical discomfort":
        weights.comfort += 0.1;
        weights.fit += 0.02;
        addReasoning(context, "Physical discomfort increased the weight on comfort first.");
        break;
      case "Lighting is not good":
        weights.lighting += 0.09;
        weights.focus += 0.03;
        addReasoning(context, "Poor lighting increased the weight on lighting and visual clarity.");
        break;
      case "Hard to focus":
        weights.focus += 0.1;
        weights.lighting += 0.02;
        addReasoning(context, "Focus issues increased the weight on visual clarity.");
        break;
      default:
        break;
    }
  });

  if (input.deskDensity === "Busy") {
    weights.focus += 0.04;
    weights.fit += 0.04;
    addReasoning(context, "A busy desk increased the weight on focus and usable space.");
  }

  if (input.deskDensity === "Overloaded") {
    weights.focus += 0.06;
    weights.fit += 0.06;
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
      addScoreEffect(context, "comfort", -14, "A laptop-only setup usually leaves the screen too low.");
      addScoreEffect(context, "fit", -5, "The working position is being constrained by the setup itself.");
      addIssueTag(context, "Posture strain");
      signalProducts(context, "Laptop Stand");
      addReasoning(context, "Laptop-only setup lowered the comfort score.");
      if (input.timeExposure === "4-8h" || input.timeExposure === "8h+") {
        addScoreEffect(context, "comfort", -12, "Long hours from a low laptop screen build up strain quickly.");
        addReasoning(context, "Laptop-only setup plus long hours created a strong ergonomics penalty.");
      }
      break;
    case "Laptop raised":
      addScoreEffect(context, "comfort", 6, "A raised laptop gives you a better starting screen height.");
      addScoreEffect(context, "fit", 2, "The setup has more flexibility than a flat laptop position.");
      break;
    case "External monitor":
      addScoreEffect(context, "comfort", 4, "An external monitor gives you more control over screen height.");
      addScoreEffect(context, "focus", 3, "One main display is easier to organise visually.");
      signalProducts(context, "Monitor Stand");
      break;
    case "Multi-monitor":
      addScoreEffect(context, "fit", -10, "Multiple screens increase surface pressure quickly.");
      addScoreEffect(context, "focus", -3, "More screens can make the setup harder to keep calm.");
      addIssueTag(context, "Space pressure");
      signalProducts(context, "Monitor Stand");
      addReasoning(context, "Multi-monitor setup reduced the space and focus scores.");
      if (input.deskSize === "Very small" || input.deskSize === "Small") {
        addScoreEffect(context, "fit", -12, "Multiple screens and limited desk space are pulling against each other.");
        addScoreEffect(context, "focus", -5, "Crowding from the screen layout is reducing clarity.");
        addReasoning(context, "Multi-monitor setup in a smaller space added a strong space penalty.");
      }
      break;
  }
}

function applyFrictionSignals(input: AssessmentInput, context: DiagnoseContext): void {
  input.frictionSignals.forEach((signal) => {
    switch (signal) {
      case "Space feels limited":
        addScoreEffect(context, "fit", -20, "The desk is short on clear working room.");
        addScoreEffect(context, "focus", -7, "Space pressure makes the setup harder to read.");
        addIssueTag(context, "Space pressure");
        signalProducts(context, "Monitor Stand");
        break;
      case "Looks cluttered":
        addScoreEffect(context, "focus", -18, "Too much is competing for attention.");
        addScoreEffect(context, "fit", -9, "The layout is carrying more than it should.");
        addIssueTag(context, "Visual clutter");
        signalProducts(context, "Cable Management Kit", "Wool Desk Mat");
        break;
      case "Physical discomfort":
        addScoreEffect(context, "comfort", -22, "The setup is already creating physical drag.");
        addScoreEffect(context, "fit", -6, "Screen and input position are likely part of the problem.");
        addIssueTag(context, "Posture strain");
        signalProducts(context, "Laptop Stand", "Monitor Stand");
        break;
      case "Lighting is not good":
        addScoreEffect(context, "lighting", -24, "The task area is not lit well enough.");
        addScoreEffect(context, "focus", -9, "Poor light makes focus harder to hold.");
        addIssueTag(context, "Low light");
        signalProducts(context, "Monitor Light Bar");
        break;
      case "Hard to focus":
        addScoreEffect(context, "focus", -22, "The setup is interrupting concentration.");
        addScoreEffect(context, "lighting", -4, "Visual quality may also be part of the drag.");
        addIssueTag(context, "Focus drag");
        signalProducts(context, "Cable Management Kit", "Monitor Light Bar");
        break;
      default:
        addReasoning(context, "No obvious friction signal lowered the certainty of the diagnosis.");
        break;
    }
  });
}

function applyDensitySignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.deskDensity) {
    case "Minimal":
      addScoreEffect(context, "focus", 4, "A lighter desk usually supports clearer thinking.");
      addScoreEffect(context, "fit", 3, "Low density leaves more usable work room.");
      break;
    case "Moderate":
      break;
    case "Busy":
      addScoreEffect(context, "focus", -10, "A busy surface creates extra visual drag.");
      addScoreEffect(context, "fit", -10, "The desk is carrying more than it needs to.");
      addIssueTag(context, "Visual clutter");
      addReasoning(context, "High desk density reduced both focus and space scores.");
      break;
    case "Overloaded":
      addScoreEffect(context, "focus", -16, "An overloaded surface makes it hard to settle into work.");
      addScoreEffect(context, "fit", -18, "Too much of the desk is no longer usable for work itself.");
      addIssueTag(context, "Visual clutter", "Space pressure");
      addReasoning(context, "An overloaded desk sharply reduced usable space.");
      break;
  }
}

function applyLightingSignals(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.lightingQuality) {
    case "Even and bright":
      addScoreEffect(context, "lighting", 8, "The task area has a strong lighting base.");
      addScoreEffect(context, "focus", 4, "Stable light supports easier visual focus.");
      break;
    case "Usable but inconsistent":
      addScoreEffect(context, "lighting", -6, "The desk is workable, but light quality is not stable.");
      addScoreEffect(context, "focus", -3, "Inconsistent light adds low-grade friction.");
      addIssueTag(context, "Light inconsistency");
      break;
    case "Dim / shadowy":
      addScoreEffect(context, "lighting", -18, "The work area is too dim for steady use.");
      addScoreEffect(context, "focus", -8, "Shadowy light makes visual work feel heavier.");
      addIssueTag(context, "Low light");
      addReasoning(context, "Dim lighting reduced both lighting and focus scores.");
      signalProducts(context, "Monitor Light Bar");
      break;
    case "Changes throughout the day":
      addScoreEffect(context, "lighting", -12, "Lighting quality shifts through the day.");
      addScoreEffect(context, "focus", -6, "Changing light makes the setup less reliable to work from.");
      addIssueTag(context, "Light inconsistency");
      addReasoning(context, "Changing light reduced reliability in the lighting score.");
      signalProducts(context, "Monitor Light Bar");
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

  if (/\b(neck|back|wrist|shoulder|strain|ache)\b/i.test(detail)) {
    addScoreEffect(context, "comfort", -10, "Your notes reinforce that comfort is taking a hit.");
    addIssueTag(context, "Posture strain");
    addReasoning(context, "Your notes added more weight to the comfort diagnosis.");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
  }

  if (/\b(light|lighting|glare|shadow|dark|dim|window)\b/i.test(detail)) {
    addScoreEffect(context, "lighting", -8, "Your notes point to a lighting issue beyond the basic signal.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }

  if (/\b(clutter|cable|wire|mess|busy)\b/i.test(detail)) {
    addScoreEffect(context, "focus", -7, "Your notes reinforce visual drag on the desk.");
    addScoreEffect(context, "fit", -4, "Loose items are also affecting usable space.");
    addIssueTag(context, "Visual clutter");
    signalProducts(context, "Cable Management Kit");
  }

  if (/\b(storage|drawer|shelf|paper|equipment)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -6, "The desk is carrying storage pressure as well as work.");
    addIssueTag(context, "Space pressure");
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
      22,
      96
    )
  );
}

function getPrimaryConstraints(subScores: DiagnosisSubScore[], weights: Record<ScoreKey, number>): ScoreKey[] {
  return subScores
    .slice()
    .sort((left, right) => ((100 - right.score) * weights[right.key]) - ((100 - left.score) * weights[left.key]))
    .map((item) => item.key);
}

function scoreToConstraint(key: ScoreKey): string {
  return subScoreLabels[key];
}

function issueTitleForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return input.setupType === "Laptop only" ? "Your screen position is dragging comfort down" : "Your setup is creating physical drag";
    case "focus":
      return context.issueTags.has("Visual clutter") ? "Too much is competing for attention" : "The desk is making focus harder than it should be";
    case "lighting":
      return "The work area is not visually reliable";
    case "fit":
      return context.issueTags.has("Space pressure") ? "Space is being squeezed too hard" : "The desk is not using its space well";
  }
}

function issueSummaryForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return input.setupType === "Laptop only"
        ? "Working down into a laptop screen is likely building neck strain over time."
        : "Screen and input position are making long sessions more tiring than they should be.";
    case "focus":
      return context.issueTags.has("Visual clutter")
        ? "Too many visible objects or cables are making the desk harder to read at a glance."
        : "The setup is adding low-grade friction that keeps breaking concentration.";
    case "lighting":
      return "The task area does not have stable, clean light for steady work.";
    case "fit":
      return context.issueTags.has("Space pressure")
        ? "Work tools, screens, and overflow items are competing for the same surface."
        : "The desk needs clearer boundaries between work space and everything else.";
  }
}

function issueImpactForKey(key: ScoreKey, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return "This makes longer sessions more tiring.";
    case "focus":
      return context.issueTags.has("Visual clutter")
        ? "This chips away at focus without asking permission."
        : "This makes it harder to stay settled in your work.";
    case "lighting":
      return "This makes visual work feel heavier, especially later in the day.";
    case "fit":
      return context.issueTags.has("Space pressure")
        ? "This leaves less room to work comfortably."
        : "This makes the setup feel busier than it needs to.";
  }
}

function buildIssues(
  input: AssessmentInput,
  subScores: DiagnosisSubScore[],
  context: DiagnoseContext,
  depth: DetailDepth
): DiagnosisIssue[] {
  const limit = depth === "short" ? 2 : depth === "medium" ? 3 : 4;
  return subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .slice(0, limit)
    .map((subScore) => ({
      id: subScore.key,
      label: issueTitleForKey(subScore.key, input, context),
      severity: clamp(100 - subScore.score, 28, 95),
      confidence: subScore.score <= 56 ? 0.88 : subScore.score <= 68 ? 0.8 : 0.7,
      summary: issueSummaryForKey(subScore.key, input, context),
      impact: issueImpactForKey(subScore.key, context)
    }));
}

function buildDiagnosisTags(input: AssessmentInput, context: DiagnoseContext, constraints: ScoreKey[]): string[] {
  const tags = [...context.issueTags];
  if (constraints[0] === "comfort") tags.push("Comfort first");
  if (constraints[0] === "lighting") tags.push("Light drag");
  if (constraints[0] === "fit") tags.push("Space pressure");
  if (input.timeExposure === "8h+") tags.push("High exposure");
  return unique(tags).slice(0, 4);
}

function buildSummary(
  input: AssessmentInput,
  primary: ScoreKey,
  secondary: ScoreKey | undefined,
  firstFix: string,
  confidence: Confidence
): string {
  const opener = confidence === "low"
    ? "From the signals here, a few things look more important than the rest."
    : confidence === "moderate"
      ? "The pattern is fairly clear."
      : "The pattern is clear.";

  const mainLine = primary === "comfort"
    ? "Your setup is mainly being held back by screen position and physical comfort."
    : primary === "focus"
      ? "Your setup is mainly being held back by visual noise and broken focus."
      : primary === "lighting"
        ? "Your setup is mainly being held back by lighting quality."
        : "Your setup is mainly being held back by space pressure and fit.";

  const secondaryLine = secondary
    ? `The next issue is ${scoreToConstraint(secondary).toLowerCase()}.`
    : "";

  const actionLine = `Start with ${firstFix.toLowerCase()}.`;

  return [opener, mainLine, secondaryLine, actionLine].filter(Boolean).join(" ");
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
  context: DiagnoseContext,
  depth: DetailDepth
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
          "Bring keyboard and mouse closer",
          "lets your shoulders stay relaxed",
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
          "Hide loose cables",
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
          "Reduce glare around the screen",
          "improves visual comfort",
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

  if (input.upgradeIntent === "Free improvements first") {
    items.push(actionLine(
      "Test the layout changes for a few days",
      "shows what still needs fixing",
      "overall"
    ));
  }

  return unique(items).slice(0, depth === "short" ? 2 : depth === "medium" ? 3 : 4);
}

function buildScoreImprovements(
  constraints: ScoreKey[],
  input: AssessmentInput,
  context: DiagnoseContext,
  depth: DetailDepth
): ScoreImprovement[] {
  const lines: ScoreImprovement[] = [];

  constraints.forEach((key) => {
    switch (key) {
      case "comfort":
        lines.push({
          action: input.setupType === "Laptop only" ? "Raise the laptop screen" : "Raise the main screen",
          effect: "reduces neck strain over time",
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

  return lines.slice(0, depth === "short" ? 2 : depth === "medium" ? 3 : 4);
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
  context: DiagnoseContext
): string[] {
  const reasons: string[] = [];
  const topTwo = constraints.slice(0, 2);

  if (context.productSignals.has(product.name)) reasons.push(product.benefits[0]);

  if (topTwo.includes("comfort") && product.category === "ergonomics") {
    reasons.push("Directly supports the comfort problem.");
  }
  if (topTwo.includes("lighting") && product.category === "lighting") {
    reasons.push("Targets the lighting issue without adding desk pressure.");
  }
  if (topTwo.includes("focus") && product.category === "organization") {
    reasons.push("Reduces visual drag quickly.");
  }
  if (topTwo.includes("fit") && (product.name === "Monitor Stand" || product.category === "surface")) {
    reasons.push("Helps the desk use space more cleanly.");
  }
  if (input.upgradeIntent === "Free improvements first") {
    reasons.push("Only worth it after the free layout fixes are in place.");
  }

  return unique(reasons).slice(0, 2);
}

function scoreProducts(
  input: AssessmentInput,
  constraints: ScoreKey[],
  subScores: DiagnosisSubScore[],
  context: DiagnoseContext,
  depth: DetailDepth
): MatchedProduct[] {
  const limit = depth === "short" ? 1 : depth === "medium" ? 2 : 3;

  return productCatalog
    .map((product) => {
      const relatedKey = categoryForProduct(product);
      const relatedScore = relatedKey ? subScores.find((item) => item.key === relatedKey)?.score ?? 78 : 78;
      let fitScore = 42;

      if (context.productSignals.has(product.name)) fitScore += 26;
      if (constraints[0] === relatedKey) fitScore += 18;
      if (constraints[1] === relatedKey) fitScore += 10;
      if (relatedScore < 60) fitScore += 12;
      if ((input.deskSize === "Very small" || input.deskSize === "Small") && product.spaceImpact === "high") fitScore -= 16;
      if (input.upgradeIntent === "Free improvements first") fitScore -= 8;
      if (product.name === "LumoMist Diffuser" && (constraints[0] === "comfort" || constraints[0] === "lighting" || constraints[0] === "fit")) fitScore -= 16;

      return {
        name: product.name,
        fitScore: clamp(Math.round(fitScore), 0, 100),
        reasons: buildProductReasons(product, input, constraints, context)
      };
    })
    .filter((product) => product.fitScore >= 48)
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, limit);
}

function buildPaidUpgrades(
  products: MatchedProduct[],
  constraints: ScoreKey[],
  input: AssessmentInput,
  depth: DetailDepth
): string[] {
  if (input.upgradeIntent === "Free improvements first") {
    return products.slice(0, 1).map((product) => {
      const reason = product.reasons[0]?.replace(/\.$/, "") ?? "solves a clear problem here";
      return `${product.name} -> ${reason.toLowerCase()} -> improves ${constraints[0] === "fit" ? "space & fit" : constraints[0]} score`;
    });
  }

  return products.slice(0, depth === "deep" ? 3 : 2).map((product) => {
    const reason = product.reasons[0]?.replace(/\.$/, "") ?? "solves a clear problem here";
    return `${product.name} -> ${reason.toLowerCase()} -> supports ${constraints[0] === "fit" ? "space & fit" : constraints[0]} score`;
  });
}

function buildNextQuestions(input: AssessmentInput, depth: DetailDepth): string[] {
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
  questions.push("Which items truly need to stay on the desk all day?");

  return questions.slice(0, depth === "short" ? 2 : 3);
}

export function diagnoseWorkspace(input: AssessmentInput): DiagnosisResult {
  const context = buildInitialContext();
  const quality = getDataQuality(input);
  const weights = buildWeights(input, context);

  applySetupSignals(input, context);
  applyFrictionSignals(input, context);
  applyDensitySignals(input, context);
  applyLightingSignals(input, context);
  applyDeskSizeSignals(input, context);
  analyseFreeText(input, context);

  const subScores = buildSubScores(context);
  const overallScore = buildOverallScore(subScores, weights);
  const constraintOrder = getPrimaryConstraints(subScores, weights);
  const primary = constraintOrder[0];
  const secondary = constraintOrder[1];
  const diagnosisTags = buildDiagnosisTags(input, context, constraintOrder);
  const issues = buildIssues(input, subScores, context, quality.depth);
  const fixFirst = buildFixFirst(input, constraintOrder, context, quality.depth);
  const scoreImprovements = buildScoreImprovements(constraintOrder, input, context, quality.depth);
  const matchedProducts = scoreProducts(input, constraintOrder, subScores, context, quality.depth);
  const paidUpgrades = buildPaidUpgrades(matchedProducts, constraintOrder, input, quality.depth);

  return {
    score: overallScore,
    confidence: quality.confidence,
    confidenceLabel: quality.confidenceLabel,
    summary: buildSummary(input, primary, secondary, fixFirst[0] ?? "fixing the main constraint", quality.confidence),
    profile: unique([
      input.timeExposure,
      input.setupType,
      input.deskDensity,
      input.lightingQuality,
      input.deskSize,
      input.upgradeIntent,
      ...input.frictionSignals
    ].filter(Boolean) as string[]),
    diagnosisTags,
    primaryConstraint: scoreToConstraint(primary),
    secondaryConstraint: secondary ? scoreToConstraint(secondary) : null,
    subScores,
    mainIssues: issues,
    reasoning: Array.from(context.reasoning).slice(0, quality.depth === "short" ? 2 : quality.depth === "medium" ? 3 : 4),
    whyThisMatters: buildWhyThisMatters(issues, quality.depth),
    freeFixes: { title: "Fix this first", items: fixFirst },
    paidUpgrades: { title: "Upgrades worth considering", items: paidUpgrades },
    scoreImprovements,
    matchedProducts,
    nextQuestions: buildNextQuestions(input, quality.depth)
  };
}
