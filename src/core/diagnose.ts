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
  comfort: "Comfort",
  focus: "Focus",
  lighting: "Lighting",
  fit: "Space & fit"
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

function hasSpacePressure(input: AssessmentInput, context: DiagnoseContext): boolean {
  return (
    context.issueTags.has("Space pressure")
    || input.currentFeel.includes("Too cramped")
    || input.problems.includes("Not enough space")
    || input.deskSize === "Very small"
    || input.deskSize === "Small"
  );
}

function hasVisualNoise(input: AssessmentInput, context: DiagnoseContext): boolean {
  return (
    context.issueTags.has("Visual clutter")
    || context.issueTags.has("Cable clutter")
    || input.currentFeel.includes("Cluttered")
    || input.problems.includes("Cable clutter")
  );
}

function analyseFreeText(input: AssessmentInput, context: DiagnoseContext): void {
  const detail = input.extraDetail.trim();
  if (!detail) return;

  if (/\b(small|compact|cramped|tight)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -9, "Usable desk space is tight.");
    addScoreEffect(context, "focus", -4, "Limited surface space makes the setup feel busier.");
    addIssueTag(context, "Space pressure");
    addFreeFix(context, "Move low-use items off the desk so the main surface can do one job well.");
    signalProducts(context, "Monitor Stand");
  }

  if (/\b(neck|back|posture|wrist|strain|ache)\b/i.test(detail)) {
    addScoreEffect(context, "comfort", -14, "Your notes point to strain during normal use.");
    addScoreEffect(context, "fit", -5, "Screen and input position are likely working against you.");
    addIssueTag(context, "Posture strain");
    addFreeFix(context, "Set the screen and input position before changing anything cosmetic.");
    addPaidUpgrade(context, "If the screen still sits too low after adjustment, a stand is worth it.");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
  }

  if (/\b(dark|dim|evening|glare|lighting)\b/i.test(detail)) {
    addScoreEffect(context, "lighting", -13, "The desk is not getting enough clean task light.");
    addScoreEffect(context, "focus", -5, "Weak light makes visual work feel heavier.");
    addIssueTag(context, "Low light");
    addFreeFix(context, "Aim more direct light at the task area, not just the room around it.");
    signalProducts(context, "Monitor Light Bar");
  }

  if (/\b(clutter|messy|cables|cable|wires|wire)\b/i.test(detail)) {
    addScoreEffect(context, "focus", -12, "Visual noise is getting in the way.");
    addScoreEffect(context, "fit", -6, "Loose cables and overflow items are eating into usable space.");
    addIssueTag(context, "Visual clutter", "Cable clutter");
    addFreeFix(context, "Hide loose cables and remove any object that is not helping daily work.");
    addPaidUpgrade(context, "Buy cable tools only after deciding what really needs to stay on the desk.");
    signalProducts(context, "Cable Management Kit");
  }

  if (/\b(premium|cleaner|calmer|minimal|minimalist)\b/i.test(detail)) {
    addPreferenceTag(context, "Calmer finish");
    addPaidUpgrade(context, "Add finish-led pieces only once the setup feels lighter and easier to use.");
    signalProducts(context, "Wool Desk Mat");
  }

  if (/\b(storage|shelf|drawer)\b/i.test(detail)) {
    addScoreEffect(context, "fit", -8, "The desk is carrying storage pressure as well as work.");
    addIssueTag(context, "Storage pressure");
    addFreeFix(context, "Split working tools from storage so the desk stops acting like overflow space.");
  }
}

function applyAssessmentSelections(input: AssessmentInput, context: DiagnoseContext): void {
  switch (input.deviceType) {
    case "Laptop only":
      addScoreEffect(context, "comfort", -16, "A laptop screen usually sits too low for long sessions.");
      addScoreEffect(context, "fit", -6, "The working position is being limited by the device setup.");
      addIssueTag(context, "Posture strain");
      addFreeFix(context, "Raise the screen for longer work blocks instead of working down into it.");
      addPaidUpgrade(context, "A laptop stand is the clearest hardware fix if this is your main setup.");
      signalProducts(context, "Laptop Stand");
      break;
    case "Laptop and monitor":
      addScoreEffect(context, "comfort", -6, "Two screen heights can pull posture out of line.");
      addScoreEffect(context, "fit", -4, "The layout may be splitting your attention across two positions.");
      signalProducts(context, "Laptop Stand", "Monitor Stand");
      break;
    case "Single external monitor":
      addScoreEffect(context, "comfort", 3, "An external screen gives you more control over height.");
      addScoreEffect(context, "focus", 2, "One main screen is easier to keep clean and clear.");
      break;
    case "Dual monitors":
      addScoreEffect(context, "focus", 3, "Two screens can work well when the layout stays disciplined.");
      addScoreEffect(context, "fit", -7, "Two displays increase desk pressure quickly.");
      addIssueTag(context, "Space pressure");
      signalProducts(context, "Monitor Stand");
      break;
  }

  if (input.currentFeel.includes("Cluttered")) {
    addScoreEffect(context, "focus", -16, "Too much is competing for attention.");
    addScoreEffect(context, "fit", -7, "The layout is using more space than it should.");
    addIssueTag(context, "Visual clutter");
    addFreeFix(context, "Create one clear work zone and strip out everything that does not support it.");
    signalProducts(context, "Cable Management Kit");
  }
  if (input.currentFeel.includes("Uncomfortable")) {
    addScoreEffect(context, "comfort", -18, "The setup already feels physically wrong.");
    addIssueTag(context, "Posture strain");
  }
  if (input.currentFeel.includes("Too dark")) {
    addScoreEffect(context, "lighting", -18, "The desk does not feel bright enough to work from comfortably.");
    addScoreEffect(context, "focus", -5, "Weak light makes it harder to settle into work.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }
  if (input.currentFeel.includes("Too cramped")) {
    addScoreEffect(context, "fit", -17, "There is not enough clear working room.");
    addScoreEffect(context, "focus", -6, "A tight layout makes the desk feel visually heavier.");
    addIssueTag(context, "Space pressure");
  }
  if (input.currentFeel.includes("Looks flat")) {
    addScoreEffect(context, "fit", -4, "The setup needs more structure, not more stuff.");
    addPreferenceTag(context, "Calmer finish");
  }
  if (input.currentFeel.includes("Hard to focus")) {
    addScoreEffect(context, "focus", -18, "The desk is adding friction instead of removing it.");
    addIssueTag(context, "Focus drag");
  }

  if (input.problems.includes("Neck or back discomfort")) {
    addScoreEffect(context, "comfort", -22, "Your screen and input position are costing you comfort.");
    addScoreEffect(context, "fit", -5, "The desk is not supporting a better working posture yet.");
    addIssueTag(context, "Posture strain");
    signalProducts(context, "Laptop Stand", "Monitor Stand");
  }
  if (input.problems.includes("Poor lighting")) {
    addScoreEffect(context, "lighting", -22, "Light quality is actively getting in the way.");
    addScoreEffect(context, "focus", -8, "Poor light also makes focus harder to hold.");
    addIssueTag(context, "Low light");
    signalProducts(context, "Monitor Light Bar");
  }
  if (input.problems.includes("Not enough space")) {
    addScoreEffect(context, "fit", -21, "The desk is short on usable space.");
    addScoreEffect(context, "focus", -5, "Crowding is making the setup harder to read.");
    addIssueTag(context, "Space pressure");
    signalProducts(context, "Monitor Stand");
  }
  if (input.problems.includes("Cable clutter")) {
    addScoreEffect(context, "focus", -14, "Loose cables are keeping the desk visually busy.");
    addScoreEffect(context, "fit", -8, "Cable load is also stealing working room.");
    addIssueTag(context, "Cable clutter");
    signalProducts(context, "Cable Management Kit");
  }
  if (input.problems.includes("Hard to focus")) {
    addScoreEffect(context, "focus", -16, "The setup is not helping you get into deep work.");
    addIssueTag(context, "Focus drag");
  }
  if (input.problems.includes("Does not feel premium")) {
    addScoreEffect(context, "fit", -5, "The desk needs more restraint and stronger structure.");
    addPreferenceTag(context, "Calmer finish");
    signalProducts(context, "Wool Desk Mat");
  }

  switch (input.priority) {
    case "Better comfort":
      context.recommendationRationale.push("Comfort comes first, so screen position and daily ease lead the plan.");
      break;
    case "Cleaner setup":
      context.recommendationRationale.push("The quickest win is a cleaner, calmer layout.");
      addPreferenceTag(context, "Calmer finish");
      break;
    case "Better focus":
      context.recommendationRationale.push("Focus improves when the desk feels visually lighter and easier to read.");
      break;
    case "More premium look":
      context.recommendationRationale.push("A more premium feel should come from better structure, not extra clutter.");
      addPreferenceTag(context, "Calmer finish");
      signalProducts(context, "Wool Desk Mat", "LumoMist Diffuser");
      break;
  }

  switch (input.upgradeIntent) {
    case "Free improvements first":
      context.recommendationRationale.push("The plan stays free-first unless a product solves a clear problem.");
      break;
    case "A few practical upgrades":
      context.recommendationRationale.push("Only a small number of high-value upgrades are being kept in play.");
      break;
    case "A cleaner premium setup":
      context.recommendationRationale.push("Finish-led upgrades are included only where the desk is ready for them.");
      addPreferenceTag(context, "Calmer finish");
      break;
  }

  switch (input.deskSize) {
    case "Very small":
      addScoreEffect(context, "fit", -12, "A very small desk leaves little room for layout mistakes.");
      addScoreEffect(context, "focus", -4, "Small surfaces feel busy faster.");
      addIssueTag(context, "Space pressure");
      break;
    case "Small":
      addScoreEffect(context, "fit", -8, "A small desk needs tighter control over footprint.");
      addScoreEffect(context, "focus", -2, "Clearer layout matters more when surface area is limited.");
      break;
    case "Large":
      addScoreEffect(context, "fit", 4, "A larger desk gives you more room to organise the setup well.");
      break;
  }

  switch (input.workStyle) {
    case "Deep focus work":
      addScoreEffect(context, "focus", -4, "Deep work needs a calmer visual field.");
      addScoreEffect(context, "lighting", -2, "Longer sessions make light quality more important.");
      break;
    case "Creative work":
      addScoreEffect(context, "lighting", -3, "Creative work usually asks more from visual quality.");
      break;
    case "Mixed use":
      addScoreEffect(context, "fit", -2, "Mixed-use desks need stronger boundaries to stay clear.");
      break;
  }

  if (input.budgetBand === "Under 50") {
    context.recommendationRationale.push("The recommendations lean toward high-value free fixes and lower-cost wins.");
  }
}

function scoreToConstraint(key: ScoreKey): string {
  switch (key) {
    case "comfort":
      return "Comfort";
    case "focus":
      return "Focus";
    case "lighting":
      return "Lighting";
    case "fit":
      return "Space & fit";
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

function issueTitleForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return input.deviceType === "Laptop only" ? "Your screen is too low" : "Your setup is putting strain on you";
    case "focus":
      return hasVisualNoise(input, context) ? "Too much is competing for attention" : "The desk is interrupting focus";
    case "lighting":
      return "The work area is underlit";
    case "fit":
      return hasSpacePressure(input, context) ? "The desk is carrying too much" : "Space is being used badly";
  }
}

function issueSummaryForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return input.deviceType === "Laptop only"
        ? "Looking down at the laptop screen pulls your neck and shoulders forward."
        : "Screen and input position are working against a more relaxed posture.";
    case "focus":
      return hasVisualNoise(input, context)
        ? "Loose cables and extra objects make the desk harder to read at a glance."
        : "The setup is adding small bits of friction that keep breaking concentration.";
    case "lighting":
      return "The task area is not getting enough clean, direct light.";
    case "fit":
      return hasSpacePressure(input, context)
        ? "Work tools, storage, and overflow items are competing for the same surface."
        : "The setup needs clearer boundaries between work space and everything else.";
  }
}

function issueImpactForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string {
  switch (key) {
    case "comfort":
      return "Long sessions feel more tiring than they should.";
    case "focus":
      return hasVisualNoise(input, context)
        ? "Focus drops even when you are trying to settle in."
        : "You lose momentum without always noticing why.";
    case "lighting":
      return "Your eyes work harder, especially later in the day.";
    case "fit":
      return hasSpacePressure(input, context)
        ? "The desk feels cramped faster and leaves less room to work."
        : "The setup feels busier than it needs to.";
  }
}

function buildIssues(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): DiagnosisIssue[] {
  return subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .map((subScore) => ({
      id: subScore.key,
      label: issueTitleForKey(subScore.key, input, context),
      severity: clamp(100 - subScore.score, 28, 95),
      confidence: subScore.score <= 56 ? 0.88 : subScore.score <= 68 ? 0.8 : 0.7,
      summary: issueSummaryForKey(subScore.key, input, context),
      impact: issueImpactForKey(subScore.key, input, context)
    }));
}

function buildDiagnosisTags(context: DiagnoseContext, subScores: DiagnosisSubScore[], input: AssessmentInput): string[] {
  const tags = [...context.issueTags];
  if ((subScores.find((score) => score.key === "comfort")?.score ?? 100) < 60) tags.push("Comfort drag");
  if ((subScores.find((score) => score.key === "lighting")?.score ?? 100) < 60) tags.push("Low light");
  if ((subScores.find((score) => score.key === "fit")?.score ?? 100) < 60) tags.push("Space pressure");
  if (input.priority === "More premium look" || context.preferenceTags.has("Calmer finish")) tags.push("Calmer finish");
  return unique(tags).slice(0, 4);
}

function summaryConstraint(key: ScoreKey): string {
  switch (key) {
    case "comfort":
      return "screen position and comfort";
    case "focus":
      return "visual noise and focus";
    case "lighting":
      return "light on the work area";
    case "fit":
      return "usable desk space";
  }
}

function buildSummary(score: number, primary: ScoreKey, firstAction: string): string {
  const opening = score < 55
    ? "You've got a few core issues, but they are fixable."
    : score < 72
      ? "You've got a solid base, but a few things are holding it back."
      : "Your setup is in good shape. The next gains come from a few targeted fixes.";

  return `${opening} The main issue is ${summaryConstraint(primary)}. Start with ${firstAction.toLowerCase()}.`;
}

function buildWhyThisMatters(subScores: DiagnosisSubScore[], input: AssessmentInput, context: DiagnoseContext): string[] {
  return unique(
    subScores
      .slice()
      .sort((left, right) => left.score - right.score)
      .slice(0, 3)
      .map((subScore) => issueImpactForKey(subScore.key, input, context))
  );
}

function baseFixesForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string[] {
  switch (key) {
    case "comfort":
      return [
        input.deviceType === "Laptop only"
          ? "Raise the laptop screen so you are not looking down all day."
          : "Set the main screen closer to eye level and keep it directly in front of you.",
        "Bring keyboard and mouse close enough that your shoulders can stay relaxed."
      ];
    case "focus":
      return [
        "Clear the main work zone until only active tools remain.",
        hasVisualNoise(input, context)
          ? "Hide loose cables before buying anything else for the desk."
          : "Reduce what stays visible on the surface during the day."
      ];
    case "lighting":
      return [
        "Add cleaner light to the area you actually work in.",
        "Angle the screen and light source so they are not fighting each other."
      ];
    case "fit":
      return [
        "Move storage and overflow items off the main work surface.",
        "Give the desk one clear working zone instead of asking it to hold everything."
      ];
  }
}

function buildFixFirst(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const [primary, secondary] = subScores.slice().sort((left, right) => left.score - right.score);
  const items = [
    ...baseFixesForKey(primary.key, input, context),
    ...(secondary ? baseFixesForKey(secondary.key, input, context).slice(0, 1) : []),
    ...context.freeFixes
  ];

  if (input.upgradeIntent === "Free improvements first") {
    items.push("Live with the layout changes for a few days before deciding if you still need a product.");
  }

  return unique(items).slice(0, 4);
}

function upgradeLinesForKey(key: ScoreKey, input: AssessmentInput, context: DiagnoseContext): string[] {
  switch (key) {
    case "comfort":
      return [
        input.deviceType === "Laptop only"
          ? "A laptop stand is worth it if the screen still sits too low after adjustment."
          : "A monitor stand makes sense if better screen height would also improve posture."
      ];
    case "focus":
      return [
        hasVisualNoise(input, context)
          ? "Cable tools are worth it if loose wires keep pulling the desk back into clutter."
          : "Organisation products only help if they remove visual drag straight away."
      ];
    case "lighting":
      return ["A focused task light is justified if the desk still drops into shadow later in the day."];
    case "fit":
      return ["A stand that lifts the screen can also give you back working room."];
  }
}

function buildBestUpgrades(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const items = subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .flatMap((subScore) => (subScore.score < 72 ? upgradeLinesForKey(subScore.key, input, context) : []));

  if (input.priority === "More premium look") {
    items.push("Add finish-led pieces only after comfort, light, and layout feel settled.");
  }

  items.push(...context.paidUpgrades);

  return unique(items).slice(0, input.upgradeIntent === "Free improvements first" ? 2 : 4);
}

function buildScoreImprovements(subScores: DiagnosisSubScore[], input: AssessmentInput, context: DiagnoseContext): ScoreImprovement[] {
  const improvements: ScoreImprovement[] = [];

  subScores
    .slice()
    .sort((left, right) => left.score - right.score)
    .slice(0, 4)
    .forEach((subScore) => {
      switch (subScore.key) {
        case "comfort":
          improvements.push({
            action: input.deviceType === "Laptop only" ? "Raise the laptop screen" : "Raise the main screen",
            effect: "reduces neck and shoulder strain",
            scoreLabel: "comfort"
          });
          break;
        case "focus":
          improvements.push({
            action: hasVisualNoise(input, context) ? "Hide loose cables and clear the work zone" : "Reduce what stays visible on the desk",
            effect: "cuts visual drag and makes focus easier to hold",
            scoreLabel: "focus"
          });
          break;
        case "lighting":
          improvements.push({
            action: "Add direct task light",
            effect: "makes the work area easier on the eyes",
            scoreLabel: "lighting"
          });
          break;
        case "fit":
          improvements.push({
            action: "Free up permanent desk space",
            effect: "gives you more room to work comfortably",
            scoreLabel: "space & fit"
          });
          break;
      }
    });

  return unique(improvements.map((item) => `${item.action}|${item.effect}|${item.scoreLabel}`)).map((item) => {
    const [action, effect, scoreLabel] = item.split("|");
    return { action, effect, scoreLabel };
  }).slice(0, 4);
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

function buildProductReasons(product: ProductCatalogItem, input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): string[] {
  const reasons: string[] = [];
  const relatedKey = categoryForProduct(product);
  const relatedScore = relatedKey ? subScores.find((score) => score.key === relatedKey)?.score ?? 100 : 100;

  if (context.productSignals.has(product.name)) reasons.push(product.benefits[0]);
  if (relatedKey && relatedScore < 70) reasons.push(product.benefits[1] ?? product.benefits[0]);

  if (input.priority === "More premium look" && product.styleFit !== "utility") {
    reasons.push("Helps the desk feel calmer and more considered");
  }
  if (input.priority === "Better comfort" && product.category === "ergonomics") {
    reasons.push("Directly supports the comfort issue");
  }
  if (input.priority === "Cleaner setup" && product.category === "organization") {
    reasons.push("Makes the layout feel cleaner without adding noise");
  }
  if (input.priority === "Better focus" && (product.category === "lighting" || product.category === "organization")) {
    reasons.push("Makes it easier to settle into work");
  }

  return unique(reasons).slice(0, 2);
}

function scoreProducts(input: AssessmentInput, subScores: DiagnosisSubScore[], context: DiagnoseContext): MatchedProduct[] {
  return productCatalog
    .map((product) => {
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
    })
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 3);
}

function buildNextQuestions(input: AssessmentInput, subScores: DiagnosisSubScore[]): string[] {
  const questions: string[] = [];
  if ((subScores.find((score) => score.key === "lighting")?.score ?? 100) < 70) {
    questions.push("Does the desk feel worse in the evening than it does in daylight?");
  }
  if (input.deviceType === "Laptop only" || input.deviceType === "Laptop and monitor") {
    questions.push("Do you use an external keyboard and mouse during longer sessions?");
  }
  if ((subScores.find((score) => score.key === "fit")?.score ?? 100) < 70) {
    questions.push("What needs to stay on the desk all the time, and what can move off it?");
  }
  questions.push("Would you rather improve this desk gradually or in one stronger pass?");
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
  const freeFixes = buildFixFirst(input, subScores, context);

  return {
    score: overallScore,
    confidence,
    summary: buildSummary(overallScore, primary.key, freeFixes[0] ?? "the main constraint first"),
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
    mainIssues: buildIssues(input, subScores, context).slice(0, 4),
    whyThisMatters: buildWhyThisMatters(subScores, input, context),
    freeFixes: { title: "Fix this first", items: freeFixes },
    paidUpgrades: { title: "Upgrades worth considering", items: buildBestUpgrades(input, subScores, context) },
    scoreImprovements: buildScoreImprovements(subScores, input, context),
    matchedProducts: scoreProducts(input, subScores, context),
    nextQuestions: buildNextQuestions(input, subScores)
  };
}
