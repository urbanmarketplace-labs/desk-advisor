"use client";

import { useEffect, useRef, useState } from "react";
import { diagnoseWorkspace } from "@/core/diagnose";
import { emptyAssessment } from "@/data/questions";
import { trackDeskLabEvent } from "@/lib/desklab-events";
import type { AssessmentInput, DiagnosisResult } from "@/types/assessment";

const storeUrl = "https://urban-market-place.com/";
const loadingMessages = [
  "Reading your setup",
  "Finding the biggest issue",
  "Sorting the best fixes",
  "Building your next steps"
];
const summaryTypingSpeed = 18;
const sectionObserverMargin = "0px 0px -18% 0px";

const instantValueCards = [
  {
    title: "Screen position",
    text: "If your screen sits too low, your neck and shoulders do the work."
  },
  {
    title: "Lighting",
    text: "Poor lighting makes your eyes work harder and your setup feel heavier."
  },
  {
    title: "Clutter",
    text: "A crowded desk makes it harder to focus and harder to reset."
  }
] as const;

const quickWins = [
  "Raise your screen closer to eye level",
  "Improve lighting around your main work area",
  "Clear cables and unused items from the surface",
  "Keep daily tools within easy reach"
] as const;

type QuickCheckKey = "mainIssue" | "setupUse" | "dayBother" | "deskLook" | "preferredFix";
type QuickCheckPhase = "landing" | "questions" | "loading" | "result";

type MainIssueOption = "Hard to focus" | "Uncomfortable" | "Too cluttered" | "Poor lighting" | "Not sure";
type SetupUseOption = "Laptop only" | "Laptop + monitor" | "Desktop monitor" | "Tablet" | "Mixed setup";
type DayBotherOption = "Neck or shoulder strain" | "Eye strain" | "Messy cables" | "Not enough space" | "Nothing specific";
type DeskLookOption = "Clean" | "A bit busy" | "Cluttered" | "Changes daily";
type PreferredFixOption = "Low-cost quick fix" | "Better comfort" | "Cleaner look" | "Better focus" | "Best overall improvement";

interface QuickCheckAnswers {
  mainIssue: MainIssueOption | "";
  setupUse: SetupUseOption | "";
  dayBother: DayBotherOption | "";
  deskLook: DeskLookOption | "";
  preferredFix: PreferredFixOption | "";
}

interface QuickCheckStep<TOption extends string> {
  id: QuickCheckKey;
  title: string;
  description: string;
  options: readonly TOption[];
}

const quickCheckSteps: readonly [
  QuickCheckStep<MainIssueOption>,
  QuickCheckStep<SetupUseOption>,
  QuickCheckStep<DayBotherOption>,
  QuickCheckStep<DeskLookOption>,
  QuickCheckStep<PreferredFixOption>
] = [
  {
    id: "mainIssue",
    title: "What feels most off about your desk?",
    description: "Start with the problem you notice first.",
    options: ["Hard to focus", "Uncomfortable", "Too cluttered", "Poor lighting", "Not sure"]
  },
  {
    id: "setupUse",
    title: "What do you use most?",
    description: "This helps us judge screen height, layout, and space pressure.",
    options: ["Laptop only", "Laptop + monitor", "Desktop monitor", "Tablet", "Mixed setup"]
  },
  {
    id: "dayBother",
    title: "What bothers you most during the day?",
    description: "Pick the friction that shows up most often.",
    options: ["Neck or shoulder strain", "Eye strain", "Messy cables", "Not enough space", "Nothing specific"]
  },
  {
    id: "deskLook",
    title: "How does your desk usually look?",
    description: "This shows whether the issue is layout, clutter, or both.",
    options: ["Clean", "A bit busy", "Cluttered", "Changes daily"]
  },
  {
    id: "preferredFix",
    title: "What kind of fix would you prefer?",
    description: "We’ll keep the result pointed at the kind of change you want.",
    options: ["Low-cost quick fix", "Better comfort", "Cleaner look", "Better focus", "Best overall improvement"]
  }
];

const emptyQuickCheck: QuickCheckAnswers = {
  mainIssue: "",
  setupUse: "",
  dayBother: "",
  deskLook: "",
  preferredFix: ""
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function getScoreLabel(score: number): string {
  if (score < 55) return "Needs attention";
  if (score < 76) return "Good base";
  return "Strong setup";
}

function getScoreAccent(score: number): string {
  if (score < 55) return "scoreWarning";
  if (score < 76) return "scoreBalanced";
  return "scoreStrong";
}

function humanizeConstraint(value: string): string {
  return value
    .replace("Space and surface pressure", "space and layout")
    .replace("Lighting reliability", "poor visual clarity")
    .replace("Focus and visual clarity", "attention drag")
    .replace("Comfort and posture", "screen height and posture load")
    .replace("Finish and visual polish", "a cleaner overall setup");
}

function humanizeCopy(value: string): string {
  return value
    .replaceAll("space pressure is high", "there may not be enough usable space")
    .replaceAll("surface pressure", "usable-space limits")
    .replaceAll("Desk pressure", "Usable space")
    .replaceAll("visual noise", "visual clutter")
    .replaceAll("Visual noise", "Visual clutter")
    .replaceAll("focus fragility", "focus")
    .replaceAll("Focus fragility", "Focus")
    .replaceAll("is affecting", "can affect")
    .replaceAll("is causing", "can lead to")
    .replaceAll("is limiting", "may be holding back")
    .replaceAll("constraint", "issue")
    .replaceAll("Constraint", "Issue")
    .replaceAll("signal", "input")
    .replaceAll("Signal", "Input");
}

function firstSentence(value: string): string {
  const sentence = value.split(". ")[0]?.trim() ?? value.trim();
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function getCompactDiagnosis(result: DiagnosisResult): string {
  const primary = humanizeCopy(result.mainIssues[0]?.summary ?? result.summary);
  return firstSentence(primary);
}

function getSimpleProductReason(product: DiagnosisResult["matchedProducts"][number]): string {
  switch (product.key) {
    case "monitor_stand":
      return "Raises your screen and frees desk space.";
    case "adjustable_laptop_stand":
      return "Improves screen height and comfort.";
    case "wooden_laptop_stand":
      return "Improves screen height without making the desk feel busy.";
    case "monitor_light_bar":
      return "Improves lighting where you work.";
    case "cable_management":
      return "Moves loose cables out of sight.";
    case "charging_station":
      return "Reduces cable clutter around daily devices.";
    case "leather_desk_mat":
      return "Creates a cleaner main work area.";
    case "wooden_tablet_stand":
      return "Improves screen position and frees space.";
    case "headphone_stand":
      return "Keeps your setup more organised.";
    case "lumomist_diffuser":
      return "Adds polish once the practical fixes are done.";
  }

  return product.reasons[0] ?? "Helps improve a real issue in your setup.";
}

function serializeQuickCheckValue(value: string): string {
  return value;
}

function mapMainIssueToFriction(value: MainIssueOption | ""): AssessmentInput["frictionSignals"] {
  switch (value) {
    case "Hard to focus":
      return ["Hard to focus"];
    case "Uncomfortable":
      return ["Discomfort / strain"];
    case "Too cluttered":
      return ["Clutter / visual noise"];
    case "Poor lighting":
      return ["Low light / poor visibility"];
    case "Not sure":
      return ["Nothing obvious, just feels off"];
    default:
      return [];
  }
}

function mapDayBotherToFriction(value: DayBotherOption | ""): AssessmentInput["frictionSignals"] {
  switch (value) {
    case "Neck or shoulder strain":
      return ["Discomfort / strain"];
    case "Eye strain":
      return ["Low light / poor visibility"];
    case "Messy cables":
      return ["Clutter / visual noise"];
    case "Not enough space":
      return ["Space feels limited"];
    default:
      return [];
  }
}

function mapSetupType(value: SetupUseOption | ""): AssessmentInput["setupType"] {
  switch (value) {
    case "Laptop only":
      return "Laptop only";
    case "Laptop + monitor":
      return "Laptop + external monitor";
    case "Desktop monitor":
      return "Single external monitor";
    case "Tablet":
      return "Other / mixed";
    case "Mixed setup":
      return "Other / mixed";
    default:
      return "";
  }
}

function mapDeskDensity(value: DeskLookOption | ""): AssessmentInput["deskDensity"] {
  switch (value) {
    case "Clean":
      return "Minimal";
    case "A bit busy":
      return "Busy";
    case "Cluttered":
      return "Overloaded";
    case "Changes daily":
      return "Moderate";
    default:
      return "";
  }
}

function mapLightingQuality(mainIssue: MainIssueOption | "", dayBother: DayBotherOption | ""): AssessmentInput["lightingQuality"] {
  if (mainIssue === "Poor lighting" || dayBother === "Eye strain") {
    return "Dim / shadowy";
  }

  return "Mostly okay";
}

function mapPriority(value: PreferredFixOption | ""): AssessmentInput["whatMattersMost"] {
  switch (value) {
    case "Better comfort":
      return "Comfort";
    case "Cleaner look":
      return "Cleaner look";
    case "Better focus":
      return "Focus";
    case "Best overall improvement":
      return "Better use of space";
    case "Low-cost quick fix":
      return "Better use of space";
    default:
      return "";
  }
}

function mapUpgradeIntent(value: PreferredFixOption | ""): AssessmentInput["upgradeIntent"] {
  switch (value) {
    case "Low-cost quick fix":
      return "Free improvements first";
    case "Better comfort":
    case "Cleaner look":
    case "Better focus":
    case "Best overall improvement":
      return "A few practical upgrades";
    default:
      return "";
  }
}

function inferTimeExposure(dayBother: DayBotherOption | ""): AssessmentInput["timeExposure"] {
  return dayBother === "Nothing specific" ? "2-4 hours" : "4-8 hours";
}

function inferDeskSize(answers: QuickCheckAnswers): AssessmentInput["deskSize"] {
  if (answers.dayBother === "Not enough space") return "Small";
  if (answers.deskLook === "Cluttered") return "Small";
  return "";
}

function inferScreenPosition(answers: QuickCheckAnswers): AssessmentInput["screenPosition"] {
  if (answers.mainIssue === "Uncomfortable" || answers.dayBother === "Neck or shoulder strain") {
    return "Below eye level";
  }

  return "";
}

function inferInputDevices(setupUse: SetupUseOption | ""): AssessmentInput["inputDevices"] {
  if (setupUse === "Laptop only") {
    return "Built-in laptop keyboard / trackpad";
  }

  return "";
}

function inferSurfaceUse(answers: QuickCheckAnswers): AssessmentInput["surfaceUse"] {
  if (answers.dayBother === "Messy cables") return "Work tools and personal items compete";
  if (answers.dayBother === "Not enough space") return "Storage spills onto the desk";
  if (answers.deskLook === "Cluttered") return "Work tools and personal items compete";
  if (answers.deskLook === "A bit busy") return "A few extras stay out";
  return "";
}

function inferFocusPattern(answers: QuickCheckAnswers): AssessmentInput["focusPattern"] {
  if (answers.mainIssue === "Hard to focus") {
    return answers.deskLook === "Cluttered" || answers.deskLook === "A bit busy"
      ? "I lose focus when the desk looks busy"
      : "I lose focus during long sessions";
  }

  return "";
}

function buildAssessmentFromQuickCheck(answers: QuickCheckAnswers): AssessmentInput {
  const frictionSignals = unique([
    ...mapMainIssueToFriction(answers.mainIssue),
    ...mapDayBotherToFriction(answers.dayBother)
  ]).slice(0, 2);

  return {
    ...emptyAssessment,
    setupType: mapSetupType(answers.setupUse),
    timeExposure: inferTimeExposure(answers.dayBother),
    frictionSignals: frictionSignals.length > 0 ? frictionSignals : ["Nothing obvious, just feels off"],
    deskDensity: mapDeskDensity(answers.deskLook),
    lightingQuality: mapLightingQuality(answers.mainIssue, answers.dayBother),
    whatMattersMost: mapPriority(answers.preferredFix),
    workStyle: answers.mainIssue === "Hard to focus" ? "Deep focus / knowledge work" : "",
    deskSize: inferDeskSize(answers),
    upgradeIntent: mapUpgradeIntent(answers.preferredFix),
    screenPosition: inferScreenPosition(answers),
    inputDevices: inferInputDevices(answers.setupUse),
    surfaceUse: inferSurfaceUse(answers),
    lightTiming: "",
    focusPattern: inferFocusPattern(answers),
    extraDetail: ""
  };
}

function createMomentumMessage(stepIndex: number): string {
  if (stepIndex <= 0) return "";
  if (stepIndex === 1) return "Good, that narrows it down.";
  if (stepIndex === 2) return "Now we can see where the friction is.";
  if (stepIndex === 3) return "Nearly there.";
  return "Now we can find your biggest fix.";
}

function getScoreExplanation(result: DiagnosisResult): string {
  if (!result.secondaryConstraint) {
    return "This suggests your setup has one clear issue and a simple place to start.";
  }

  if (result.confidence === "high") {
    return "This suggests your setup has one clear issue and a smaller secondary friction point.";
  }

  if (result.confidence === "moderate") {
    return "This suggests your setup has one main issue with a second area worth tightening.";
  }

  return "This suggests your setup has a likely main issue, with a couple of smaller friction points around it.";
}

function getPrimaryDiagnosis(result: DiagnosisResult, answers: QuickCheckAnswers): { title: string; text: string } {
  const primary = result.constraints[0]?.key;

  if (primary === "lighting" || answers.mainIssue === "Poor lighting" || answers.dayBother === "Eye strain") {
    return {
      title: "Your main issue is poor visual clarity.",
      text: "Your answers suggest your work area may not be giving your eyes enough clear, consistent light."
    };
  }

  if (primary === "ergonomics" || answers.mainIssue === "Uncomfortable" || answers.dayBother === "Neck or shoulder strain") {
    return {
      title: "Your main issue is screen height and posture load.",
      text: "Your answers suggest your screen position may be forcing your neck and shoulders to compensate."
    };
  }

  if (primary === "space" || answers.mainIssue === "Too cluttered" || answers.dayBother === "Not enough space") {
    return {
      title: "Your main issue is surface clutter and layout pressure.",
      text: "Your answers suggest the desk is losing usable room to items, cables, or poor positioning."
    };
  }

  if (primary === "focus" || answers.mainIssue === "Hard to focus") {
    return {
      title: "Your main issue is attention drag.",
      text: "Your answers suggest the setup may be making it too easy for your attention to scatter."
    };
  }

  return {
    title: `Your main issue is ${humanizeConstraint(result.primaryConstraint).toLowerCase()}.`,
    text: humanizeCopy(result.mainIssues[0]?.summary ?? result.summary)
  };
}

function getSecondaryInsight(result: DiagnosisResult): { title: string; text: string } | null {
  if (!result.secondaryConstraint) {
    return null;
  }

  const secondary = result.constraints[1];
  const label = humanizeConstraint(result.secondaryConstraint);

  return {
    title: `Secondary friction: ${label}.`,
    text: humanizeCopy(secondary?.why ?? "There is also a second issue making the desk feel less clear and less easy to use.")
  };
}

function getPatternSummary(result: DiagnosisResult, answers: QuickCheckAnswers): string {
  const answerBits = [answers.setupUse, answers.dayBother, answers.deskLook].filter(Boolean).join(", ");
  const primary = humanizeConstraint(result.primaryConstraint).toLowerCase();

  if (answers.setupUse === "Laptop + monitor" && answers.dayBother === "Eye strain" && answers.deskLook === "A bit busy") {
    return "Because you selected laptop + monitor, eye strain, and a busy desk, the main pattern is visual load.";
  }

  if (answers.mainIssue === "Hard to focus" && answers.deskLook === "Cluttered" && answers.preferredFix === "Cleaner look") {
    return "Because you selected hard to focus, cluttered, and cleaner look, the main pattern is attention drag.";
  }

  if (answers.mainIssue === "Uncomfortable" && answers.dayBother === "Neck or shoulder strain") {
    return "Because you selected uncomfortable and neck or shoulder strain, the main pattern is screen height and posture load.";
  }

  if (answers.mainIssue === "Poor lighting" && answers.dayBother === "Eye strain") {
    return "Because you selected poor lighting and eye strain, the main pattern is weak visual clarity.";
  }

  return `Because you selected ${answerBits || "a mixed set of issues"}, the main pattern points to ${primary}.`;
}

function getConfidenceExplanation(result: DiagnosisResult): string {
  if (result.confidence === "high") {
    return "High confidence: your answers point to one clear issue.";
  }

  if (result.confidence === "moderate") {
    return "Moderate confidence: your answers show two competing issues.";
  }

  return "Balanced result: your setup has more than one improvement area.";
}

function getFixReason(item: DiagnosisResult["scoreImprovements"][number], primaryKey: string | undefined): string {
  if (primaryKey === "lighting" || item.action.toLowerCase().includes("light")) {
    return "This reduces eye effort and makes the work area easier to read.";
  }

  if (primaryKey === "ergonomics" || item.action.toLowerCase().includes("screen") || item.action.toLowerCase().includes("laptop")) {
    return "This eases the load on your neck and shoulders.";
  }

  if (primaryKey === "space" || item.action.toLowerCase().includes("clear") || item.action.toLowerCase().includes("surface")) {
    return "This gives the setup back some usable room.";
  }

  if (primaryKey === "focus") {
    return "This removes some of the friction sitting in your line of sight.";
  }

  return "This improves the desk before you add anything else.";
}

function getProductSupportLabel(index: number, result: DiagnosisResult, productKey: string): string {
  const secondary = result.constraints[1]?.key;

  if (index === 0) {
    return "Best match for your main issue";
  }

  if (
    secondary === "space" && ["cable_management", "charging_station", "monitor_stand", "headphone_stand"].includes(productKey)
  ) {
    return "Also helps with your secondary issue";
  }

  if (
    secondary === "lighting" && productKey === "monitor_light_bar"
  ) {
    return "Also helps with your secondary issue";
  }

  if (
    secondary === "ergonomics" && ["adjustable_laptop_stand", "wooden_laptop_stand", "monitor_stand"].includes(productKey)
  ) {
    return "Also helps with your secondary issue";
  }

  return "Quickest improvement";
}

function getProductMatchExplanation(
  product: DiagnosisResult["matchedProducts"][number],
  result: DiagnosisResult,
  answers: QuickCheckAnswers
): string {
  const primary = result.constraints[0]?.key;

  if (product.key === "monitor_light_bar") {
    return answers.dayBother === "Eye strain"
      ? "Improves lighting directly where you work, which matches your lighting and eye-strain answers."
      : "Improves lighting directly where you work, which fits the visual clarity issue in your result.";
  }

  if (product.key === "adjustable_laptop_stand" || product.key === "wooden_laptop_stand") {
    return answers.dayBother === "Neck or shoulder strain"
      ? "Raises the screen closer to eye level, which matches the neck and shoulder strain in your answers."
      : "Raises the screen closer to eye level, which fits the posture load in your result.";
  }

  if (product.key === "monitor_stand") {
    return primary === "space"
      ? "Lifts the screen and gives some desk surface back, which matches your space and layout result."
      : "Lifts the screen while freeing surface space, so it helps both comfort and layout.";
  }

  if (product.key === "cable_management") {
    return "Clears loose cables from the main work area, which fits the clutter and surface-pressure pattern in your answers.";
  }

  if (product.key === "charging_station") {
    return "Pulls daily charging into one place, which helps reduce visual clutter around the desk edge.";
  }

  if (product.key === "leather_desk_mat") {
    return "Creates a cleaner visual work zone, which helps when the desk feels busy or unfinished.";
  }

  return getSimpleProductReason(product);
}

function useSeenTracker(
  phase: QuickCheckPhase,
  instantValueRef: React.RefObject<HTMLElement | null>,
  quickFixesRef: React.RefObject<HTMLElement | null>
): void {
  const seenRef = useRef({ instant: false, quickFixes: false, landing: false });

  useEffect(() => {
    if (seenRef.current.landing) {
      return;
    }

    seenRef.current.landing = true;
    trackDeskLabEvent({ event_name: "desklab_landing_view" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          if (entry.target === instantValueRef.current && !seenRef.current.instant) {
            seenRef.current.instant = true;
            trackDeskLabEvent({ event_name: "instant_value_seen" });
          }

          if (entry.target === quickFixesRef.current && !seenRef.current.quickFixes) {
            seenRef.current.quickFixes = true;
            trackDeskLabEvent({ event_name: "quick_fixes_seen" });
          }
        });
      },
      { rootMargin: sectionObserverMargin, threshold: 0.35 }
    );

    if (instantValueRef.current) observer.observe(instantValueRef.current);
    if (quickFixesRef.current) observer.observe(quickFixesRef.current);

    return () => observer.disconnect();
  }, [instantValueRef, quickFixesRef, phase]);
}

export function DeskAdvisorSite() {
  const [quickCheck, setQuickCheck] = useState<QuickCheckAnswers>(emptyQuickCheck);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<QuickCheckPhase>("landing");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [typedSummary, setTypedSummary] = useState("");
  const [revealStage, setRevealStage] = useState(0);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const resultTrackedRef = useRef<string | null>(null);
  const instantValueRef = useRef<HTMLElement | null>(null);
  const quickFixesRef = useRef<HTMLElement | null>(null);
  const assessmentFrameRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const livePanelRef = useRef<HTMLDivElement | null>(null);

  useSeenTracker(phase, instantValueRef, quickFixesRef);

  const step = quickCheckSteps[stepIndex];
  const totalSteps = quickCheckSteps.length;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const stepValue = quickCheck[step.id];
  const canContinue = Boolean(stepValue);
  const momentumMessage = createMomentumMessage(stepIndex);
  const shouldShowMomentum = momentumMessage.length > 0;
  const matchedProducts = result?.matchedProducts ?? [];
  const scoreImprovements = result?.scoreImprovements ?? [];
  const compactSummary = result ? getCompactDiagnosis(result) : "";
  const isSummaryTyping = result ? typedSummary.length < compactSummary.length : false;
  const primaryDiagnosis = result ? getPrimaryDiagnosis(result, quickCheck) : null;
  const secondaryInsight = result ? getSecondaryInsight(result) : null;
  const patternSummary = result ? getPatternSummary(result, quickCheck) : "";
  const confidenceExplanation = result ? getConfidenceExplanation(result) : "";
  const scoreExplanation = result ? getScoreExplanation(result) : "";
  const resultCategory = result?.constraints[0]?.key ?? undefined;
  const primaryHeaderCta = phase === "landing" ? "See quick fixes" : phase === "result" ? "View my result" : "Go to my check";

  useEffect(() => {
    return () => {
      clearLoadingTimers();
      clearRevealTimers();
    };
  }, []);

  useEffect(() => {
    clearRevealTimers();

    if (phase !== "result" || !result) {
      setTypedSummary("");
      setRevealStage(0);
      return;
    }

    setTypedSummary("");
    setRevealStage(0);

    let index = 0;
    typingIntervalRef.current = setInterval(() => {
      index += 1;
      setTypedSummary(compactSummary.slice(0, index));

      if (index >= compactSummary.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }

        setRevealStage(1);
        revealTimeoutsRef.current.push(setTimeout(() => setRevealStage(2), 180));
        revealTimeoutsRef.current.push(setTimeout(() => setRevealStage(3), 360));
      }
    }, summaryTypingSpeed);

    return () => {
      clearRevealTimers();
    };
  }, [compactSummary, phase, result]);

  useEffect(() => {
    if (phase === "questions") {
      questionHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [phase, stepIndex]);

  useEffect(() => {
    if (phase !== "result" || !result) {
      return;
    }

    const signature = `${result.score}-${result.primaryConstraint}-${result.secondaryConstraint ?? "none"}`;
    if (resultTrackedRef.current === signature) {
      return;
    }

    resultTrackedRef.current = signature;
    trackDeskLabEvent({
      event_name: "result_viewed",
      score: result.score,
      main_issue: humanizeConstraint(result.primaryConstraint),
      result_category: resultCategory,
      answer_value: `secondary:${humanizeConstraint(result.secondaryConstraint ?? "none")} | confidence:${result.confidenceLabel} | pattern:${patternSummary}`
    });
  }, [patternSummary, phase, result, resultCategory]);

  function clearLoadingTimers() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }

  function clearRevealTimers() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    revealTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    revealTimeoutsRef.current = [];
  }

  function scrollToElement(target: HTMLElement | null) {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.focus({ preventScroll: true });
  }

  function handleHeroCta() {
    if (phase === "landing") {
      scrollToElement(instantValueRef.current);
      return;
    }

    const target = phase === "result" ? livePanelRef.current : questionHeadingRef.current ?? assessmentFrameRef.current;
    scrollToElement(target);
  }

  function startCheck() {
    clearLoadingTimers();
    clearRevealTimers();
    setQuickCheck(emptyQuickCheck);
    setResult(null);
    setTypedSummary("");
    setRevealStage(0);
    setStepIndex(0);
    setLoadingIndex(0);
    setPhase("questions");
    resultTrackedRef.current = null;
    trackDeskLabEvent({ event_name: "check_started" });
    trackDeskLabEvent({ event_name: "assessment_started" });

    requestAnimationFrame(() => {
      scrollToElement(questionHeadingRef.current ?? assessmentFrameRef.current);
    });
  }

  function restart() {
    clearLoadingTimers();
    clearRevealTimers();
    setQuickCheck(emptyQuickCheck);
    setResult(null);
    setTypedSummary("");
    setRevealStage(0);
    setLoadingIndex(0);
    setPhase("landing");
    setStepIndex(0);
    resultTrackedRef.current = null;
  }

  function updateAnswer(key: QuickCheckKey, value: string) {
    setQuickCheck((current) => ({
      ...current,
      [key]: value
    }));
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!canContinue || phase !== "questions") {
      return;
    }

    trackDeskLabEvent({
      event_name: "question_answered",
      question_id: step.id,
      answer_value: serializeQuickCheckValue(stepValue)
    });

    if (stepIndex === totalSteps - 1) {
      const assessmentInput = buildAssessmentFromQuickCheck(quickCheck);
      setPhase("loading");
      setLoadingIndex(0);

      loadingIntervalRef.current = setInterval(() => {
        setLoadingIndex((current) => (current + 1) % loadingMessages.length);
      }, 820);

      loadingTimeoutRef.current = setTimeout(() => {
        clearLoadingTimers();
        const diagnosis = diagnoseWorkspace(assessmentInput);
        setResult(diagnosis);
        trackDeskLabEvent({
          event_name: "check_completed",
          score: diagnosis.score,
          main_issue: humanizeConstraint(diagnosis.primaryConstraint),
          result_category: diagnosis.constraints[0]?.key ?? undefined,
          answer_value: `secondary:${humanizeConstraint(diagnosis.secondaryConstraint ?? "none")} | confidence:${diagnosis.confidenceLabel}`
        });
        trackDeskLabEvent({
          event_name: "assessment_completed",
          score: diagnosis.score,
          main_issue: humanizeConstraint(diagnosis.primaryConstraint),
          result_category: diagnosis.constraints[0]?.key ?? undefined
        });
        setPhase("result");
        requestAnimationFrame(() => {
          scrollToElement(livePanelRef.current);
        });
      }, 2200);

      return;
    }

    setStepIndex((current) => current + 1);
  }

  return (
    <main className="page">
      <header className="siteHeader">
        <a aria-label="DeskLab by Urban Marketplace" className="brandLockup" href="#top">
          <img alt="DeskLab by Urban Marketplace" className="brandImage" src="/desklab-logo-transparent.png" />
        </a>
        <button className="ghostButton" type="button" onClick={handleHeroCta}>
          {primaryHeaderCta}
        </button>
      </header>

      <section className="heroShell" id="top">
        <div className="heroBackdrop">
          <div className="hero heroSingle">
            <div className="heroContent heroContentWide">
              <div className="heroBadge">DeskLab</div>
              <h1>Fix your desk in 30 seconds.</h1>
              <p className="heroLead">Most setups have 2–3 hidden issues that affect focus, comfort, or space.</p>
              <div className="heroActions">
                <button className="primaryButton lightButton" type="button" onClick={handleHeroCta}>
                  Get my desk score
                </button>
                <span className="heroMeta">Free check. No sign-up. Clear fixes at the end.</span>
              </div>
              <div className="heroHighlights heroHighlightsFour">
                <div>
                  <strong>Value first</strong>
                  <span>See the patterns that usually hurt a desk before you answer anything.</span>
                </div>
                <div>
                  <strong>Quick check</strong>
                  <span>Five fast taps are enough to point at the biggest issue.</span>
                </div>
                <div>
                  <strong>Clear result</strong>
                  <span>You get the issue, why it matters, and what to fix first.</span>
                </div>
                <div>
                  <strong>Useful products</strong>
                  <span>Only fixes that match the problem in front of you.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="valueSection" ref={instantValueRef}>
        <div className="sectionIntro valueIntro">
          <span className="sectionLabel">Instant value</span>
          <h2>Most desk problems come from 3 things.</h2>
        </div>
        <div className="valueCardGrid">
          {instantValueCards.map((card) => (
            <article className="valueCard" key={card.title}>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="quickWinsSection" ref={quickFixesRef}>
        <div className="sectionIntro valueIntro">
          <span className="sectionLabel">Quick wins</span>
          <h2>Quick wins that usually make the biggest difference.</h2>
        </div>
        <div className="quickWinsPanel">
          <ul className="quickWinsList">
            {quickWins.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="checkLaunch">
            <button className="primaryButton" type="button" onClick={startCheck}>
              Check my setup
            </button>
            <p>Answer a few quick taps to see what matters most for your desk.</p>
          </div>
        </div>
      </section>

      <section className="assessmentSection" id="assessment">
        <div className="assessmentFrame" ref={assessmentFrameRef} tabIndex={-1}>
          <div className="assessmentIntroRow">
            <div className="assessmentIntro">
              <span className="sectionLabel">Personalised quick check</span>
              <h2>See what matters most for your desk.</h2>
              <p>Five quick taps. Clear result at the end.</p>
            </div>
            {phase !== "landing" ? (
              <button className="textButton" type="button" onClick={restart}>
                Start again
              </button>
            ) : null}
          </div>

          {phase === "landing" ? (
            <div className="introState introStateCompact">
              <div className="introPoints">
                <span>Fast check</span>
                <span>Clear issue</span>
                <span>Best first fix</span>
              </div>
              <button className="primaryButton wideButton" type="button" onClick={startCheck}>
                Start free check
              </button>
            </div>
          ) : null}

          {phase === "questions" ? (
            <div className="questionShell" ref={livePanelRef} tabIndex={-1}>
              <div className="progressMeta progressMetaStrong">
                <span>Quick check {stepIndex + 1} of {totalSteps}</span>
                <span>{progress}%</span>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${progress}%` }} />
              </div>

              <div className="questionArea questionAreaPremium">
                <span className="sectionLabel">This takes around 30 seconds</span>
                <h2 ref={questionHeadingRef} tabIndex={-1}>{step.title}</h2>
                <p>{step.description}</p>
                {shouldShowMomentum ? <span className="questionHint momentumHint">{momentumMessage}</span> : null}
                <div className="optionGrid optionGridTight">
                  {step.options.map((option) => {
                    const selected = stepValue === option;
                    return (
                      <button
                        className={selected ? "optionButton selected optionButtonPremium" : "optionButton optionButtonPremium"}
                        key={option}
                        type="button"
                        onClick={() => updateAnswer(step.id, option)}
                      >
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="navRow navRowSplit">
                <button className="secondaryButton" type="button" onClick={goBack} disabled={stepIndex === 0}>
                  Back
                </button>
                <button className="primaryButton" type="button" onClick={goNext} disabled={!canContinue}>
                  {stepIndex === totalSteps - 1 ? "Get my desk score" : "Continue"}
                </button>
              </div>
            </div>
          ) : null}

          {phase === "loading" ? (
            <div className="loadingState" aria-live="polite" ref={livePanelRef} tabIndex={-1}>
              <div className="thinkingOrb" />
              <span className="sectionLabel">DeskLab is checking your setup</span>
              <h2>{loadingMessages[loadingIndex]}</h2>
              <p>Turning your answers into one clear issue and the best fix to start with.</p>
            </div>
          ) : null}

          {phase === "result" && result && primaryDiagnosis ? (
            <div className="resultShell" ref={livePanelRef} tabIndex={-1}>
              <div className="resultHero resultHeroPremium">
                <div className="scoreCard scoreCardPremium">
                  <span className="sectionLabel">Desk score</span>
                  <span className={`scoreTag ${getScoreAccent(result.score)}`}>{getScoreLabel(result.score)}</span>
                  <div className="score">{result.score}</div>
                  <p>out of 100</p>
                  <p className="scoreExplanation">{scoreExplanation}</p>
                  <div className="confidencePill qualityPill confidenceSummaryPill">{confidenceExplanation}</div>
                </div>

                <div className="resultOverview diagnosisCard">
                  <div className="overviewTop overviewTopStacked">
                    <span className="sectionLabel">Primary diagnosis</span>
                    <div className={`confidencePill confidence${result.confidence}`}>{result.confidenceLabel}</div>
                  </div>
                  <h2>{primaryDiagnosis.title}</h2>
                  <p className="resultSummary typingSummary" aria-live="polite">
                    {typedSummary}
                    <span className={isSummaryTyping ? "typingCaret" : "typingCaret hidden"} />
                  </p>
                  <p className="diagnosisSupportText">{primaryDiagnosis.text}</p>
                </div>
              </div>

              {revealStage >= 2 ? (
                <div className="diagnosticGrid revealBlock isVisible">
                  <div className="resultBlock insightPanel">
                    <span className="blockLabel">Pattern summary</span>
                    <p className="resultBlockText">{patternSummary}</p>
                  </div>

                  <div className="resultBlock insightPanel">
                    <span className="blockLabel">Secondary insight</span>
                    {secondaryInsight ? (
                      <>
                        <strong className="insightTitle">{secondaryInsight.title}</strong>
                        <p className="resultBlockText">{secondaryInsight.text}</p>
                      </>
                    ) : (
                      <p className="resultBlockText">Your answers point more strongly to one main issue than to a second competing one.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {revealStage >= 3 ? (
                <div className="resultBlock fixOrderPanel revealBlock isVisible">
                  <div className="fixOrderHeader">
                    <span className="blockLabel">Fix order</span>
                    <span className="fixOrderNote">Fix this before buying anything else.</span>
                  </div>
                  <ol className="fixOrderList">
                    {scoreImprovements.slice(0, 3).map((item, index) => (
                      <li key={`${item.action}-${item.scoreLabel}`}>
                        <div className="fixOrderNumber">{index + 1}</div>
                        <div className="fixOrderBody">
                          <strong>{item.action}</strong>
                          <span>{getFixReason(item, result.constraints[0]?.key)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {revealStage >= 3 ? (
                <div className="productsSection revealBlock isVisible">
                  <div className="sectionIntro compactIntro">
                    <span className="sectionLabel">Recommended fixes for your setup</span>
                    <h2>These feel earned because they match the issues in your answers.</h2>
                  </div>

                  {matchedProducts.length > 0 ? (
                    <div className="productGrid">
                      {matchedProducts.slice(0, 3).map((match, index) => {
                        const hasProductUrl = Boolean(match.product.url?.trim());
                        const hasProductImage = Boolean(match.product.image?.trim());
                        const supportLabel = getProductSupportLabel(index, result, match.key);
                        const matchExplanation = getProductMatchExplanation(match, result, quickCheck);

                        return (
                          <article className="productCard productCardPremium" key={match.key}>
                            {hasProductImage ? (
                              <div className="productImageWrap">
                                <img
                                  alt={match.product.name}
                                  className="productImage"
                                  decoding="async"
                                  loading="eager"
                                  src={match.product.image}
                                />
                              </div>
                            ) : null}
                            <div className="productTop productTopStacked">
                              <span className="fitPill fitPillStrong">{supportLabel}</span>
                              <strong>{match.product.name}</strong>
                              <span className="productMatchMeta">{match.fitScore}% match</span>
                            </div>
                            <p className="productIntro">{getSimpleProductReason(match)}</p>
                            <p className="productExplain">{matchExplanation}</p>
                            {hasProductUrl ? (
                              <a
                                className="secondaryButton"
                                href={match.product.url}
                                rel="noreferrer"
                                target="_blank"
                                onClick={() => {
                                  trackDeskLabEvent({
                                    event_name: "product_fix_clicked",
                                    product_name: match.product.name,
                                    result_category: resultCategory,
                                    answer_value: `secondary:${humanizeConstraint(result.secondaryConstraint ?? "none")} | confidence:${result.confidenceLabel} | pattern:${patternSummary}`
                                  });
                                  trackDeskLabEvent({
                                    event_name: "product_clicked",
                                    product_name: match.product.name,
                                    result_category: resultCategory
                                  });
                                }}
                              >
                                Shop this fix
                              </a>
                            ) : (
                              <span className="questionHint">Coming soon</span>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rationalePanel">
                      <span className="sectionLabel">No product-first fix yet</span>
                      <p>Start with the setup changes above. They should improve the desk faster than buying more.</p>
                    </div>
                  )}

                  <div className="storeActions">
                    <a
                      className="textButton storeButton"
                      href={storeUrl}
                      rel="noreferrer"
                      target="_blank"
                      onClick={() => trackDeskLabEvent({
                        event_name: "back_to_store_clicked",
                        result_category: resultCategory,
                        main_issue: humanizeConstraint(result.primaryConstraint)
                      })}
                    >
                      Back to Urban Marketplace
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
