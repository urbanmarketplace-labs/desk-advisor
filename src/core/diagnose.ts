import { productCatalog } from "@/data/product-catalog";
import type {
  AssessmentInput,
  DiagnosisIssue,
  DiagnosisResult,
  MatchedProduct
} from "@/types/assessment";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pushIssue(
  issues: DiagnosisIssue[],
  id: string,
  label: string,
  severity: number,
  confidence: number,
  causes: string[]
): void {
  if (issues.some((issue) => issue.id === id)) {
    return;
  }

  issues.push({ id, label, severity, confidence, causes });
}

export function diagnoseWorkspace(input: AssessmentInput): DiagnosisResult {
  const issues: DiagnosisIssue[] = [];
  const freeFixes: string[] = [];
  const paidUpgrades: string[] = [];
  const whyTheseRecommendations: string[] = [];
  const productSignals: string[] = [];
  const profile = unique(
    [
      input.deviceType,
      input.priority,
      input.upgradeIntent,
      input.deskSize,
      input.workStyle,
      input.budgetBand,
      ...input.currentFeel,
      ...input.problems
    ].filter(Boolean) as string[]
  );

  let score = 82;
  const lowerDetail = input.extraDetail.toLowerCase();

  if (input.deviceType === "Laptop only") {
    score -= 12;
    pushIssue(issues, "laptop-ergonomics", "Laptop height is likely creating posture strain", 89, 0.85, [
      "Main screen is likely too low for long work sessions"
    ]);
    freeFixes.push("Raise the laptop for focused work and stop treating a low screen angle as the default.");
    paidUpgrades.push("A laptop stand is the clearest high-impact upgrade for this setup.");
    productSignals.push("Laptop Stand");
  }

  if (input.currentFeel.includes("Too dark") || input.problems.includes("Poor lighting")) {
    score -= 10;
    pushIssue(issues, "lighting", "Lighting quality is weakening comfort and focus", 84, 0.82, [
      "The work zone likely lacks strong directional light"
    ]);
    freeFixes.push("Improve the light around the task area before changing lower-impact accessories.");
    paidUpgrades.push("A monitor light bar is likely the most direct lighting improvement.");
    productSignals.push("Monitor Light Bar");
  }

  if (input.currentFeel.includes("Cluttered") || input.problems.includes("Cable clutter")) {
    score -= 9;
    pushIssue(issues, "clutter", "Visual clutter is reducing clarity", 78, 0.79, [
      "Too many visible objects are competing for attention"
    ]);
    freeFixes.push("Clear the main work zone so only daily-use objects remain on the desk.");
    freeFixes.push("Move visible cables behind the desk line before buying aesthetic upgrades.");
    paidUpgrades.push("A cable management kit is one of the fastest structural improvements.");
    productSignals.push("Cable Management Kit");
  }

  if (input.currentFeel.includes("Too cramped") || input.problems.includes("Not enough space")) {
    score -= 10;
    pushIssue(issues, "space", "Desk space is being used inefficiently", 80, 0.81, [
      "The surface is likely doing too many jobs at once"
    ]);
    freeFixes.push("Reduce the number of permanent desk objects and define a single primary work zone.");
    paidUpgrades.push("A monitor stand can improve both alignment and usable surface area.");
    productSignals.push("Monitor Stand");
  }

  if (input.currentFeel.includes("Uncomfortable") || input.problems.includes("Neck or back discomfort")) {
    score -= 12;
    pushIssue(issues, "comfort", "Comfort friction is one of the main constraints", 91, 0.88, [
      "Screen height and input placement likely need correcting"
    ]);
    freeFixes.push("Review screen height, keyboard placement, and shoulder posture before adding secondary accessories.");
    paidUpgrades.push("Prioritize ergonomic support products before style-led upgrades.");
    productSignals.push("Laptop Stand", "Monitor Stand");
  }

  if (input.currentFeel.includes("Hard to focus") || input.problems.includes("Hard to focus")) {
    score -= 8;
    pushIssue(issues, "focus", "The setup is carrying too much friction for focused work", 74, 0.76, [
      "Visual noise and weak workspace hierarchy are likely hurting concentration"
    ]);
    freeFixes.push("Create a stronger difference between active tools and background clutter.");
    paidUpgrades.push("Choose upgrades that reduce friction rather than adding more visible objects.");
    productSignals.push("Cable Management Kit", "Monitor Light Bar");
  }

  if (input.currentFeel.includes("Looks flat") || input.problems.includes("Does not feel premium")) {
    score -= 6;
    pushIssue(issues, "aesthetic", "The workspace lacks structure and finish", 68, 0.72, [
      "The setup likely needs more restraint before it needs more products"
    ]);
    freeFixes.push("Reduce material and object noise before trying to make the desk feel premium.");
    paidUpgrades.push("A desk mat or stand should only follow once the layout is under control.");
    productSignals.push("Wool Desk Mat");
  }

  if (input.deskSize === "Very small" || input.deskSize === "Small") {
    score -= 4;
    whyTheseRecommendations.push("Desk size is a hard constraint, so low-footprint fixes and vertical organization matter more here.");
  }

  if (input.workStyle === "Deep focus work") {
    whyTheseRecommendations.push("Because this desk supports deep focus work, lighting, clutter control, and comfort deserve extra weight.");
  }

  if (input.upgradeIntent === "Free improvements first") {
    score += 2;
    whyTheseRecommendations.push("The recommendation mix stays conservative because the user prefers free improvements before buying.");
  }

  if (input.upgradeIntent === "A cleaner premium setup") {
    whyTheseRecommendations.push("Premium recommendations are only justified after layout, comfort, and clutter are under control.");
    productSignals.push("Wool Desk Mat", "LumoMist Diffuser");
  }

  if (input.budgetBand === "Under 50") {
    whyTheseRecommendations.push("Budget is constrained, so low-cost structural fixes should outrank higher-ticket upgrades.");
  }

  if (lowerDetail.includes("dark") || lowerDetail.includes("evening") || lowerDetail.includes("dim")) {
    productSignals.push("Monitor Light Bar");
  }

  if (lowerDetail.includes("cable") || lowerDetail.includes("wire")) {
    productSignals.push("Cable Management Kit");
  }

  if (lowerDetail.includes("neck") || lowerDetail.includes("posture") || lowerDetail.includes("strain")) {
    productSignals.push("Laptop Stand", "Monitor Stand");
  }

  if (lowerDetail.includes("premium") || lowerDetail.includes("minimal") || lowerDetail.includes("cleaner")) {
    productSignals.push("Wool Desk Mat");
  }

  const matchedProducts = scoreProducts(productSignals, input);
  const summary = buildSummary(issues, input);

  return {
    score: clamp(score, 35, 96),
    confidence: issues.length >= 3 ? "high" : issues.length >= 2 ? "medium" : "low",
    summary,
    profile,
    mainIssues: issues.sort((a, b) => b.severity - a.severity).slice(0, 4),
    freeFixes: {
      title: "Fix first",
      items: unique(freeFixes).slice(0, 4)
    },
    paidUpgrades: {
      title: "Best upgrades",
      items: unique(paidUpgrades).slice(0, 4)
    },
    whyTheseRecommendations: unique(whyTheseRecommendations).slice(0, 4),
    matchedProducts,
    nextQuestions: buildNextQuestions(input, issues)
  };
}

function scoreProducts(productSignals: string[], input: AssessmentInput): MatchedProduct[] {
  const uniqueSignals = unique(productSignals);

  return productCatalog
    .map((product) => {
      let fitScore = uniqueSignals.includes(product.name) ? 60 : 20;

      if (input.priority === "Better comfort" && product.category === "ergonomics") {
        fitScore += 18;
      }

      if (input.priority === "Cleaner setup" && product.category === "organization") {
        fitScore += 14;
      }

      if (input.priority === "Better focus" && (product.category === "lighting" || product.category === "organization")) {
        fitScore += 14;
      }

      if (input.priority === "More premium look" && (product.styleFit === "premium" || product.styleFit === "clean")) {
        fitScore += 12;
      }

      if (input.deskSize === "Very small" && product.spaceImpact === "high") {
        fitScore -= 14;
      }

      if (input.budgetBand === "Under 50" && !["Under 50", "50-150"].includes(product.priceBand)) {
        fitScore -= 20;
      }

      return {
        name: product.name,
        fitScore: clamp(fitScore, 0, 100),
        reasons: product.bestFor.slice(0, 2)
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);
}

function buildSummary(inputIssues: DiagnosisIssue[], input: AssessmentInput): string {
  if (inputIssues.length === 0) {
    return "The setup has a workable base, but it needs a little more context before stronger recommendations make sense.";
  }

  const lead = inputIssues[0]?.label ?? "workspace friction";

  if (input.priority === "Better comfort") {
    return `Comfort should lead here. The clearest signal is that ${lead.toLowerCase()}, so posture and screen position should be fixed first.`;
  }

  if (input.priority === "Cleaner setup") {
    return `This setup needs stronger structure, not more clutter. ${lead} is the main signal, so layout should improve before styling does.`;
  }

  if (input.priority === "Better focus") {
    return `The desk is not supporting focused work strongly enough yet. ${lead} is one of the main blockers, so friction should come down before anything else is added.`;
  }

  return `The setup has a decent base, but ${lead.toLowerCase()}. The right next step is a tighter, more selective improvement plan.`;
}

function buildNextQuestions(input: AssessmentInput, issues: DiagnosisIssue[]): string[] {
  const questions: string[] = [];

  if (!issues.some((issue) => issue.id === "lighting")) {
    questions.push("How strong is the light around the desk in the evening?");
  }

  if (input.deviceType === "Laptop only") {
    questions.push("Do you use an external keyboard and mouse for longer sessions?");
  }

  if (input.deskSize === "Very small" || input.deskSize === "Small") {
    questions.push("Which items must stay on the desk permanently?");
  }

  questions.push("Would you prefer a budget-first plan or a best-possible setup plan?");

  return unique(questions).slice(0, 3);
}
